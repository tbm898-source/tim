/**
 * deviceAgentBridge — scoped HTTP API for the TIM edge agent.
 *
 * Auth: every request must include header
 *   X-TIM-Signature: <value of TIM_COMMAND_SIGNING_SECRET>
 *
 * Allowed operations (POST body: { action, payload }):
 *
 *   DeviceNode:
 *     "getDeviceNode"       { node_id }
 *     "listDeviceNodes"     {}
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
    // ── Auth ──────────────────────────────────────────────────────────────
    const signingSecret = Deno.env.get('TIM_COMMAND_SIGNING_SECRET');
    const incoming = req.headers.get('X-TIM-Signature');
    if (!signingSecret || incoming !== signingSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const { action, payload = {} } = await req.json();

    // ── Service-role client (no user token needed) ────────────────────────
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    // ── Route actions ─────────────────────────────────────────────────────
    switch (action) {

      // DeviceNode
      case 'getDeviceNode': {
        const node = await db.DeviceNode.get(payload.node_id);
        return Response.json({ data: node });
      }
      case 'listDeviceNodes': {
        const nodes = await db.DeviceNode.list();
        return Response.json({ data: nodes });
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