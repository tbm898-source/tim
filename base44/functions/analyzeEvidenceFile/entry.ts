import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

const EVIDENCE_ANALYSIS_PROMPT = `You are an evidence analysis system. Output JSON only.

Your role: Analyze evidence files (documents, logs, images) for integrity investigations. Extract facts, summarize neutrally, and flag PII.

Rules:
1. Output ONLY valid JSON matching the provided schema
2. Use neutral, non-accusatory language (describe observations, not motives)
3. Extract structured facts: dates, amounts, entities, actions
4. Summarize narrative content in 2-3 sentences maximum
5. Flag ALL potential PII: names, emails, phone numbers, addresses, SSNs, account numbers
6. Identify risk indicators: policy violations, approval gaps, unusual patterns
7. Never make conclusions about guilt or intent
8. If document is illegible or corrupted, note this in quality_flags

Output JSON Schema:
{
  "document_type": "email|pdf|spreadsheet|image|log|form|other",
  "extracted_facts": [
    {
      "fact_type": "date|amount|entity_name|transaction_id|approval_status|location",
      "value": "extracted value",
      "context": "brief context"
    }
  ],
  "narrative_summary": "Neutral 2-3 sentence summary of document content",
  "pii_detected": [
    {
      "pii_type": "name|email|phone|address|ssn|account_number|other",
      "value_redacted": "[REDACTED]",
      "location_in_doc": "page/section reference",
      "confidence": 0.0
    }
  ],
  "risk_indicators": [
    {
      "indicator_type": "policy_violation|approval_gap|timing_anomaly|data_inconsistency|other",
      "description": "what was observed",
      "severity": "low|medium|high"
    }
  ],
  "quality_flags": [
    "illegible|partial_corruption|missing_metadata|unclear_source|timestamp_missing"
  ],
  "recommended_actions": [
    "redact_pii|request_additional_docs|cross_reference_records|escalate_review"
  ]
}`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Authorization: admin, compliance_officer, or integrity_reviewer roles
    const authorizedRoles = ['admin', 'compliance_officer', 'integrity_reviewer'];
    if (!user || !authorizedRoles.includes(user.role)) {
      return Response.json({ error: 'Forbidden: Authorized reviewer access required' }, { status: 403 });
    }

    const { file_url, context_type, context_id, analyst_notes } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    if (!context_type || !['whistleblower_tip', 'integrity_alert', 'evidence_package'].includes(context_type)) {
      return Response.json({ error: 'context_type must be whistleblower_tip, integrity_alert, or evidence_package' }, { status: 400 });
    }

    // Call LLM with file analysis
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${EVIDENCE_ANALYSIS_PROMPT}

Context: This file is evidence for ${context_type} ID: ${context_id}
${analyst_notes ? `Analyst notes: ${analyst_notes}` : ''}

Analyze the attached file and return structured JSON.`,
      file_urls: [file_url],
      response_json_schema: {
        type: "object",
        properties: {
          document_type: { type: "string" },
          extracted_facts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                fact_type: { type: "string" },
                value: { type: "string" },
                context: { type: "string" }
              }
            }
          },
          narrative_summary: { type: "string" },
          pii_detected: {
            type: "array",
            items: {
              type: "object",
              properties: {
                pii_type: { type: "string" },
                value_redacted: { type: "string" },
                location_in_doc: { type: "string" },
                confidence: { type: "number" }
              }
            }
          },
          risk_indicators: {
            type: "array",
            items: {
              type: "object",
              properties: {
                indicator_type: { type: "string" },
                description: { type: "string" },
                severity: { type: "string" }
              }
            }
          },
          quality_flags: {
            type: "array",
            items: { type: "string" }
          },
          recommended_actions: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    });

    // Create EvidencePackage record to store analysis
    const packageData = {
      package_id: `ANALYSIS_${context_type.toUpperCase()}_${context_id}_${Date.now()}`,
      created_timestamp: new Date().toISOString(),
      event_timeline: [{
        timestamp_utc: new Date().toISOString(),
        actor_id: user.email,
        entity_type: 'evidence_analysis',
        entity_id: file_url,
        action: 'ai_analysis_completed',
        metadata: {
          document_type: llmResponse.document_type,
          facts_extracted: llmResponse.extracted_facts?.length || 0,
          pii_flagged: llmResponse.pii_detected?.length || 0,
          risk_indicators: llmResponse.risk_indicators?.length || 0
        }
      }],
      raw_records: [{
        record_id: `analysis_${Date.now()}`,
        record_type: 'ai_evidence_analysis',
        record_data: {
          file_url,
          context_type,
          context_id,
          analysis: llmResponse,
          analyzed_by: user.email,
          analysis_timestamp: new Date().toISOString()
        },
        source_entity: context_type,
        captured_at: new Date().toISOString()
      }],
      file_hashes: [],
      manifest_hash: `temp_${Date.now()}`,
      source_metadata: {
        system_name: 'Evidence Analysis AI',
        extraction_timestamp: new Date().toISOString(),
        context_type,
        context_id,
        analyzed_file: file_url
      },
      access_log: [{
        accessed_by: user.email,
        access_timestamp: new Date().toISOString(),
        access_type: 'ai_analysis',
        reason_for_access: 'Initial evidence file analysis'
      }],
      package_status: 'active',
      confidential: true
    };

    const evidencePackage = await base44.asServiceRole.entities.EvidencePackage.create(packageData);

    // Return analysis result
    return Response.json({
      success: true,
      analysis_id: evidencePackage.id,
      package_id: packageData.package_id,
      file_url,
      context_type,
      context_id,
      document_type: llmResponse.document_type,
      facts_extracted: llmResponse.extracted_facts?.length || 0,
      pii_flags: llmResponse.pii_detected?.length || 0,
      pii_requires_redaction: (llmResponse.pii_detected?.length || 0) > 0,
      risk_indicators: llmResponse.risk_indicators?.length || 0,
      analysis: {
        extracted_facts: llmResponse.extracted_facts,
        narrative_summary: llmResponse.narrative_summary,
        pii_detected: llmResponse.pii_detected,
        risk_indicators: llmResponse.risk_indicators,
        quality_flags: llmResponse.quality_flags,
        recommended_actions: llmResponse.recommended_actions
      },
      next_steps: llmResponse.pii_detected?.length > 0 
        ? 'PII detected - manual review and redaction required before sharing'
        : 'Analysis complete - available for authorized review'
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});