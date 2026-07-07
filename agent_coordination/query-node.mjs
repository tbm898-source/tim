#!/usr/bin/env node
/**
 * Query a device node and pending commands via deviceAgentBridge.
 * Usage: node agent_coordination/query-node.mjs [node_id]
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

const nodeId = process.argv[2] || 'dhd-admin';
const node = await bridgeRequest('getDeviceNode', { node_id: nodeId });
const pending = await bridgeRequest('listPendingCommands', { node_id: nodeId });

console.log(JSON.stringify({ node_id: nodeId, node, pending_count: pending?.length ?? 0, pending }, null, 2));
