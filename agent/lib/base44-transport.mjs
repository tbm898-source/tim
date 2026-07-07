import { createHmac } from 'node:crypto';
import os from 'node:os';
import { discoverCapabilities, executeCommand } from './dispatcher.mjs';
import { verifyCommandAuthorization } from './authorization.mjs';

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function getFunctionUrl(config) {
  return `${config.serverUrl.replace(/\/$/, '')}/api/apps/${config.appId}/functions/deviceAgentBridge`;
}

async function bridgeRequest(config, action, payload = {}) {
  const body = JSON.stringify({ action, payload });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', config.commandSecret)
    .update(`${timestamp}.${body}`)
    .digest('hex');

  const response = await fetch(getFunctionUrl(config), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-TIM-Timestamp': timestamp,
      'X-TIM-Signature': signature,
    },
    body,
  });

  const text = await response.text();
  let result = {};
  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      const preview = text.trimStart().slice(0, 40).replace(/\s+/g, ' ');
      throw new Error(`deviceAgentBridge ${action} returned non-JSON (HTTP ${response.status}): ${preview}`);
    }
  }
  if (!response.ok) {
    throw new Error(result.error || `deviceAgentBridge ${action} failed with HTTP ${response.status}`);
  }
  return result.data;
}

async function publishEvent(config, event) {
  try {
    await bridgeRequest(config, 'createDeviceEvent', event);
  } catch (error) {
    console.warn(`TIM event write failed: ${error.message}`);
  }
}

export async function runAgent(config, signal) {
  if (!config.commandSecret) throw new Error('TIM_COMMAND_SIGNING_SECRET is required for connected mode');
  const capabilities = await discoverCapabilities(config);
  const platformName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';
  const existingNode = await bridgeRequest(config, 'getDeviceNode', { node_id: config.nodeId });
  const nodeData = {
    node_id: config.nodeId,
    display_name: config.displayName,
    platform: platformName,
    status: 'online',
    trust_level: config.trustLevel,
    capabilities,
    agent_version: '0.1.0',
    os_version: os.release(),
    hostname: os.hostname(),
    last_seen: new Date().toISOString(),
  };
  const node = existingNode
    ? await bridgeRequest(config, 'updateDeviceNode', { id: existingNode.id, ...nodeData })
    : await bridgeRequest(config, 'createDeviceNode', { ...nodeData, paired_at: new Date().toISOString() });

  console.log(`TIM edge agent online as ${config.nodeId} (${capabilities.join(', ')})`);
  while (!signal.aborted) {
    try {
      await bridgeRequest(config, 'updateDeviceNode', { id: node.id, status: 'online', last_seen: new Date().toISOString(), capabilities });
      const queued = await bridgeRequest(config, 'listPendingCommands', { node_id: config.nodeId });
      for (const command of queued) {
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
    } catch (error) {
      console.warn(`TIM bridge poll failed: ${error.message}`);
    }
    await delay(config.pollIntervalMs);
  }
  await bridgeRequest(config, 'updateDeviceNode', { id: node.id, status: 'offline', last_seen: new Date().toISOString() });
}
