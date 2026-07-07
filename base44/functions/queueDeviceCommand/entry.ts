import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

const ACTION_POLICIES = {
  'system.inventory': { risk: 'read_only', capability: 'system.inventory' },
  'android.devices': { risk: 'read_only', capability: 'android.devices' },
  'network.ping': { risk: 'read_only', capability: 'network.ping' },
  'android.build': { risk: 'medium', capability: 'android.build' },
  'android.install': { risk: 'high', capability: 'android.install' },
  'app.launch': { risk: 'medium', capability: 'app.launch' },
  'xcode.list': { risk: 'read_only', capability: 'xcode.list' },
  'xcode.build': { risk: 'medium', capability: 'xcode.build' },
  'shortcut.run': { risk: 'high', capability: 'shortcut.run' },
};

const canonicalJson = (value) => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
};

const signCommand = async (secret, command) => {
  const message = [
    command.command_id,
    command.node_id,
    command.action,
    command.risk,
    command.expires_at,
    command.approved_at || '',
    canonicalJson(command.payload || {}),
  ].join('|');
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { node_id, action, payload = {}, idempotency_key } = await req.json();
    if (!node_id || !action) {
      return Response.json({ error: 'node_id and action are required' }, { status: 400 });
    }

    const policy = ACTION_POLICIES[action];
    if (!policy) return Response.json({ error: 'Action is not allowlisted' }, { status: 400 });
    const commandSecret = Deno.env.get('TIM_COMMAND_SIGNING_SECRET');
    if (!commandSecret) return Response.json({ error: 'Device command signing is not configured' }, { status: 503 });
    if (JSON.stringify(payload).length > 16_384) {
      return Response.json({ error: 'Command payload is too large' }, { status: 413 });
    }

    const nodes = await base44.asServiceRole.entities.DeviceNode.filter({ node_id });
    const node = nodes[0];
    if (!node || node.status === 'disabled') {
      return Response.json({ error: 'Trusted device node not found or disabled' }, { status: 404 });
    }
    if (!node.capabilities?.includes(policy.capability)) {
      return Response.json({ error: `Node does not advertise ${policy.capability}` }, { status: 409 });
    }
    if (node.trust_level === 'observe' && policy.risk !== 'read_only') {
      return Response.json({ error: 'Node is configured for observation only' }, { status: 409 });
    }

    if (idempotency_key) {
      const existing = await base44.asServiceRole.entities.DeviceCommand.filter({ idempotency_key });
      if (existing[0]) return Response.json({ ok: true, command: existing[0], duplicate: true });
    }

    const now = new Date();
    const requiresApproval = policy.risk !== 'read_only';
    const commandData = {
      command_id: crypto.randomUUID(),
      node_id,
      action,
      payload,
      risk: policy.risk,
      requires_approval: requiresApproval,
      status: requiresApproval ? 'pending_approval' : 'queued',
      requested_by: user.email || user.id,
      requested_at: now.toISOString(),
      expires_at: new Date(now.getTime() + 15 * 60_000).toISOString(),
      idempotency_key: idempotency_key || crypto.randomUUID(),
    };
    const command = await base44.asServiceRole.entities.DeviceCommand.create({
      ...commandData,
      authorization: await signCommand(commandSecret, commandData),
    });

    await base44.asServiceRole.entities.DeviceEvent.create({
      node_id,
      command_id: command.command_id,
      event_type: 'command.requested',
      severity: 'info',
      message: requiresApproval ? 'Command is waiting for approval' : 'Read-only command queued',
      details: { action, risk: policy.risk },
      occurred_at: now.toISOString(),
    });

    return Response.json({ ok: true, command });
  } catch (error) {
    console.error('Queue device command error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});