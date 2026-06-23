/**
 * deviceAgentBridge — scoped HTTP API for the TIM edge agent.
 *
 * Auth: HMAC-SHA256 — the secret never travels over the wire.
 * Edge agent must send on every request:
 *   X-TIM-Timestamp: <unix seconds as string, digits only>
 *   X-TIM-Signature: lowercase hex(HMAC-SHA256(TIM_COMMAND_SIGNING_SECRET, "<timestamp>.<rawBody>"))
 * Requests older than 300 seconds are rejected (replay protection).
 *
 * Allowed operations (POST body: { action, payload }):
 *
 *   DeviceNode:
 *     "listDeviceNodes"     {}
 *     "getDeviceNode"       { node_id }          — filters by node_id field, returns first match or null
 *     "createDeviceNode"    { ...fields }
 *     "updateDeviceNode"    { id, ...fields }
 *
 *   DeviceCommand:
 *     "listPendingCommands" { node_id }           — filters status: 'queued'
 *     "updateDeviceCommand" { id, ...fields }
 *
 *   DeviceEvent:
 *     "createDeviceEvent"   { ...fields }
 *
 * Canonical command lifecycle:
 *   pending_approval → queued → running → succeeded | failed | expired
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    // ── Header presence check ─────────────────────────────────────────────
    const signingSecret = Deno.env.get('TIM_COMMAND_SIGNING_SECRET');
    const timestamp = req.headers.get('X-TIM-Timestamp');
    const signature = req.headers.get('X-TIM-Signature');

    if (!signingSecret || !timestamp || !signature) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Timestamp: digits-only, finite, within 300 s of server clock ──────
    if (!/^\d+$/.test(timestamp)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const requestTime = Number(timestamp);
    if (!Number.isFinite(requestTime)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (Math.abs(Date.now() / 1000 - requestTime) > 300) {
      return Response.json({ error: 'Request expired' }, { status: 401 });
    }

    // ── Signature format: exactly 64 lowercase hex chars ─────────────────
    if (!/^[0-9a-f]{64}$/i.test(signature)) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Read raw body for HMAC (exact bytes used for signing) ─────────────
    const rawBody = await req.text();

    const keyBytes = new TextEncoder().encode(signingSecret);
    const msgBytes = new TextEncoder().encode(`${timestamp}.${rawBody}`);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, msgBytes);
    const expected = new Uint8Array(sigBuf);

    // ── Decode provided signature ─────────────────────────────────────────
    const provided = new Uint8Array(
      signature.match(/.{2}/g).map((byte) => parseInt(byte, 16))
    );

    // ── Constant-time comparison (no early exit) ──────────────────────────
    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
      mismatch |= provided[i] ^ expected[i];
    }
    if (mismatch !== 0) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Parse verified body ───────────────────────────────────────────────
    const { action, payload = {} } = JSON.parse(rawBody);

    // ── Service-role client (no personal API key required) ────────────────
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    // ── Route actions ─────────────────────────────────────────────────────
    switch (action) {

      case 'listDeviceNodes': {
        const nodes = await db.DeviceNode.list();
        return Response.json({ data: nodes });
      }

      case 'getDeviceNode': {
        // Filter by custom node_id field, not record primary key
        const nodes = await db.DeviceNode.filter({ node_id: payload.node_id });
        return Response.json({ data: nodes[0] || null });
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

      case 'listPendingCommands': {
        // Canonical ready status is 'queued'
        const cmds = await db.DeviceCommand.filter({
          node_id: payload.node_id,
          status: 'queued',
        });
        return Response.json({ data: cmds });
      }

      case 'updateDeviceCommand': {
        const { id, ...fields } = payload;
        const cmd = await db.DeviceCommand.update(id, fields);
        return Response.json({ data: cmd });
      }

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