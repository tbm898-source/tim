#!/usr/bin/env node
/**
 * Post a coordination ping to Base44 (DeviceEvent + node metadata).
 * Usage: node agent_coordination/ping-agent.mjs "message text"
 */
import { createHmac } from 'node:crypto';
import { loadAgentEnvFile } from '../agent/lib/load-env.mjs';
import { loadAgentConfig } from '../agent/lib/config.mjs';

loadAgentEnvFile();
const config = loadAgentConfig();

async function bridgeRequest(action, payload = {}) {
  const body = JSON.stringify({ action, payload });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', config.commandSecret)
    .update(`${timestamp}.${body}`)
    .digest('hex');
  const url = `${config.serverUrl.replace(/\/$/, '')}/api/apps/${config.appId}/functions/deviceAgentBridge`;

  const response = await fetch(url, {
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
      throw new Error(`non-JSON HTTP ${response.status}`);
    }
  }
  if (!response.ok) {
    throw new Error(result.error || `HTTP ${response.status}`);
  }
  return result.data;
}

const message = process.argv.slice(2).join(' ') || 'coordination ping';
const nodeId = 'dhd-admin';
const now = new Date().toISOString();

const node = await bridgeRequest('getDeviceNode', { node_id: nodeId });
if (!node?.id) {
  throw new Error(`node ${nodeId} not found`);
}

const event = await bridgeRequest('createDeviceEvent', {
  node_id: nodeId,
  event_type: 'agent.coordination',
  severity: 'info',
  message,
  details: { from: 'cursor', host: 'macbook-air', via: 'agent_coordination/ping-agent.mjs' },
  occurred_at: now,
});

const updated = await bridgeRequest('updateDeviceNode', {
  id: node.id,
  metadata: {
    ...(node.metadata || {}),
    coordination: {
      last_from: 'cursor',
      last_host: 'macbook-air',
      last_at: now,
      last_message: message,
    },
  },
});

console.log(JSON.stringify({ ok: true, event, node_id: nodeId, metadata: updated?.metadata }, null, 2));
