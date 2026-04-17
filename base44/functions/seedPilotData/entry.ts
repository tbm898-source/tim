import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/** Stable stringify for deterministic hashes */
function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",")}}`;
}

/** SHA-256 hash as hex string */
async function sha256Hex(input) {
  const data = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        const db = base44.asServiceRole.entities;

        // 1) IntegrityAlert seed (without id)
        const integrityAlertPayload = {
            alert_type: "access_pattern",
            severity: "medium",
            escalation_level: 1,
            escalation_level_rationale: "Pattern matched: elevated access activity vs baseline; triage required. No intent inferred.",
            associated_users: ["pilot.user001@example.test"],
            status: "new",
            signal_summary: "Access activity deviated from baseline over the last 24 hours (frequency increase and unusual sequence).",
            signal_details: {
                transaction_ids: [],
                entity_type: "EvidencePackage",
                entity_ids: [],
                date_range: {
                    start: "2026-02-19T08:10:00Z",
                    end: "2026-02-20T08:10:00Z"
                },
                metadata: {
                    baseline_window_days: 14,
                    observed_access_events: 18,
                    baseline_access_events: 4
                }
            },
            corroborating_signals: [],
            detection_method: "rule-based",
            detection_timestamp: "2026-02-20T08:10:00Z",
            reviewed_by: "",
            review_notes: [],
            status_history: [{
                timestamp: "2026-02-20T08:10:00Z",
                from_status: "new",
                to_status: "new",
                changed_by: "system",
                reason: "Initial detection and creation"
            }],
            evidence_snapshot: {
                snapshot_version: "pilot_v1",
                captured_at: "2026-02-20T08:10:00Z",
                records: {
                    access_events_count: 18,
                    entities_touched: ["EvidencePackage", "IntegrityAlert"]
                }
            },
            escalation_path: [{
                level: 1,
                level_name: "Review Queue",
                timestamp: "2026-02-20T08:10:00Z",
                escalated_by: "system",
                rationale: "Human triage required; no automated action.",
                notified_parties: ["pilot.reviewer@example.test"],
                access_granted_until: "2026-03-06T00:00:00Z"
            }],
            external_case_id: "",
            mandatory_reporting_triggered: false,
            mandatory_reporting_details: {},
            confidential: true
        };

        // Compute evidence_hash
        const evidenceHash = await sha256Hex(stableStringify({
            signal_summary: integrityAlertPayload.signal_summary,
            detection_timestamp: integrityAlertPayload.detection_timestamp,
            evidence_snapshot: integrityAlertPayload.evidence_snapshot,
            signal_details: integrityAlertPayload.signal_details,
        }));

        const createdAlert = await db.IntegrityAlert.create({
            ...integrityAlertPayload,
            evidence_hash: `SHA256:${evidenceHash}`,
        });

        // 2) WhistleblowerTip seed (linked to alert)
        const tipPayload = {
            tip_id: "TIP-PILOT-0001",
            submission_method: "web_form",
            submission_timestamp: "2026-02-20T08:12:00Z",
            anonymous: true,
            submitter_email: "",
            submitter_phone: "",
            category: "safety_violation",
            summary: "Concern about repeated bypass of a documented safety step in a routine process.",
            detailed_description: "Pilot-safe: compliance concern only; no real names; requests review of workflow adherence.",
            individuals_involved: [{
                name: "Person A (pseudonym)",
                role: "staff",
                department: "operations"
            }],
            incident_date: "2026-02-18",
            incident_location: "operations",
            attachments: [],
            witness_information: "Potential witnesses exist; follow standard protocol.",
            status: "new",
            priority: "medium",
            credibility_assessment: {
                overall_score: 55,
                specificity_score: 60,
                corroboration_potential: 70,
                consistency_check: "consistent",
                red_flags: [],
                green_flags: ["specific incident date", "clear category", "compliance-verifiable"],
                assessment_notes: "Automated triage only; not a conclusion.",
                assessed_by: "system",
                assessed_date: "2026-02-20T08:13:00Z"
            },
            conflict_check: {
                submitter_under_investigation: false,
                related_alerts: [],
                potential_retaliation_claim: false,
                conflict_notes: ""
            },
            external_review_status: "not_required",
            external_reviewer_id: "",
            external_review_outcome: {},
            assigned_to: "pilot.reviewer@example.test",
            conflict_of_interest_flag: false,
            routed_to_external: false,
            external_case_reference: "",
            follow_up_notes: [],
            employee_feedback_requested: false,
            employee_feedback: [],
            retention_policy: {
                retention_category: "standard_7yr",
                destruction_date: "2033-02-20",
                legal_hold_reason: "",
                retention_notes: "Pilot default"
            },
            confidential: true,
            anti_retaliation_notice_acknowledged: true
        };

        const createdTip = await db.WhistleblowerTip.create({
            ...tipPayload,
            related_alert_id: createdAlert.id,
        });

        // 3) EvidencePackage seed (linked to alert)
        const pkgCreatedTimestamp = "2026-02-20T08:15:00Z";
        const pkgCreatedBy = "pilot.reviewer@example.test";

        const eventTimeline = [
            {
                timestamp_utc: integrityAlertPayload.detection_timestamp,
                actor_id: "system",
                entity_type: "IntegrityAlert",
                entity_id: createdAlert.id,
                action: "created",
                metadata: { alert_type: createdAlert.alert_type, severity: createdAlert.severity },
            },
            {
                timestamp_utc: pkgCreatedTimestamp,
                actor_id: pkgCreatedBy,
                entity_type: "EvidencePackage",
                entity_id: "EP-PILOT-0001",
                action: "generated",
                metadata: { purpose: "pilot_forensic_snapshot", no_external_transfer: true },
            },
        ];

        const rawRecords = [
            {
                record_id: createdAlert.id,
                record_type: "IntegrityAlert",
                record_data: {
                    alert_type: createdAlert.alert_type,
                    severity: createdAlert.severity,
                    status: createdAlert.status,
                    detection_timestamp: createdAlert.detection_timestamp,
                },
                record_hash: `SHA256:${await sha256Hex(stableStringify(createdAlert))}`,
                source_entity: "IntegrityAlert",
                captured_at: pkgCreatedTimestamp,
            },
            {
                record_id: createdTip.id,
                record_type: "WhistleblowerTip",
                record_data: {
                    tip_id: createdTip.tip_id,
                    category: createdTip.category,
                    submission_timestamp: createdTip.submission_timestamp,
                    status: createdTip.status,
                },
                record_hash: `SHA256:${await sha256Hex(stableStringify({
                    tip_id: createdTip.tip_id,
                    category: createdTip.category,
                    submission_timestamp: createdTip.submission_timestamp,
                    status: createdTip.status,
                }))}`,
                source_entity: "WhistleblowerTip",
                captured_at: pkgCreatedTimestamp,
            },
        ];

        const manifestHash = await sha256Hex(stableStringify({
            package_id: "EP-PILOT-0001",
            alert_id: createdAlert.id,
            created_timestamp: pkgCreatedTimestamp,
            event_timeline: eventTimeline,
            raw_records: rawRecords,
            file_hashes: [],
        }));

        const createdPackage = await db.EvidencePackage.create({
            package_id: "EP-PILOT-0001",
            alert_id: createdAlert.id,
            created_by: pkgCreatedBy,
            created_timestamp: pkgCreatedTimestamp,
            event_timeline: eventTimeline,
            raw_records: rawRecords,
            file_hashes: [],
            manifest_hash: `SHA256:${manifestHash}`,
            source_metadata: {
                system_name: "Base44",
                database_name: "pilot_org_001",
                entities_queried: ["IntegrityAlert", "WhistleblowerTip"],
                record_ids: [createdAlert.id, createdTip.id],
                queries_used: [
                    { entity: "IntegrityAlert", filter: { id: createdAlert.id }, timestamp: pkgCreatedTimestamp },
                    { entity: "WhistleblowerTip", filter: { id: createdTip.id }, timestamp: pkgCreatedTimestamp },
                ],
                extraction_timestamp: pkgCreatedTimestamp,
            },
            access_log: [{
                accessed_by: pkgCreatedBy,
                access_timestamp: pkgCreatedTimestamp,
                access_type: "viewed",
                ip_address: "",
                reason_for_access: "Pilot seed generation/validation",
            }],
            chain_of_custody: [],
            package_status: "active",
            sealed_timestamp: "",
            retention_until: "2033-02-20",
            confidential: true,
        });

        // 4) TalentInsight seed (independent)
        const talentPayload = {
            employee_email: "pilot.user002@example.test",
            employee_name: "Pilot User 002",
            profile_generated_date: "2026-02-20T08:25:00Z",
            skills_evidence: [{
                skill_name: "Preventive Maintenance Documentation",
                evidence_type: "tool_signoff",
                evidence_link: "pilot_ref:mt_closeout_002",
                date_achieved: "2026-02-18",
                verified_by: "pilot.reviewer@example.test"
            }],
            strength_profile: [
                { skill: "Reliability", rank: 1, evidence_count: 3, evidence_links: ["pilot_ref:a", "pilot_ref:b", "pilot_ref:c"] },
                { skill: "Attention to Detail", rank: 2, evidence_count: 2, evidence_links: ["pilot_ref:d", "pilot_ref:e"] },
                { skill: "Learning Velocity", rank: 3, evidence_count: 2, evidence_links: ["pilot_ref:f", "pilot_ref:g"] }
            ],
            skill_gap_analysis: [{
                target_skill: "Incident Documentation",
                current_level: "beginner",
                target_level: "intermediate",
                gap_severity: "low",
                business_justification: "Improves consistency of operational records; reduces rework during reviews.",
                evidence_of_need: "Occasional missing fields in closeouts during pilot."
            }],
            learning_path: {
                path_title: "Operations Documentation Track",
                estimated_duration_weeks: 6,
                milestones: [{
                    milestone_order: 1,
                    milestone_title: "Complete documentation checklist training",
                    target_completion_weeks: 2,
                    courses_recommended: ["pilot_course_001"],
                    practice_activities: ["Complete 3 closeouts using checklist"],
                    success_criteria: "3 consecutive closeouts with 100% required fields completed"
                }],
                stretch_projects: [{
                    project_title: "Draft a one-page SOP for closeouts",
                    skills_applied: ["Incident Documentation", "Process Clarity"],
                    estimated_duration_weeks: 2,
                    support_needed: "Reviewer feedback on first draft"
                }]
            },
            mentorship_recommendations: [{
                mentor_profile_needed: "Senior ops staff familiar with documentation standards",
                mentorship_focus: "Evidence-ready closeouts",
                interaction_frequency: "biweekly",
                duration_months: 2
            }],
            delivery_metrics: {
                task_completion_rate: 0.92,
                quality_checks_passed: 11,
                rework_rate: 0.06,
                period_start: "2026-02-01",
                period_end: "2026-02-20"
            },
            contribution_evidence: [{
                project_name: "Pilot Maintenance Workflow",
                outcome_documented: "Closed tasks with complete fields and consistent timestamps",
                date: "2026-02-18",
                contribution_type: "project_outcome",
                evidence_link: "pilot_ref:mt_closeout_002"
            }],
            growth_trend: {
                improvement_areas: [{
                    skill: "Documentation completeness",
                    baseline_date: "2026-02-05",
                    baseline_level: "inconsistent",
                    current_level: "consistent",
                    improvement_trajectory: "steady"
                }],
                curve_description: "Steady improvement over the pilot period, based on completeness checks."
            },
            mentorship_hours: 2.5,
            peer_kudos_received: [{
                from_peer: "Pilot Peer A (opt-in)",
                date: "2026-02-17",
                recognition_for: "Clear handoff notes",
                opted_in: true
            }],
            recommended_opportunities: [{
                opportunity_type: "training",
                title: "Evidence-ready documentation mini-module",
                rationale: "Low effort improvement with measurable reduction in rework.",
                expected_benefit: "Fewer clarification loops; faster review resolution."
            }],
            recognition_suggestions: [{
                recognition_type: "public_shoutout",
                reason: "Consistent closeouts during pilot window",
                evidence_basis: "delivery_metrics + evidence links"
            }],
            succession_bench_candidate: false,
            succession_roles_qualified: [],
            succession_readiness_evidence: [],
            generated_by: "system",
            reviewed_by: "pilot.reviewer@example.test",
            review_notes: "Pilot validation: evidence links present; development-focused; no prohibited attributes.",
            visible_to_roles: ["admin", "leadership"]
        };

        const createdTalent = await db.TalentInsight.create(talentPayload);

        return Response.json({
            success: true,
            message: "Pilot seed data created successfully",
            created: {
                integrityAlert_id: createdAlert.id,
                whistleblowerTip_id: createdTip.id,
                evidencePackage_id: createdPackage.id,
                talentInsight_id: createdTalent.id,
            },
            custom_refs: {
                tip_id: createdTip.tip_id,
                package_id: createdPackage.package_id,
            },
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});