import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const MAX_CLOCK_SKEW_SECONDS = 5 * 60;
const MAX_BODY_BYTES = 256 * 1024;

const NODE_FIELDS = new Set([
  'node_id',
  'display_name',
  'platform',
  'status',
  'trust_level',
  'capabilities',
  'agent_version',
  'os_version',
  'hostname',
  'last_seen',
  'paired_at',
  'paired_by',
  'tags',
  'metadata',
]);

const COMMAND_UPDATE_FIELDS = new Set([
  'status',
  'started_at',
  'completed_at',
  'result',
  'error',
]);

const EVENT_FIELDS = new Set([
  'node_id',
  'command_id',
  'event_type',
  'severity',
  'message',
  'details',
  'occurred_at',
]);

const BRIDGE_ACTIONS = new Set([
  'getDeviceNode',
  'createDeviceNode',
  'updateDeviceNode',
  'listPendingCommands',
  'updateDeviceCommand',
  'createDeviceEvent',
]);

const NODE_ID_PATTERN = /^[a-zA-Z0-9._-]{1,96}$/;
const HEX_HMAC_PATTERN = /^[a-f0-9]{64}$/;

function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function assertRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function requireNodeId(value: unknown): string {
  if (typeof value !== 'string' || !NODE_ID_PATTERN.test(value)) {
    throw new Error('node_id is invalid');
  }
  return value;
}

function pickAllowedFields(source: Record<string, unknown>, allowed: Set<string>) {
  const picked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (allowed.has(key)) picked[key] = value;
  }
  return picked;
}

function safeEqualHex(actual: string, expected: string) {
  if (!HEX_HMAC_PATTERN.test(actual)) return false;
  if (actual.length !== expected.length) return false;

  let diff = 0;
  for (let index = 0; index < actual.length; index += 1) {
    diff |= actual.charCodeAt(index) ^ expected.charCodeAt(index);
  }
  return diff === 0;
}

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyBridgeSignature(req: Request, rawBody: string, secret: string) {
  const timestampHeader = req.headers.get('X-TIM-Timestamp') || '';
  const signatureHeader = req.headers.get('X-TIM-Signature') || '';

  if (!/^\d{10,}$/.test(timestampHeader)) {
    return false;
  }

  const timestampSeconds = Number(timestampHeader);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS) {
    return false;
  }

  const expected = await hmacHex(secret, `${timestampHeader}.${rawBody}`);
  return safeEqualHex(signatureHeader, expected);
}

async function handleBridgeAction(
  entities: ReturnType<typeof createClientFromRequest>['asServiceRole']['entities'],
  action: string,
  payload: Record<string, unknown>,
) {
  switch (action) {
    case 'getDeviceNode': {
      const nodeId = requireNodeId(payload.node_id);
      const nodes = await entities.DeviceNode.filter({ node_id: nodeId });
      return nodes[0] || null;
    }

    case 'createDeviceNode': {
      const nodeFields = pickAllowedFields(payload, NODE_FIELDS);
      requireNodeId(nodeFields.node_id);
      if (!nodeFields.display_name || !nodeFields.platform) {
        throw new Error('display_name and platform are required');
      }
      return await entities.DeviceNode.create({
        ...nodeFields,
        status: nodeFields.status || 'online',
        trust_level: nodeFields.trust_level || 'observe',
        paired_at: nodeFields.paired_at || new Date().toISOString(),
      });
    }

    case 'updateDeviceNode': {
      const id = payload.id;
      if (typeof id !== 'string' || !id) throw new Error('id is required');
      const nodeFields = pickAllowedFields(payload, NODE_FIELDS);
      delete nodeFields.node_id;
      delete nodeFields.paired_at;
      return await entities.DeviceNode.update(id, nodeFields);
    }

    case 'listPendingCommands': {
      const nodeId = requireNodeId(payload.node_id);
      const queued = await entities.DeviceCommand.filter({ node_id: nodeId, status: 'queued' });
      return queued || [];
    }

    case 'updateDeviceCommand': {
      const id = payload.id;
      if (typeof id !== 'string' || !id) throw new Error('id is required');
      const commandFields = pickAllowedFields(payload, COMMAND_UPDATE_FIELDS);
      return await entities.DeviceCommand.update(id, commandFields);
    }

    case 'createDeviceEvent': {
      const eventFields = pickAllowedFields(payload, EVENT_FIELDS);
      requireNodeId(eventFields.node_id);
      if (!eventFields.event_type || !eventFields.severity || !eventFields.message) {
        throw new Error('event_type, severity, and message are required');
      }
      return await entities.DeviceEvent.create({
        ...eventFields,
        occurred_at: eventFields.occurred_at || new Date().toISOString(),
      });
    }

    default:
      throw new Error('Bridge action is not allowlisted');
  }
}

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') return jsonError('Method not allowed', 405);

    const commandSecret = Deno.env.get('TIM_COMMAND_SIGNING_SECRET');
    if (!commandSecret) return jsonError('Device agent bridge is not configured', 503);

    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).length > MAX_BODY_BYTES) {
      return jsonError('Request body is too large', 413);
    }

    const signatureOk = await verifyBridgeSignature(req, rawBody, commandSecret);
    if (!signatureOk) return jsonError('Unauthorized', 401);

    const body = assertRecord(JSON.parse(rawBody), 'body');
    const action = body.action;
    if (typeof action !== 'string' || !BRIDGE_ACTIONS.has(action)) {
      return jsonError('Bridge action is not allowlisted', 400);
    }
    const payload = assertRecord(body.payload || {}, 'payload');

    const base44 = createClientFromRequest(req);
    const data = await handleBridgeAction(base44.asServiceRole.entities, action, payload);
    return Response.json({ data });
  } catch (error) {
    console.error('Device agent bridge error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
