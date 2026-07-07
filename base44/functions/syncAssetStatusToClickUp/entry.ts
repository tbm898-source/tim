import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

// Map Asset status → ClickUp status name (adjust to match your ClickUp list's statuses)
const STATUS_MAP = {
  available: 'to do',
  checked_out: 'in progress',
  maintenance: 'in progress',
  missing: 'in review',
  retired: 'complete',
};

// Map Asset status → ClickUp priority number (1=urgent, 2=high, 3=normal, 4=low)
const PRIORITY_MAP = {
  available: 3,
  checked_out: 3,
  maintenance: 2,
  missing: 1,
  retired: 4,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Support both: automation payload (entity event) and direct API call
    let asset, newStatus;

    if (body.event && body.data) {
      // Called by automation — body.data is the updated Asset record
      asset = body.data;
      newStatus = asset.status;
    } else {
      // Called directly from frontend — expects { asset_id, new_status, clickup_task_id }
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      if (body.asset_id) {
        const assets = await base44.asServiceRole.entities.Asset.filter({ asset_id: body.asset_id });
        asset = assets[0];
      }
      newStatus = body.new_status || asset?.status;
    }

    if (!asset) {
      return Response.json({ ok: false, message: 'Asset not found.' });
    }

    const clickupTaskId = asset.clickup_task_id;
    if (!clickupTaskId) {
      // No ClickUp task linked — silently skip (not an error for assets without ClickUp links)
      return Response.json({ ok: false, message: 'No ClickUp task linked to this asset.' });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('clickup');

    const clickupStatus = STATUS_MAP[newStatus] || 'to do';
    const clickupPriority = PRIORITY_MAP[newStatus] || 3;

    // Update the ClickUp task status and priority
    const updateRes = await fetch(`https://api.clickup.com/api/v2/task/${clickupTaskId}`, {
      method: 'PUT',
      headers: { Authorization: accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: clickupStatus, priority: clickupPriority }),
    });

    const updateData = await updateRes.json();

    if (!updateRes.ok) {
      console.error('ClickUp update failed:', updateData);
      return Response.json({ error: 'ClickUp update failed', details: updateData }, { status: 502 });
    }

    // Post an audit comment to the ClickUp task
    await fetch(`https://api.clickup.com/api/v2/task/${clickupTaskId}/comment`, {
      method: 'POST',
      headers: { Authorization: accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment_text: `[TIM] Asset "${asset.name || asset.asset_id}" status → "${newStatus}" (${new Date().toISOString()})`,
        notify_all: false,
      }),
    });

    return Response.json({ ok: true, clickup_task_id: clickupTaskId, new_status: newStatus, clickup_status: clickupStatus });

  } catch (error) {
    console.error('syncAssetStatusToClickUp error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});