import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const STATUS_MAP = {
  available: 'to do',
  checked_out: 'in progress',
  maintenance: 'in progress',
  missing: 'in review',
  retired: 'complete',
};

const PRIORITY_MAP = {
  available: 3,
  checked_out: 3,
  maintenance: 2,
  missing: 1,
  retired: 4,
};

async function updateClickUpTask(accessToken, taskId, payload) {
  let response;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch(`https://api.clickup.com/api/v2/task/${taskId}`, {
      method: 'PUT',
      headers: { Authorization: accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (response.ok || (response.status !== 429 && response.status < 500)) return response;

    if (attempt < 2) {
      const retryAfter = Number(response.headers.get('retry-after'));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 1000 * (attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return response;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    let asset;
    let newStatus;

    if (body.event && body.data) {
      asset = body.data;
      newStatus = asset.status;
    } else {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

      if (body.asset_id) {
        const assets = await base44.asServiceRole.entities.Asset.filter({ asset_id: body.asset_id });
        asset = assets[0];
      }
      newStatus = body.new_status || asset?.status;
    }

    if (!asset) return Response.json({ ok: false, message: 'Asset not found.' }, { status: 404 });
    if (!asset.clickup_task_id) {
      return Response.json({ ok: true, skipped: true, message: 'No ClickUp task linked to this asset.' });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('clickup');
    const response = await updateClickUpTask(accessToken, asset.clickup_task_id, {
      status: STATUS_MAP[newStatus] || 'to do',
      priority: PRIORITY_MAP[newStatus] || 3,
    });
    const updateData = await response.json();

    if (!response.ok) {
      return Response.json({ error: 'ClickUp update failed', details: updateData }, { status: 502 });
    }

    return Response.json({
      ok: true,
      clickup_task_id: asset.clickup_task_id,
      new_status: newStatus,
      clickup_status: STATUS_MAP[newStatus] || 'to do',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});