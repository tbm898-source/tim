#!/usr/bin/env node
import { createHmac } from 'node:crypto';
import { loadAgentEnvFile } from './lib/load-env.mjs';
import { loadAgentConfig } from './lib/config.mjs';

loadAgentEnvFile();
const config = loadAgentConfig();

/** @type {{ name: string, ok: boolean, detail: string }[]} */
const checks = [];

function record(name, ok, detail) {
  checks.push({ name, ok, detail });
}

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

if (!config.commandSecret) {
  record('TIM_COMMAND_SIGNING_SECRET', false, 'missing — copy from Base44 Secrets into agent/.env');
} else {
  record('TIM_COMMAND_SIGNING_SECRET', true, `set (${config.commandSecret.length} chars)`);
}

record('TIM_NODE_ID', Boolean(config.nodeId), config.nodeId || 'missing');

try {
  const nodes = await bridgeRequest('listDeviceNodes', {});
  const count = Array.isArray(nodes) ? nodes.length : 0;
  const self = Array.isArray(nodes) ? nodes.find((n) => n.node_id === config.nodeId) : null;
  record('deviceAgentBridge', true, `${count} node(s) registered`);
  if (self) {
    record('node_registration', true, `${self.node_id} status=${self.status} last_seen=${self.last_seen}`);
  } else {
    record('node_registration', false, `${config.nodeId} not in ledger — run npm run agent:run`);
  }
} catch (error) {
  const message = error instanceof Error ? error.message : 'unknown error';
  record('deviceAgentBridge', false, message);
  if (message.toLowerCase().includes('unauthorized')) {
    record('secret_match', false, 'HMAC rejected — Base44 secret and agent/.env differ');
  }
}

const failed = checks.filter((check) => !check.ok);
const report = { ok: failed.length === 0, node_id: config.nodeId, checks };
console.log(JSON.stringify(report, null, 2));
process.exitCode = failed.length === 0 ? 0 : 1;
