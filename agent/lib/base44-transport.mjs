import { createClient } from '@base44/sdk';
import os from 'node:os';
import { discoverCapabilities, executeCommand } from './dispatcher.mjs';
import { verifyCommandAuthorization } from './authorization.mjs';

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function publishEvent(base44, event) {
  try {
    await base44.entities.DeviceEvent.create(event);
  } catch (error) {
    console.warn(`TIM event write failed: ${error.message}`);
  }
}

export async function runAgent(config, signal) {
  if (!config.token) throw new Error('TIM_BASE44_ACCESS_TOKEN is required for connected mode');
  if (!config.commandSecret) throw new Error('TIM_COMMAND_SIGNING_SECRET is required for connected mode');
  const base44 = createClient({
    appId: config.appId,
    serverUrl: config.serverUrl,
    token: config.token,
    requiresAuth: true,
  });
  const capabilities = await discoverCapabilities(config);
  const platformName = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';
  const nodes = await base44.entities.DeviceNode.filter({ node_id: config.nodeId });
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
  const node = nodes[0]
    ? await base44.entities.DeviceNode.update(nodes[0].id, nodeData)
    : await base44.entities.DeviceNode.create({ ...nodeData, paired_at: new Date().toISOString() });

  console.log(`TIM edge agent online as ${config.nodeId} (${capabilities.join(', ')})`);
  while (!signal.aborted) {
    await base44.entities.DeviceNode.update(node.id, { status: 'online', last_seen: new Date().toISOString(), capabilities });
    const queued = await base44.entities.DeviceCommand.filter({ node_id: config.nodeId, status: 'queued' });
    for (const command of queued) {
      const now = new Date();
      if (!verifyCommandAuthorization(command, config.commandSecret)) {
        await base44.entities.DeviceCommand.update(command.id, { status: 'failed', error: 'Command signature is missing or invalid', completed_at: now.toISOString() });
        await publishEvent(base44, {
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
        await base44.entities.DeviceCommand.update(command.id, { status: 'expired', completed_at: now.toISOString() });
        continue;
      }
      if (command.requires_approval && !command.approved_at) {
        await base44.entities.DeviceCommand.update(command.id, { status: 'failed', error: 'Approval record is missing' });
        continue;
      }

      await base44.entities.DeviceCommand.update(command.id, { status: 'running', started_at: now.toISOString() });
      try {
        const result = await executeCommand(command, { config, approved: !command.requires_approval || Boolean(command.approved_at) });
        const completedAt = new Date().toISOString();
        await base44.entities.DeviceCommand.update(command.id, { status: 'succeeded', result, completed_at: completedAt });
        await publishEvent(base44, {
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
        await base44.entities.DeviceCommand.update(command.id, {
          status: 'failed',
          error: error.message,
          result: error.result || {},
          completed_at: completedAt,
        });
        await publishEvent(base44, {
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
  await base44.entities.DeviceNode.update(node.id, { status: 'offline', last_seen: new Date().toISOString() });
}
