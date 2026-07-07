import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

const INTEGRITY_MONITOR_SYSTEM_PROMPT = `You output JSON only. Do not accuse individuals. Do not infer motives. Describe observable patterns and policy mismatches. Cite evidence IDs and timestamps.

Your role: Analyze system events and detect integrity signals based on objective, documented patterns.

Rules:
1. Output ONLY valid JSON matching the provided schema
2. Use descriptive language for patterns, not accusations (e.g., "approval bypassed" not "John committed fraud")
3. Never attribute motive (e.g., avoid "intentional", "malicious", "dishonest")
4. Cite specific evidence_ids and timestamps from input data
5. If insufficient evidence exists, return empty signals array
6. Categorize signals by type: financial_anomaly, approval_mismatch, vendor_change, complaint_cluster, time_pattern, access_pattern, policy_deviation
7. Assess confidence: low, medium, high, critical (based on corroboration strength)
8. Provide evidence_summary linking back to source record IDs

Output JSON Schema:
{
  "signals": [
    {
      "signal_type": "FIN_APPROVAL_BYPASS|VENDOR_CHANGE_ANOMALY|DATA_EXPORT_SPIKE|INCIDENT_CLUSTER|RETALIATION_RISK",
      "severity": "low|medium|high",
      "confidence": 0.0,
      "pattern_summary": "non-accusatory, 1-2 sentences",
      "evidence_refs": ["EvidenceItem:id", "MaintenanceTask:id"],
      "recommended_next_step": "queue_review|request_more_docs|open_case|escalate_external|mandatory_report_route"
    }
  ],
  "analysis_timestamp": "ISO 8601 timestamp",
  "records_analyzed": 123,
  "signals_detected": 2
}`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { date_range_start, date_range_end, entity_types, limit } = await req.json();

    // Fetch relevant data (example: maintenance tasks, assets, user actions)
    const maintenanceTasks = await base44.asServiceRole.entities.MaintenanceTask.filter({
      created_date: { $gte: date_range_start, $lte: date_range_end }
    }, '-created_date', limit || 100);

    const assets = await base44.asServiceRole.entities.Asset.filter({
      updated_date: { $gte: date_range_start, $lte: date_range_end }
    }, '-updated_date', limit || 100);

    // Prepare structured input for LLM
    const inputData = {
      analysis_period: { start: date_range_start, end: date_range_end },
      maintenance_records: maintenanceTasks.map(task => ({
        record_id: task.id,
        asset_id: task.asset_id,
        status: task.status,
        assigned_to: task.assigned_to,
        scheduled_date: task.scheduled_date,
        completed_date: task.completed_date,
        parts_used: task.parts_used,
        actual_hours: task.actual_hours,
        estimated_hours: task.estimated_hours,
        timestamp: task.created_date
      })),
      asset_records: assets.map(asset => ({
        record_id: asset.id,
        asset_tag: asset.asset_tag,
        status: asset.status,
        assigned_to: asset.assigned_to,
        purchase_cost: asset.purchase_cost,
        location: asset.location_name,
        last_updated: asset.updated_date
      })),
      policies: [
        { id: "P001", name: "Dual approval required for expenses >$5000" },
        { id: "P002", name: "Asset status must be updated within 24h of maintenance" },
        { id: "P003", name: "Parts usage must be documented for all repairs" }
      ]
    };

    // Call LLM with structured prompt
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${INTEGRITY_MONITOR_SYSTEM_PROMPT}

Input Data:
${JSON.stringify(inputData, null, 2)}

Analyze the above data and detect integrity signals. Return JSON only.`,
      response_json_schema: {
        type: "object",
        properties: {
          signals: {
            type: "array",
            items: {
              type: "object",
              properties: {
                signal_type: { type: "string" },
                severity: { type: "string" },
                confidence: { type: "number" },
                pattern_summary: { type: "string" },
                evidence_refs: { type: "array", items: { type: "string" } },
                recommended_next_step: { type: "string" }
              }
            }
          },
          analysis_timestamp: { type: "string" },
          records_analyzed: { type: "integer" },
          signals_detected: { type: "integer" }
        }
      }
    });

    // Create IntegrityAlert records for each detected signal
    const alertsCreated = [];
    for (const signal of llmResponse.signals || []) {
      const escalationLevel = signal.recommended_next_step === 'mandatory_report_route' ? 4 :
                              signal.recommended_next_step === 'escalate_external' ? 3 :
                              signal.recommended_next_step === 'open_case' ? 2 :
                              signal.recommended_next_step === 'request_more_docs' ? 1 : 0;

      const alertData = {
        alert_type: signal.signal_type.toLowerCase(),
        severity: signal.severity,
        escalation_level: escalationLevel,
        escalation_level_rationale: `Confidence: ${signal.confidence.toFixed(2)}. Next step: ${signal.recommended_next_step}`,
        signal_summary: signal.pattern_summary,
        signal_details: {
          confidence: signal.confidence,
          evidence_refs: signal.evidence_refs,
          recommended_next_step: signal.recommended_next_step
        },
        detection_method: 'AI analysis (narrative-free, no motive attribution)',
        detection_timestamp: new Date().toISOString(),
        status: 'new'
      };

      const created = await base44.asServiceRole.entities.IntegrityAlert.create(alertData);
      alertsCreated.push(created);
    }

    return Response.json({
      success: true,
      analysis_timestamp: llmResponse.analysis_timestamp,
      records_analyzed: llmResponse.records_analyzed,
      signals_detected: llmResponse.signals_detected,
      alerts_created: alertsCreated.length,
      alert_ids: alertsCreated.map(a => a.id)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});