/**
 * deviceAgentBridge — scoped HTTP API for the TIM edge agent.
 *
 * Auth: HMAC-SHA256 — the secret never travels over the wire.
 * Edge agent must send on every request:
 *   X-TIM-Timestamp: <unix seconds as string>
 *   X-TIM-Signature: hex(HMAC-SHA256(TIM_COMMAND_SIGNING_SECRET, "<timestamp>.<rawBody>"))
 * Requests older than 5 minutes are rejected (replay protection).
 *
 * Allowed operations (POST body: { action, payload }):
 *
 *   DeviceNode:
 *     "listDeviceNodes"     {}
 *     "getDeviceNode"       { node_id }
 *     "createDeviceNode"    { ...fields }
 *     "updateDeviceNode"    { id, ...fields }
 *
 *   DeviceCommand:
 *     "listPendingCommands" { node_id }
 *     "updateDeviceCommand" { id, ...fields }
 *
 *   DeviceEvent:
 *     "createDeviceEvent"   { ...fields }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // ── HMAC-SHA256 Auth ──────────────────────────────────────────────────
    const signingSecret = Deno.env.get('TIM_COMMAND_SIGNING_SECRET');
    const timestamp = req.headers.get('X-TIM-Timestamp');
    const signature = req.headers.get('X-TIM-Signature');

    if (!signingSecret || !timestamp || !signature) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Replay protection: reject if older than 5 minutes
    const age = Math.abs(Date.now() / 1000 - parseInt(timestamp, 10));
    if (age > 300) {
      return Response.json({ error: 'Request expired' }, { status: 401 });
    }

    const rawBody = await req.text();

    const keyBytes = new TextEncoder().encode(signingSecret);
    const msgBytes = new TextEncoder().encode(`${timestamp}.${rawBody}`);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes);
    const expected = Array.from(new Uint8Array(sigBuf))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    if (signature !== expected) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Parse verified body ───────────────────────────────────────────────
    const { action, payload = {} } = JSON.parse(rawBody);

    // ── Service-role client ───────────────────────────────────────────────
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    // ── Route actions ─────────────────────────────────────────────────────
    switch (action) {

      // DeviceNode
      case 'listDeviceNodes': {
        const nodes = await db.DeviceNode.list();
        return Response.json({ data: nodes });
      }
      case 'getDeviceNode': {
        const node = await db.DeviceNode.get(payload.node_id);
        return Response.json({ data: node });
      }
      case 'createDeviceNode': {
        const node = await db.DeviceNode.create(payload);
        return Response.json({ data: node });
      }
      case 'updateDeviceNode': {
        const { id, ...fields } = payload;
        const node = await db.DeviceNode.update(id, fields);
        return Response.json({ data: node });
      }

      // DeviceCommand
      case 'listPendingCommands': {
        const cmds = await db.DeviceCommand.filter({ node_id: payload.node_id, status: 'pending' });
        return Response.json({ data: cmds });
      }
      case 'updateDeviceCommand': {
        const { id, ...fields } = payload;
        const cmd = await db.DeviceCommand.update(id, fields);
        return Response.json({ data: cmd });
      }

      // DeviceEvent
      case 'createDeviceEvent': {
        const evt = await db.DeviceEvent.create(payload);
        return Response.json({ data: evt });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});