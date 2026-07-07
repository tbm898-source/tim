import { createClientFromRequest } from 'npm:@base44/sdk@0.8.35';

/**
 * Credibility Assessment for Whistleblower Tips
 * PURPOSE: Initial triage to identify claims requiring immediate attention vs. those needing more information
 * NOT USED FOR: Discrimination, dismissing valid claims, or punishing whistleblowers
 * OUTPUT: Flags for routing (external review, immediate escalation, clarification needed)
 */

const CREDIBILITY_ASSESSMENT_PROMPT = `You are a neutral whistleblower tip triage system. Your goal is to assess the SPECIFICITY and VERIFIABILITY of a claim, NOT to judge its truth or the whistleblower's character.

CRITICAL RULES:
1. You output ONLY valid JSON matching the provided schema
2. HIGH credibility scores indicate: specific details, named witnesses, documentary evidence, clear timeline
3. LOW credibility scores indicate: vague claims, no specifics, no way to verify, contradictory information
4. NEVER assume a low score means false - it means "needs clarification or more information"
5. Flag potential conflicts of interest (claim against someone investigating the submitter)
6. Identify red flags (vague, no evidence) AND green flags (specific, verifiable, corroborated)
7. Be objective and evidence-focused

Your assessment helps route tips appropriately:
- High specificity + corroboration potential → Direct to internal investigation
- Low specificity but serious allegations → External review for unbiased assessment
- Potential retaliation claim → Automatic external review
- Specific, documented, urgent → Immediate escalation

JSON Schema:
{
  "overall_score": 0-100 (higher = more specific and verifiable),
  "specificity_score": 0-100 (how specific are the details?),
  "corroboration_potential": 0-100 (can this be verified?),
  "consistency_check": "consistent|minor_inconsistencies|major_inconsistencies",
  "red_flags": ["array of concerns like 'no specific dates', 'extremely vague description'"],
  "green_flags": ["array of positives like 'specific dates provided', 'named witnesses', 'documentary evidence attached'"],
  "assessment_notes": "Objective summary of why this score was assigned",
  "routing_recommendation": "internal_investigation|external_review|immediate_escalation|clarification_needed"
}`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.role !== 'compliance') {
      return Response.json({ error: 'Forbidden: Admin or compliance access required' }, { status: 403 });
    }

    const { tip_id } = await req.json();

    if (!tip_id) {
      return Response.json({ error: 'tip_id is required' }, { status: 400 });
    }

    // Fetch the tip
    const [tip] = await base44.asServiceRole.entities.WhistleblowerTip.filter({ tip_id });

    if (!tip) {
      return Response.json({ error: 'Tip not found' }, { status: 404 });
    }

    // Cross-check against IntegrityAlerts to detect potential conflicts
    let conflictCheck = {
      submitter_under_investigation: false,
      related_alerts: [],
      potential_retaliation_claim: false,
      conflict_notes: ''
    };

    if (!tip.anonymous && tip.submitter_email) {
      const relatedAlerts = await base44.asServiceRole.entities.IntegrityAlert.filter({
        associated_users: tip.submitter_email
      });

      if (relatedAlerts.length > 0) {
        conflictCheck.submitter_under_investigation = true;
        conflictCheck.related_alerts = relatedAlerts.map(a => a.id);
        conflictCheck.potential_retaliation_claim = true;
        conflictCheck.conflict_notes = `Submitter is associated with ${relatedAlerts.length} existing integrity alert(s). Route to external review to avoid bias.`;
      }
    }

    // Prepare data for LLM assessment
    const tipData = {
      category: tip.category,
      summary: tip.summary,
      detailed_description: tip.detailed_description,
      individuals_involved: tip.individuals_involved,
      incident_date: tip.incident_date,
      incident_location: tip.incident_location,
      has_attachments: tip.attachments && tip.attachments.length > 0,
      witness_information: tip.witness_information,
      anonymous: tip.anonymous
    };

    // Invoke LLM for credibility assessment
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${CREDIBILITY_ASSESSMENT_PROMPT}\n\nAssess this whistleblower tip:\n${JSON.stringify(tipData, null, 2)}`,
      response_json_schema: {
        type: "object",
        properties: {
          overall_score: { type: "number" },
          specificity_score: { type: "number" },
          corroboration_potential: { type: "number" },
          consistency_check: { type: "string" },
          red_flags: { type: "array", items: { type: "string" } },
          green_flags: { type: "array", items: { type: "string" } },
          assessment_notes: { type: "string" },
          routing_recommendation: { type: "string" }
        }
      }
    });

    // Determine status based on assessment and conflict check
    let newStatus = 'credibility_review';
    let externalReviewStatus = 'not_required';

    if (conflictCheck.potential_retaliation_claim || tip.conflict_of_interest_flag) {
      newStatus = 'external_review';
      externalReviewStatus = 'pending_assignment';
    } else if (llmResponse.routing_recommendation === 'immediate_escalation') {
      newStatus = 'investigating';
    } else if (llmResponse.routing_recommendation === 'external_review') {
      newStatus = 'external_review';
      externalReviewStatus = 'pending_assignment';
    } else if (llmResponse.routing_recommendation === 'clarification_needed') {
      newStatus = 'credibility_review';
    }

    // Update the tip with assessment
    const updatedTip = await base44.asServiceRole.entities.WhistleblowerTip.update(tip.id, {
      status: newStatus,
      credibility_assessment: {
        overall_score: llmResponse.overall_score,
        specificity_score: llmResponse.specificity_score,
        corroboration_potential: llmResponse.corroboration_potential,
        consistency_check: llmResponse.consistency_check,
        red_flags: llmResponse.red_flags,
        green_flags: llmResponse.green_flags,
        assessment_notes: llmResponse.assessment_notes,
        assessed_by: 'AI Credibility Assessment System',
        assessed_date: new Date().toISOString()
      },
      conflict_check: conflictCheck,
      external_review_status: externalReviewStatus,
      priority: llmResponse.routing_recommendation === 'immediate_escalation' ? 'urgent' : tip.priority
    });

    return Response.json({
      success: true,
      tip_id: tip.tip_id,
      credibility_score: llmResponse.overall_score,
      routing_recommendation: llmResponse.routing_recommendation,
      conflict_detected: conflictCheck.potential_retaliation_claim,
      new_status: newStatus,
      assessment_summary: llmResponse.assessment_notes
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});