import { createHmac } from 'node:crypto';

/**
 * Send one request to the deviceAgentBridge endpoint.
 *
 * The exact deployed contract:
 *   - Body: JSON.stringify({ action, payload }) — stringified exactly once
 *   - Timestamp: Unix seconds as a string
 *   - Signature: HMAC-SHA256(commandSecret, "<timestamp>.<rawBody>") — lowercase hex
 *   - Headers: Content-Type, X-TIM-Timestamp, X-TIM-Signature
 *
 * Successful response: { "data": ... }
 * Error response:      { "error": "..." }
 *
 * This function never logs the secret or the generated signature.
 */
export async function bridgeRequest(config, action, payload = {}) {
  const { agentEndpoint, commandSecret } = config;

  if (!agentEndpoint) throw new Error('TIM_AGENT_ENDPOINT is required for connected mode');
  if (!commandSecret) throw new Error('TIM_COMMAND_SIGNING_SECRET is required for connected mode');

  const rawBody = JSON.stringify({ action, payload });
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', commandSecret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  let response;
  try {
    response = await fetch(agentEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-TIM-Timestamp': timestamp,
        'X-TIM-Signature': signature,
      },
      body: rawBody,
    });
  } catch (networkError) {
    throw new Error(`Bridge request failed: ${networkError.message}`);
  }

  if (!response.ok) {
    throw new Error(`Bridge returned HTTP ${response.status} for action '${action}'`);
  }

  let parsed;
  try {
    parsed = await response.json();
  } catch {
    throw new Error(`Bridge returned non-JSON response for action '${action}'`);
  }

  if (parsed && typeof parsed.error === 'string') {
    throw new Error(`Bridge error for action '${action}': ${parsed.error}`);
  }

  if (!Object.prototype.hasOwnProperty.call(parsed, 'data')) {
    throw new Error(`Bridge response missing 'data' field for action '${action}'`);
  }

  return parsed.data;
}

// ---------------------------------------------------------------------------
// Typed wrappers — exact deployed bridge actions and payload shapes
// ---------------------------------------------------------------------------

/** Look up this node by node_id. Returns one object or null. */
export function getDeviceNode(config) {
  return bridgeRequest(config, 'getDeviceNode', { node_id: config.nodeId });
}

/** Create a new node record on first pairing. */
export function createDeviceNode(config, nodeFields) {
  return bridgeRequest(config, 'createDeviceNode', nodeFields);
}

/** Update a node record (heartbeat, status, offline). */
export function updateDeviceNode(config, recordId, fields) {
  return bridgeRequest(config, 'updateDeviceNode', { id: recordId, ...fields });
}

/** Poll for queued commands assigned to this node. Returns an array. */
export async function listPendingCommands(config) {
  const result = await bridgeRequest(config, 'listPendingCommands', { node_id: config.nodeId });
  return Array.isArray(result) ? result : [];
}

/** Update a command record (running / succeeded / failed / expired). */
export function updateDeviceCommand(config, commandRecordId, fields) {
  return bridgeRequest(config, 'updateDeviceCommand', { id: commandRecordId, ...fields });
}

/** Write an audit event. */
export function createDeviceEvent(config, eventFields) {
  return bridgeRequest(config, 'createDeviceEvent', eventFields);
}
