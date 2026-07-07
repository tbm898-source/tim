import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const MAX_TIMESTAMP_SKEW_SECONDS = 300;

const ALLOWED_ACTIONS = new Set([
  'listDeviceNodes',
  'getDeviceNode',
  'createDeviceNode',
  'updateDeviceNode',
  'listPendingCommands',
  'updateDeviceCommand',
  'createDeviceEvent',
]);

const timingSafeEqualHex = (left: string, right: string): boolean => {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
};

async function verifyBridgeSignature(
  body: string,
  timestampHeader: string | null,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  if (!timestampHeader || !signatureHeader || !/^\d+$/.test(timestampHeader)) return false;
  if (!/^[a-f0-9]{64}$/i.test(signatureHeader)) return false;

  const timestamp = Number(timestampHeader);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(timestamp) || Math.abs(now - timestamp) > MAX_TIMESTAMP_SKEW_SECONDS) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestampHeader}.${body}`),
  );
  const expectedHex = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return timingSafeEqualHex(expectedHex.toLowerCase(), signatureHeader.toLowerCase());
}

async function handleAction(
  base44: ReturnType<typeof createClientFromRequest>,
  action: string,
  payload: Record<string, unknown>,
) {
  switch (action) {
    case 'listDeviceNodes':
      return await base44.asServiceRole.entities.DeviceNode.list();
    case 'getDeviceNode': {
      if (!payload.node_id || typeof payload.node_id !== 'string') {
        throw new Error('node_id is required');
      }
      const nodes = await base44.asServiceRole.entities.DeviceNode.filter({ node_id: payload.node_id });
      return nodes[0] || null;
    }
    case 'createDeviceNode': {
      const { node_id, display_name, platform } = payload;
      if (!node_id || !display_name || !platform) {
        throw new Error('node_id, display_name, and platform are required');
      }
      const existing = await base44.asServiceRole.entities.DeviceNode.filter({ node_id });
      if (existing[0]) {
        throw new Error('Device node already exists');
      }
      return await base44.asServiceRole.entities.DeviceNode.create(payload);
    }
    case 'updateDeviceNode': {
      const { id, ...updates } = payload;
      if (!id || typeof id !== 'string') {
        throw new Error('id is required');
      }
      return await base44.asServiceRole.entities.DeviceNode.update(id, updates);
    }
    case 'listPendingCommands': {
      if (!payload.node_id || typeof payload.node_id !== 'string') {
        throw new Error('node_id is required');
      }
      return await base44.asServiceRole.entities.DeviceCommand.filter({
        node_id: payload.node_id,
        status: 'queued',
      });
    }
    case 'updateDeviceCommand': {
      const { id, ...updates } = payload;
      if (!id || typeof id !== 'string') {
        throw new Error('id is required');
      }
      return await base44.asServiceRole.entities.DeviceCommand.update(id, updates);
    }
    case 'createDeviceEvent':
      return await base44.asServiceRole.entities.DeviceEvent.create(payload);
    default:
      throw new Error('Unknown action');
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const commandSecret = Deno.env.get('TIM_COMMAND_SIGNING_SECRET');
  if (!commandSecret) {
    return Response.json({ error: 'Device agent bridge is not configured' }, { status: 503 });
  }

  const body = await req.text();
  const timestamp = req.headers.get('X-TIM-Timestamp');
  const signature = req.headers.get('X-TIM-Signature');
  const valid = await verifyBridgeSignature(body, timestamp, signature, commandSecret);
  if (!valid) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const parsed = body ? JSON.parse(body) : {};
    const action = parsed.action;
    const payload = parsed.payload ?? {};

    if (!action || typeof action !== 'string') {
      return Response.json({ error: 'action is required' }, { status: 400 });
    }
    if (!ALLOWED_ACTIONS.has(action)) {
      return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
    if (payload !== null && typeof payload !== 'object') {
      return Response.json({ error: 'payload must be an object' }, { status: 400 });
    }

    const data = await handleAction(base44, action, payload as Record<string, unknown>);
    return Response.json({ data });
  } catch (error) {
    console.error('deviceAgentBridge error:', error);
    return Response.json({ error: error instanceof Error ? error.message : 'Bridge request failed' }, { status: 400 });
  }
});
