import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const encoder = new TextEncoder();

async function sha256(value) {
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'counselor', 'hr_specialist'].includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { alert_id } = await req.json();
    if (!alert_id) return Response.json({ error: 'alert_id is required' }, { status: 400 });

    const alert = await base44.asServiceRole.entities.IntegrityAlert.get(alert_id);
    if (!alert) return Response.json({ error: 'Alert not found' }, { status: 404 });
    if (alert.status !== 'resolved') return Response.json({ error: 'Only resolved alerts can be sealed.' }, { status: 400 });
    if (alert.evidence_hash) return Response.json({ error: 'This alert already has sealed evidence.' }, { status: 409 });

    const now = new Date().toISOString();
    const snapshot = alert.evidence_snapshot || {};
    const canonicalSnapshot = JSON.stringify(snapshot);
    const evidenceHash = await sha256(canonicalSnapshot);
    const manifest = {
      alert_id: alert.id,
      evidence_hash: evidenceHash,
      status_history: alert.status_history || [],
      review_notes: alert.review_notes || [],
      sealed_at: now,
    };
    const manifestHash = await sha256(JSON.stringify(manifest));
    const packageId = `EP-${alert.id.slice(-8)}-${Date.now()}`;

    const evidencePackage = await base44.asServiceRole.entities.EvidencePackage.create({
      package_id: packageId,
      alert_id: alert.id,
      created_by: user.email,
      created_timestamp: now,
      event_timeline: [],
      raw_records: [{
        record_id: alert.id,
        record_type: 'IntegrityAlert',
        record_data: snapshot,
        record_hash: evidenceHash,
        source_entity: 'IntegrityAlert',
        captured_at: now,
      }],
      manifest_hash: manifestHash,
      source_metadata: {
        system_name: 'TIM',
        entities_queried: ['IntegrityAlert'],
        record_ids: [alert.id],
        extraction_timestamp: now,
      },
      package_status: 'sealed',
      sealed_timestamp: now,
      confidential: true,
    });

    await base44.asServiceRole.entities.IntegrityAlert.update(alert.id, {
      evidence_hash: evidenceHash,
      reviewed_by: user.email,
    });

    return Response.json({ package_id: evidencePackage.package_id, evidence_hash: evidenceHash, manifest_hash: manifestHash });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});