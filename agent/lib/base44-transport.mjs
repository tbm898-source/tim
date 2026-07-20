import { createHmac } from 'node:crypto';
import os from 'node:os';
import { discoverCapabilities, executeCommand } from './dispatcher.mjs';
import { verifyCommandAuthorization } from './authorization.mjs';

const DEFAULT_POLL_INTERVAL_MS = 15_000;
const DEFAULT_HEARTBEAT_INTERVAL_MS = 60_000;
const DEFAULT_MAX_BACKOFF_MS = 300_000;

const delay = (milliseconds, signal) => new Promise((resolve) => {
  if (signal?.aborted) {
    resolve();
    return;
  }

  let timer;
  const finish = () => {
    if (timer) clearTimeout(timer);
    signal?.removeEventListener('abort', finish);
    resolve();
  };
  timer = setTimeout(finish, milliseconds);
  signal?.addEventListener('abort', finish, { once: true });
});

function getFunctionUrl(config) {
  return `${config.serverUrl.replace(/\/$/, '')}/api/apps/${config.appId}/functions/deviceAgentBridge`;
}

function parseRetryAfterMs(value, now = Date.now()) {
  if (!value) return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1_000);
  const retryAt = Date.parse(value);
  return Number.isFinite(retryAt) ? Math.max(0, retryAt - now) : 0;
}

export class BridgeRequestError extends Error {
  constructor(message, { status = 0, retryAfterMs = 0, cause } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'BridgeRequestError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

export function formatTransportError(error) {
  let message = error instanceof Error ? error.message : String(error);
  const code = typeof error?.code === 'string' ? error.code : '';
  if (code && !message.includes(code)) message = `${code}: ${message}`;
  const status = Number(error?.status);
  if (Number.isInteger(status)
    && status > 0
    && !message.includes(`HTTP ${status}`)
    && !message.includes(`status code ${status}`)) {
    message = `${message} (HTTP ${status})`;
  }
  const cause = error instanceof Error ? error.cause : null;
  if (!cause || typeof cause !== 'object') return message;

  const detail = formatTransportError(cause);
  return detail && !message.includes(detail) ? `${message} (${detail})` : message;
}

export function computeRetryDelay(config, failureCount, error, random = Math.random) {
  const pollIntervalMs = config.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS;
  const maxBackoffMs = config.maxBackoffMs || DEFAULT_MAX_BACKOFF_MS;
  const exponent = Math.max(0, Math.min(failureCount - 1, 10));
  const exponentialMs = Math.min(maxBackoffMs, pollIntervalMs * (2 ** exponent));
  const jitteredMs = Math.round(exponentialMs * (0.85 + (random() * 0.3)));
  const retryAfterMs = Math.min(maxBackoffMs, Math.max(0, error?.retryAfterMs || 0));
  return Math.min(maxBackoffMs, Math.max(pollIntervalMs, retryAfterMs, jitteredMs));
}

export async function bridgeRequest(config, action, payload = {}) {
  const body = JSON.stringify({ action, payload });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', config.commandSecret)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  let response;
  try {
    response = await fetch(getFunctionUrl(config), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TIM-Timestamp': timestamp,
        'X-TIM-Signature': signature,
      },
      body,
    });
  } catch (error) {
    throw new BridgeRequestError(
      `deviceAgentBridge ${action} transport failed: ${formatTransportError(error)}`,
      { cause: error },
    );
  }

  const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
  const text = await response.text();
  let result = {};
  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      const preview = text.trimStart().slice(0, 40).replace(/\s+/g, ' ');
      throw new BridgeRequestError(
        `deviceAgentBridge ${action} returned non-JSON (HTTP ${response.status}): ${preview}`,
        { status: response.status, retryAfterMs },
      );
    }
  }
  if (!response.ok) {
    throw new BridgeRequestError(
      result?.error || `deviceAgentBridge ${action} failed with HTTP ${response.status}`,
      { status: response.status, retryAfterMs },
    );
  }
  return result?.data;
}

async function publishEvent(config, event) {
  try {
    await bridgeRequest(config, 'createDeviceEvent', event);
  } catch (error) {
    console.warn(`TIM event write failed: ${formatTransportError(error)}`);
  }
}

