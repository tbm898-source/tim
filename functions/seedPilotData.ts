import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Deterministic seed data for pilot testing
        const integrityAlert = {
            alert_type: "access_pattern",
            severity: "medium",
            escalation_level: 1,
            escalation_level_rationale: "Pattern matched rule: increased access activity over baseline; requires human review. No intent inferred.",
            associated_users: ["pilot.user001@example.test"],
            status: "new",
            signal_summary: "Access activity deviated from baseline over the last 24 hours (frequency increase and unusual sequence).",
            signal_details: {
                transaction_ids: [],
                entity_type: "EvidencePackage",
                entity_ids: ["EP-PILOT-0001"],
                date_range: {
                    start: "2026-02-19T08:10:00Z",
                    end: "2026-02-20T08:10:00Z"
                },
                metadata: {
                    baseline_window_days: 14,
                    observed_access_events: 18,
                    baseline_access_events: 4,
                    notes: "Objective metrics only. No narrative added."
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
            evidence_hash: "SHA256:9a9e1c1c0d0f0b7a2d3d8d4f1e2c5f6a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e",
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
                rationale: "Requires human triage for context; no automated action.",
                notified_parties: ["pilot.reviewer@example.test"],
                access_granted_until: "2026-03-06T00:00:00Z"
            }],
            external_case_id: "",
            mandatory_reporting_triggered: false,
            mandatory_reporting_details: {},
            confidential: true
        };

        const whistleblowerTip = {
            tip_id: "TIP-PILOT-0001",
            submission_method: "web_form",
            submission_timestamp: "2026-02-20T08:12:00Z",
            anonymous: true,
            submitter_email: "",
            submitter_phone: "",
            category: "safety_violation",
            summary: "Concern about repeated bypass of a documented safety step in a routine process.",
            detailed_description: "Pilot-safe description: A safety step appears to have been skipped in multiple instances. This report contains no names and requests review of workflow compliance.",
            individuals_involved: [{
                name: "Person A (pseudonym)",
                role: "staff",
                department: "operations"
            }],
            incident_date: "2026-02-18",
            incident_location: "operations",
            attachments: [],
            witness_information: "Potential witnesses exist; request reviewer follow standard interview protocol.",
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
            related_alert_id: "",
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

        const evidencePackage = {
            package_id: "EP-PILOT-0001",
            alert_id: "IA-PILOT-0001",
            created_by: "pilot.reviewer@example.test",
            created_timestamp: "2026-02-20T08:15:00Z",
            event_timeline: [{
                timestamp_utc: "2026-02-20T08:10:00Z",
                actor_id: "system",
                entity_type: "IntegrityAlert",
                entity_id: "IA-PILOT-0001",
                action: "created",
                metadata: {
                    alert_type: "access_pattern",
                    severity: "medium"
                }
            }, {
                timestamp_utc: "2026-02-20T08:15:00Z",
                actor_id: "pilot.reviewer@example.test",
                entity_type: "EvidencePackage",
                entity_id: "EP-PILOT-0001",
                action: "generated",
                metadata: {
                    purpose: "pilot_forensic_snapshot",
                    no_external_transfer: true
                }
            }],
            raw_records: [{
                record_id: "IA-PILOT-0001",
                record_type: "IntegrityAlert",
                record_data: {
                    alert_type: "access_pattern",
                    severity: "medium",
                    status: "new",
                    detection_timestamp: "2026-02-20T08:10:00Z"
                },
                record_hash: "SHA256:0f1e2d3c4b5a69788796a5b4c3d2e1f00112233445566778899aabbccddeeff0",
                source_entity: "IntegrityAlert",
                captured_at: "2026-02-20T08:15:00Z"
            }],
            file_hashes: [],
            manifest_hash: "SHA256:1111111111111111111111111111111111111111111111111111111111111111",
            source_metadata: {
                system_name: "Base44",
                database_name: "pilot_org_001",
                entities_queried: ["IntegrityAlert"],
                record_ids: ["IA-PILOT-0001"],
                queries_used: [{
                    entity: "IntegrityAlert",
                    filter: { id: "IA-PILOT-0001" },
                    timestamp: "2026-02-20T08:15:00Z"
                }],
                extraction_timestamp: "2026-02-20T08:15:00Z"
            },
            access_log: [{
                accessed_by: "pilot.reviewer@example.test",
                access_timestamp: "2026-02-20T08:15:00Z",
                access_type: "viewed",
                ip_address: "",
                reason_for_access: "Pilot evidence package generation and validation"
            }],
            chain_of_custody: [],
            package_status: "active",
            sealed_timestamp: "",
            retention_until: "2033-02-20",
            confidential: true
        };

        const talentInsight = {
            employee_email: "pilot.user002@example.test",
            employee_name: "Pilot User 002",
            profile_generated_date: "2026-02-20T08:25:00Z",
            skills_evidence: [{
                skill_name: "Preventive Maintenance Documentation",
                evidence_type: "tool_signoff",
                evidence_link: "mt_002",
                date_achieved: "2026-02-18",
                verified_by: "pilot.reviewer@example.test"
            }],
            strength_profile: [{
                skill: "Reliability",
                rank: 1,
                evidence_count: 3,
                evidence_links: ["mt_002", "prog_002", "sub_002"]
            }, {
                skill: "Attention to Detail",
                rank: 2,
                evidence_count: 2,
                evidence_links: ["mt_002", "qc_001"]
            }, {
                skill: "Learning Velocity",
                rank: 3,
                evidence_count: 2,
                evidence_links: ["prog_002", "quiz_001"]
            }],
            skill_gap_analysis: [{
                target_skill: "Incident Documentation",
                current_level: "beginner",
                target_level: "intermediate",
                gap_severity: "low",
                business_justification: "Improves consistency of operational records; reduces rework during reviews.",
                evidence_of_need: "Occasional missing fields in task closeouts during pilot."
            }],
            learning_path: {
                path_title: "Operations Documentation Track",
                estimated_duration_weeks: 6,
                milestones: [{
                    milestone_order: 1,
                    milestone_title: "Complete documentation checklist training",
                    target_completion_weeks: 2,
                    courses_recommended: ["course_001"],
                    practice_activities: ["Complete 3 maintenance closeouts using checklist"],
                    success_criteria: "3 consecutive closeouts with 100% required fields completed"
                }],
                stretch_projects: [{
                    project_title: "Create a one-page SOP draft for maintenance closeout",
                    skills_applied: ["Incident Documentation", "Process Clarity"],
                    estimated_duration_weeks: 2,
                    support_needed: "Reviewer feedback on first draft"
                }]
            },
            mentorship_recommendations: [{
                mentor_profile_needed: "Senior operations staff familiar with documentation standards",
                mentorship_focus: "High-quality closeouts and evidence-ready notes",
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
                evidence_link: "mt_002"
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
                reason: "Consistently complete closeouts during pilot window",
                evidence_basis: "mt_002 + delivery_metrics"
            }],
            succession_bench_candidate: false,
            succession_roles_qualified: [],
            succession_readiness_evidence: [],
            generated_by: "system",
            reviewed_by: "pilot.reviewer@example.test",
            review_notes: "Pilot validation: evidence links present; no prohibited attributes; development-focused.",
            visible_to_roles: ["admin", "leadership"]
        };

        // Insert records using service role
        const alertResult = await base44.asServiceRole.entities.IntegrityAlert.create(integrityAlert);
        const tipResult = await base44.asServiceRole.entities.WhistleblowerTip.create(whistleblowerTip);
        const packageResult = await base44.asServiceRole.entities.EvidencePackage.create(evidencePackage);
        const insightResult = await base44.asServiceRole.entities.TalentInsight.create(talentInsight);

        return Response.json({
            success: true,
            message: "Pilot seed data created successfully",
            ids: {
                integrity_alert_id: alertResult.id,
                whistleblower_tip_id: tipResult.id,
                evidence_package_id: packageResult.id,
                talent_insight_id: insightResult.id
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});