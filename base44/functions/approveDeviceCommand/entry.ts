import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const canonicalJson = (value: unknown): string => {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
};

const signCommand = async (secret: string, command: Record<string, unknown>) => {
  const message = [
    command.command_id,
    command.node_id,
    command.action,
    command.risk,
    command.expires_at,
    command.approved_at || '',
    canonicalJson(command.payload || {}),
  ].join('|');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const commandSecret = Deno.env.get('TIM_COMMAND_SIGNING_SECRET');
    if (!commandSecret) return Response.json({ error: 'Device command signing is not configured' }, { status: 503 });

    const { command_id } = await req.json();
    if (!command_id) return Response.json({ error: 'command_id is required' }, { status: 400 });

    const matches = await base44.asServiceRole.entities.DeviceCommand.filter({ command_id });
    const command = matches[0];
    if (!command) return Response.json({ error: 'Command not found' }, { status: 404 });
    if (command.status !== 'pending_approval') {
      return Response.json({ error: 'Only pending commands can be approved' }, { status: 409 });
    }
    if (command.expires_at && new Date(command.expires_at) <= new Date()) {
      await base44.asServiceRole.entities.DeviceCommand.update(command.id, { status: 'expired' });
      return Response.json({ error: 'Command has expired' }, { status: 409 });
    }

    const approvedAt = new Date().toISOString();
    const authorization = await signCommand(commandSecret, { ...command, approved_at: approvedAt });
    const updated = await base44.asServiceRole.entities.DeviceCommand.update(command.id, {
      status: 'queued',
      approved_by: user.email || user.id,
      approved_at: approvedAt,
      authorization,
    });
    await base44.asServiceRole.entities.DeviceEvent.create({
      node_id: command.node_id,
      command_id,
      event_type: 'command.approved',
      severity: 'security',
      message: 'A consequential device command was approved',
      details: { action: command.action, risk: command.risk, approved_by: user.email || user.id },
      occurred_at: approvedAt,
    });

    return Response.json({ ok: true, command: updated });
  } catch (error) {
    console.error('Approve device command error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
