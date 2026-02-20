import { base44 } from '@/api/base44Client';

// Generate correlation ID (UUID v4)
export function generateCorrelationId() {
    return crypto.randomUUID();
}

// Get base analytics properties
export async function getBaseProperties(correlationId = null) {
    try {
        const user = await base44.auth.me();
        const config = await base44.entities.PilotConfig.filter({ config_key: 'global' });
        const pilotConfig = config?.[0] || {};

        return {
            correlation_id: correlationId || generateCorrelationId(),
            org_id: 'pilot_org_001',
            env: import.meta.env.MODE || 'dev',
            pilot_mode: true,
            actor_email_pseudo: user?.email || 'anonymous',
            actor_role: user?.role || 'unknown',
            external_send_enabled: pilotConfig.external_send_enabled || false
        };
    } catch (error) {
        // Fallback if config fetch fails
        return {
            correlation_id: correlationId || generateCorrelationId(),
            org_id: 'pilot_org_001',
            env: import.meta.env.MODE || 'dev',
            pilot_mode: true,
            actor_email_pseudo: 'anonymous',
            actor_role: 'unknown',
            external_send_enabled: false
        };
    }
}

// Track event with base properties
export async function trackEvent(eventName, properties = {}) {
    const baseProps = await getBaseProperties(properties.correlation_id);
    
    base44.analytics.track({
        eventName,
        properties: {
            ...baseProps,
            ...properties
        }
    });
}

// Integrity Alert events
export async function trackIntegrityAlertCreated(alert, correlationId) {
    await trackEvent('integrity_alert_created', {
        correlation_id: correlationId,
        alert_type: alert.alert_type,
        severity: alert.severity,
        escalation_level: alert.escalation_level,
        status: alert.status
    });
}

export async function trackIntegrityAlertStatusChanged(alert, fromStatus, toStatus, changedByRole, reasonCode, correlationId) {
    await trackEvent('integrity_alert_status_changed', {
        correlation_id: correlationId,
        alert_id: alert.id,
        from_status: fromStatus,
        to_status: toStatus,
        changed_by_role: changedByRole,
        reason_code: reasonCode
    });
}

export async function trackIntegrityAlertEscalated(alert, fromLevel, toLevel, rationaleCode, notifiedPartyCount, correlationId) {
    await trackEvent('integrity_alert_escalated', {
        correlation_id: correlationId,
        alert_id: alert.id,
        from_level: fromLevel,
        to_level: toLevel,
        rationale_code: rationaleCode,
        notified_party_count: notifiedPartyCount
    });
}

// Whistleblower Tip events
export async function trackWhistleblowerTipReceived(tip, correlationId) {
    await trackEvent('whistleblower_tip_received', {
        correlation_id: correlationId,
        category: tip.category,
        anonymous: tip.anonymous,
        submission_method: tip.submission_method,
        attachments_count: tip.attachments?.length || 0,
        priority: tip.priority
    });
}

export async function trackWhistleblowerTipRouted(tip, correlationId) {
    await trackEvent('whistleblower_tip_routed', {
        correlation_id: correlationId,
        tip_id: tip.id,
        routed_to_external: tip.routed_to_external,
        conflict_of_interest_flag: tip.conflict_of_interest_flag,
        status: tip.status
    });
}

// Evidence Package events
export async function trackEvidencePackageGenerated(pkg, correlationId) {
    await trackEvent('evidence_package_generated', {
        correlation_id: correlationId,
        package_status: pkg.package_status,
        timeline_event_count: pkg.event_timeline?.length || 0,
        raw_record_count: pkg.raw_records?.length || 0,
        file_hash_count: pkg.file_hashes?.length || 0
    });
}

export async function trackEvidencePackageSealed(pkg, correlationId) {
    await trackEvent('evidence_package_sealed', {
        correlation_id: correlationId,
        package_id: pkg.id,
        sealed: true,
        package_status: pkg.package_status
    });
}

export async function trackEvidenceExportAttempted(allowed, blockedReason, correlationId) {
    await trackEvent('evidence_export_attempted', {
        correlation_id: correlationId,
        allowed,
        blocked_reason: blockedReason
    });
}

// Talent Insight events
export async function trackTalentProfileGenerated(profile, correlationId) {
    await trackEvent('talent_profile_generated', {
        correlation_id: correlationId,
        strength_count: profile.strength_profile?.length || 0,
        skill_gap_count: profile.skill_gap_analysis?.length || 0,
        succession_bench_candidate: profile.succession_bench_candidate
    });
}

export async function trackTalentProfileViewed(profile, viewerRole, correlationId) {
    await trackEvent('talent_profile_viewed', {
        correlation_id: correlationId,
        profile_id: profile.id,
        viewer_role: viewerRole,
        visible_to_roles_count: profile.visible_to_roles?.length || 0
    });
}