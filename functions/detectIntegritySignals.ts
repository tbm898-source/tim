import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
      "signal_type": "financial_anomaly|approval_mismatch|vendor_change|complaint_cluster|time_pattern|access_pattern|policy_deviation",
      "severity": "low|medium|high|critical",
      "confidence": "low|medium|high",
      "pattern_description": "Objective description of what was observed",
      "policy_reference": "Policy or control that was not followed",
      "evidence_ids": ["record_id_1", "record_id_2"],
      "timestamps": ["2026-01-15T14:30:00Z", "2026-01-20T09:15:00Z"],
      "associated_entities": ["entity_type:entity_id"],
      "evidence_summary": "Brief summary tying evidence together",
      "recommended_escalation_level": 0-4,
      "corroborating_signals": ["signal_id_1", "signal_id_2"]
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
                confidence: { type: "string" },
                pattern_description: { type: "string" },
                policy_reference: { type: "string" },
                evidence_ids: { type: "array", items: { type: "string" } },
                timestamps: { type: "array", items: { type: "string" } },
                associated_entities: { type: "array", items: { type: "string" } },
                evidence_summary: { type: "string" },
                recommended_escalation_level: { type: "integer" },
                corroborating_signals: { type: "array", items: { type: "string" } }
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
      const alertData = {
        alert_type: signal.signal_type,
        severity: signal.severity,
        escalation_level: signal.recommended_escalation_level || 0,
        escalation_level_rationale: `Confidence: ${signal.confidence}. ${signal.evidence_summary}`,
        signal_summary: signal.pattern_description,
        signal_details: {
          policy_reference: signal.policy_reference,
          evidence_ids: signal.evidence_ids,
          timestamps: signal.timestamps,
          associated_entities: signal.associated_entities
        },
        detection_method: 'AI analysis (narrative-free)',
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