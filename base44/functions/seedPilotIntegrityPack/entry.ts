import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

async function generateHash(data) {
    const encoder = new TextEncoder();
    const jsonStr = JSON.stringify(data, Object.keys(data).sort());
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(jsonStr));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `SHA256:${hashHex}`;
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user || user.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const payload = await req.json();
        const { integrityAlert, whistleblowerTip, evidencePackage, talentInsight } = payload;

        if (!integrityAlert || !whistleblowerTip || !evidencePackage || !talentInsight) {
            return Response.json({ 
                error: 'Missing required data: integrityAlert, whistleblowerTip, evidencePackage, talentInsight' 
            }, { status: 400 });
        }

        // Generate evidence_hash for IntegrityAlert
        const evidenceHashData = {
            signal_summary: integrityAlert.signal_summary,
            detection_timestamp: integrityAlert.detection_timestamp,
            evidence_snapshot: integrityAlert.evidence_snapshot || {},
            signal_details: integrityAlert.signal_details || {}
        };
        const evidence_hash = await generateHash(evidenceHashData);

        // Create IntegrityAlert
        const createdAlert = await base44.asServiceRole.entities.IntegrityAlert.create({
            ...integrityAlert,
            evidence_hash
        });

        // Create WhistleblowerTip with related_alert_id
        const createdTip = await base44.asServiceRole.entities.WhistleblowerTip.create({
            ...whistleblowerTip,
            related_alert_id: createdAlert.id
        });

        // Build event_timeline and raw_records for EvidencePackage
        const event_timeline = [
            {
                timestamp_utc: createdAlert.detection_timestamp,
                actor_id: "system",
                entity_type: "IntegrityAlert",
                entity_id: createdAlert.id,
                action: "alert_detected",
                metadata: { severity: createdAlert.severity }
            },
            {
                timestamp_utc: createdTip.submission_timestamp,
                actor_id: createdTip.submitter_email || "anonymous",
                entity_type: "WhistleblowerTip",
                entity_id: createdTip.id,
                action: "tip_submitted",
                metadata: { anonymous: createdTip.anonymous }
            }
        ];

        // Generate record hashes for raw_records
        const alertRecordHash = await generateHash(createdAlert);
        const tipRecordHash = await generateHash(createdTip);

        const raw_records = [
            {
                record_id: createdAlert.id,
                record_type: "IntegrityAlert",
                record_data: createdAlert,
                record_hash: alertRecordHash,
                source_entity: "IntegrityAlert",
                captured_at: createdAlert.detection_timestamp
            },
            {
                record_id: createdTip.id,
                record_type: "WhistleblowerTip",
                record_data: createdTip,
                record_hash: tipRecordHash,
                source_entity: "WhistleblowerTip",
                captured_at: createdTip.submission_timestamp
            }
        ];

        // Generate manifest_hash for EvidencePackage
        const manifestHashData = {
            package_id: evidencePackage.package_id,
            alert_id: createdAlert.id,
            created_timestamp: evidencePackage.created_timestamp,
            event_timeline,
            raw_records,
            file_hashes: evidencePackage.file_hashes || []
        };
        const manifest_hash = await generateHash(manifestHashData);

        // Create EvidencePackage
        const createdPackage = await base44.asServiceRole.entities.EvidencePackage.create({
            ...evidencePackage,
            alert_id: createdAlert.id,
            event_timeline,
            raw_records,
            manifest_hash
        });

        // Create TalentInsight
        const createdInsight = await base44.asServiceRole.entities.TalentInsight.create(talentInsight);

        return Response.json({
            ok: true,
            created: {
                integrityAlert_id: createdAlert.id,
                whistleblowerTip_id: createdTip.id,
                evidencePackage_id: createdPackage.id,
                talentInsight_id: createdInsight.id
            },
            custom_refs: {
                tip_id: createdTip.tip_id,
                package_id: createdPackage.package_id
            }
        });

    } catch (error) {
        console.error("Seed pilot data error:", error);
        return Response.json({ 
            error: error.message,
            details: error.stack 
        }, { status: 500 });
    }
});