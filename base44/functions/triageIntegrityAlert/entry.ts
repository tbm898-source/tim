import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const ALLOWED_ROLES = ['admin', 'counselor', 'hr_specialist'];
const ALLOWED_STATUSES = ['new', 'under_review', 'escalated', 'resolved', 'false_positive'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ALLOWED_ROLES.includes(user.role)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { alert_id, action, status, rationale = '', notified_parties = [] } = await req.json();
    if (!alert_id) return Response.json({ error: 'alert_id is required' }, { status: 400 });

    const alert = await base44.asServiceRole.entities.IntegrityAlert.get(alert_id);
    if (!alert) return Response.json({ error: 'Alert not found' }, { status: 404 });

    const now = new Date().toISOString();
    const reviewNotes = alert.review_notes || [];
    const statusHistory = alert.status_history || [];
    const updates = { reviewed_by: user.email };

    if (action === 'status') {
      if (!ALLOWED_STATUSES.includes(status)) return Response.json({ error: 'Invalid status' }, { status: 400 });
      if (status === 'resolved' && ['high', 'critical'].includes(alert.severity) && !rationale.trim()) {
        return Response.json({ error: 'A resolution rationale is required for high and critical alerts.' }, { status: 400 });
      }

      statusHistory.push({
        timestamp: now,
        from_status: alert.status,
        to_status: status,
        changed_by: user.email,
        reason: rationale.trim() || 'Manual triage update',
      });
      updates.status = status;
      updates.status_history = statusHistory;
    } else if (action === 'escalate') {
      if (!rationale.trim()) return Response.json({ error: 'An escalation rationale is required.' }, { status: 400 });
      const nextLevel = Math.min((alert.escalation_level || 0) + 1, 4);
      const escalationPath = alert.escalation_path || [];
      escalationPath.push({
        level: nextLevel,
        level_name: `Level ${nextLevel}`,
        timestamp: now,
        escalated_by: user.email,
        rationale: rationale.trim(),
        notified_parties,
      });
      statusHistory.push({
        timestamp: now,
        from_status: alert.status,
        to_status: 'escalated',
        changed_by: user.email,
        reason: rationale.trim(),
      });
      updates.status = 'escalated';
      updates.status_history = statusHistory;
      updates.escalation_level = nextLevel;
      updates.escalation_path = escalationPath;
      updates.escalation_level_rationale = rationale.trim();
      reviewNotes.push({ timestamp: now, reviewer: user.email, note: `Escalated: ${rationale.trim()}` });
      updates.review_notes = reviewNotes;
    } else {
      return Response.json({ error: 'Invalid action' }, { status: 400 });
    }

    const updatedAlert = await base44.asServiceRole.entities.IntegrityAlert.update(alert.id, updates);
    let notificationStatus = 'not_requested';

    if (action === 'escalate' && notified_parties.length > 0) {
      const configs = await base44.asServiceRole.entities.PilotConfig.filter({ config_key: 'global' });
      const config = configs[0];
      if (config?.external_send_enabled) {
        await Promise.all(notified_parties.map((email) => base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `Integrity alert escalation: ${alert.severity} severity`,
          body: `An integrity alert has been escalated for review.\n\nAlert ID: ${alert.id}\nSummary: ${alert.signal_summary}\nRationale: ${rationale.trim()}`,
        })));
        notificationStatus = 'sent';
      } else {
        notificationStatus = 'blocked_by_safety_gate';
      }
    }

    return Response.json({ alert: updatedAlert, notification_status: notificationStatus });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});