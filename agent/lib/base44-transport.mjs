import os from 'node:os';
import {
  getDeviceNode,
  createDeviceNode,
  updateDeviceNode,
  listPendingCommands,
  updateDeviceCommand,
  createDeviceEvent,
} from './bridge-client.mjs';
import { discoverCapabilities, executeCommand } from './dispatcher.mjs';
import { verifyCommandAuthorization } from './authorization.mjs';

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function publishEvent(config, event) {
  try {
    await createDeviceEvent(config, event);
  } catch (error) {
    console.warn(`TIM event write failed: ${error.message}`);
  }
}

export async function runAgent(config, signal) {
  if (!config.agentEndpoint) throw new Error('TIM_AGENT_ENDPOINT is required for connected mode');
  if (!config.commandSecret) throw new Error('TIM_COMMAND_SIGNING_SECRET is required for connected mode');

  const capabilities = await discoverCapabilities(config);
  const platformName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';

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

  // Look up existing node or create it on first pairing
  let node = await getDeviceNode(config);
  if (node) {
    node = await updateDeviceNode(config, node.id, nodeData);
  } else {
    node = await createDeviceNode(config, { ...nodeData, paired_at: new Date().toISOString() });
  }

  console.log(`TIM edge agent online as ${config.nodeId} (${capabilities.join(', ')})`);

  while (!signal.aborted) {
    // Heartbeat
    await updateDeviceNode(config, node.id, {
      status: 'online',
      last_seen: new Date().toISOString(),
      capabilities,
    });

    const queued = await listPendingCommands(config);

    for (const command of queued) {
      const now = new Date();

      if (!verifyCommandAuthorization(command, config.commandSecret)) {
        await updateDeviceCommand(config, command.id, {
          status: 'failed',
          error: 'Command signature is missing or invalid',
          completed_at: now.toISOString(),
        });
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
        await updateDeviceCommand(config, command.id, {
          status: 'expired',
          completed_at: now.toISOString(),
        });
        continue;
      }

      if (command.requires_approval && !command.approved_at) {
        await updateDeviceCommand(config, command.id, {
          status: 'failed',
          error: 'Approval record is missing',
        });
        continue;
      }

      await updateDeviceCommand(config, command.id, {
        status: 'running',
        started_at: now.toISOString(),
      });

      try {
        const result = await executeCommand(command, {
          config,
          approved: !command.requires_approval || Boolean(command.approved_at),
        });
        const completedAt = new Date().toISOString();
        await updateDeviceCommand(config, command.id, {
          status: 'succeeded',
          result,
          completed_at: completedAt,
        });
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
        await updateDeviceCommand(config, command.id, {
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

    await delay(config.pollIntervalMs);
  }

  // Mark offline on graceful shutdown (SIGINT / SIGTERM)
  await updateDeviceNode(config, node.id, {
    status: 'offline',
    last_seen: new Date().toISOString(),
  });
}