async function registerNode(config, capabilities, signal) {
  const platformName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';
  let failureCount = 0;

  while (!signal.aborted) {
    try {
      const existingNode = await bridgeRequest(config, 'getDeviceNode', { node_id: config.nodeId });
      const nodeData = {
        node_id: config.nodeId,
        display_name: config.displayName,
        platform: platformName,
        status: 'online',
        trust_level: config.trustLevel,
        capabilities,
        agent_version: '0.1.1',
        os_version: os.release(),
        hostname: os.hostname(),
        last_seen: new Date().toISOString(),
      };
      return existingNode
        ? await bridgeRequest(config, 'updateDeviceNode', { id: existingNode.id, ...nodeData })
        : await bridgeRequest(config, 'createDeviceNode', { ...nodeData, paired_at: new Date().toISOString() });
    } catch (error) {
      failureCount += 1;
      const retryDelayMs = computeRetryDelay(config, failureCount, error);
      console.warn(
        `TIM bridge registration failed: ${formatTransportError(error)}; retrying in ${Math.ceil(retryDelayMs / 1_000)}s`,
      );
      await delay(retryDelayMs, signal);
    }
  }

  return null;
}

async function processQueuedCommands(config, queued) {
  for (const command of queued || []) {
    const now = new Date();
    if (!verifyCommandAuthorization(command, config.commandSecret)) {
      await bridgeRequest(config, 'updateDeviceCommand', { id: command.id, status: 'failed', error: 'Command signature is missing or invalid', completed_at: now.toISOString() });
      await publishEvent(config, {
        node_id: config.nodeId,
        command_id: command.command_id,
        event_type: 'command.rejected',
        severity: 'security',
        message: 'The edge agent rejected an unsigned or modified command',
        details: { action: command.action },
        occurred_at: now.toISOString(),
      });
      continue;
    }
    if (command.expires_at && new Date(command.expires_at) <= now) {
      await bridgeRequest(config, 'updateDeviceCommand', { id: command.id, status: 'expired', completed_at: now.toISOString() });
      continue;
    }
    if (command.requires_approval && !command.approved_at) {
      await bridgeRequest(config, 'updateDeviceCommand', { id: command.id, status: 'failed', error: 'Approval record is missing' });
      continue;
    }

    await bridgeRequest(config, 'updateDeviceCommand', { id: command.id, status: 'running', started_at: now.toISOString() });
    try {
      const result = await executeCommand(command, { config, approved: !command.requires_approval || Boolean(command.approved_at) });
      const completedAt = new Date().toISOString();
      await bridgeRequest(config, 'updateDeviceCommand', { id: command.id, status: 'succeeded', result, completed_at: completedAt });
      await publishEvent(config, {
        node_id: config.nodeId,
        command_id: command.command_id,
        event_type: 'command.succeeded',
        severity: 'info',
        message: `${command.action} completed`,
        details: { duration_ms: result.duration_ms },
        occurred_at: completedAt,
      });
    } catch (error) {
      const completedAt = new Date().toISOString();
      await bridgeRequest(config, 'updateDeviceCommand', {
        id: command.id,
        status: 'failed',
        error: error.message,
        result: error.result || {},
        completed_at: completedAt,
      });
      await publishEvent(config, {
        node_id: config.nodeId,
        command_id: command.command_id,
        event_type: 'command.failed',
        severity: 'error',
        message: `${command.action} failed: ${error.message}`,
        details: {},
        occurred_at: completedAt,
      });
    }
  }
}

export async function runAgent(config, signal) {
  if (!config.commandSecret) throw new Error('TIM_COMMAND_SIGNING_SECRET is required for connected mode');
  const capabilities = await discoverCapabilities(config);
  const node = await registerNode(config, capabilities, signal);
  if (!node || signal.aborted) return;

  console.log(`TIM edge agent online as ${config.nodeId} (${capabilities.join(', ')})`);
  const heartbeatIntervalMs = config.heartbeatIntervalMs || DEFAULT_HEARTBEAT_INTERVAL_MS;
  let lastHeartbeatAt = Date.now();
  let failureCount = 0;

  while (!signal.aborted) {
    let nextDelayMs = config.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS;
    try {
      const now = Date.now();
      if (now - lastHeartbeatAt >= heartbeatIntervalMs) {
        await bridgeRequest(config, 'updateDeviceNode', {
          id: node.id,
          status: 'online',
          last_seen: new Date(now).toISOString(),
          capabilities,
        });
        lastHeartbeatAt = now;
      }

      const queued = await bridgeRequest(config, 'listPendingCommands', { node_id: config.nodeId });
      await processQueuedCommands(config, queued);
      failureCount = 0;
    } catch (error) {
      failureCount += 1;
      nextDelayMs = computeRetryDelay(config, failureCount, error);
      console.warn(
        `TIM bridge poll failed: ${formatTransportError(error)}; retrying in ${Math.ceil(nextDelayMs / 1_000)}s`,
      );
    }
    await delay(nextDelayMs, signal);
  }

  try {
    await bridgeRequest(config, 'updateDeviceNode', { id: node.id, status: 'offline', last_seen: new Date().toISOString() });
  } catch (error) {
    console.warn(`TIM bridge shutdown update failed: ${formatTransportError(error)}`);
  }
}
