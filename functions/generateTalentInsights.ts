import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const TALENT_INSIGHTS_SYSTEM_PROMPT = `You output JSON only. Use documented evidence only (training completions, project outcomes, peer kudos where opt-in). Do not rank humans as "worth." Provide development-oriented suggestions.

Your role: Analyze employee development data and generate evidence-based talent insights with proactive skill gap analysis and personalized learning paths.

Rules:
1. Output ONLY valid JSON matching the provided schema
2. Use evidence-based descriptions (cite training completions, project records, documented outcomes)
3. Never rank or score humans by "worth" or "value" - focus on skills and growth opportunities
4. Provide development-oriented suggestions (training, mentorship, stretch projects)
5. Only include peer kudos if explicitly marked as opt-in
6. Focus on improvement trajectory, not raw performance comparisons
7. Succession readiness must cite specific evidence and gaps, never a single score
8. All recommendations must be actionable and specific
9. Perform proactive skill gap analysis by comparing current skills against industry standards and organizational needs
10. Generate sequenced learning paths with clear milestones and timeframes
11. Suggest mentorship pairings based on complementary skill profiles
12. Recommend stretch projects that align with career growth aspirations

Output JSON Schema:
{
  "employee_email": "email@example.com",
  "employee_name": "Full Name",
  "profile_generated_date": "ISO 8601 timestamp",
  "skills_evidence": [
    {
      "skill_name": "Skill name",
      "evidence_type": "training_completion|certification|tool_signoff|project_delivery",
      "evidence_link": "record_id or URL",
      "date_achieved": "YYYY-MM-DD",
      "verified_by": "email or system"
    }
  ],
  "strength_profile": [
    {
      "skill": "Top skill name",
      "rank": 1,
      "evidence_count": 3,
      "evidence_links": ["record_id_1", "record_id_2"]
    }
  ],
  "growth_trend": {
    "improvement_areas": [
      {
        "skill": "Skill name",
        "baseline_date": "YYYY-MM-DD",
        "baseline_level": "Beginner|Intermediate|Advanced",
        "current_level": "Intermediate|Advanced|Expert",
        "improvement_trajectory": "accelerating|steady|plateaued"
      }
    ],
    "curve_description": "Narrative of improvement trend"
  },
  "skill_gap_analysis": [
    {
      "target_skill": "Skill needed for growth",
      "current_level": "none|beginner|intermediate|advanced",
      "target_level": "intermediate|advanced|expert",
      "gap_severity": "low|medium|high",
      "business_justification": "Why this skill matters to the organization",
      "evidence_of_need": "Cite projects/roles where this skill is required"
    }
  ],
  "learning_path": {
    "path_title": "Personalized Learning Path Title",
    "estimated_duration_weeks": 12,
    "milestones": [
      {
        "milestone_order": 1,
        "milestone_title": "Foundation skills",
        "target_completion_weeks": 4,
        "courses_recommended": ["Course 1", "Course 2"],
        "practice_activities": ["Activity 1", "Activity 2"],
        "success_criteria": "What competency to demonstrate"
      }
    ],
    "stretch_projects": [
      {
        "project_title": "Real-world project title",
        "skills_applied": ["Skill 1", "Skill 2"],
        "estimated_duration_weeks": 6,
        "support_needed": "What resources/mentorship needed"
      }
    ]
  },
  "mentorship_recommendations": [
    {
      "mentor_profile_needed": "Skills/experience the mentor should have",
      "mentorship_focus": "What to learn from mentor",
      "interaction_frequency": "weekly|biweekly|monthly",
      "duration_months": 3
    }
  ],
  "recommended_opportunities": [
    {
      "opportunity_type": "training|stretch_project|mentorship_pairing|leadership_track",
      "title": "Specific opportunity title",
      "rationale": "Why this opportunity fits",
      "expected_benefit": "What they will gain"
    }
  ],
  "recognition_suggestions": [
    {
      "recognition_type": "public_shoutout|small_stipend|leadership_opportunity|conference_attendance",
      "reason": "Specific achievement or contribution",
      "evidence_basis": "Cite the documented evidence"
    }
  ],
  "succession_bench_candidate": true,
  "succession_roles_qualified": ["Role 1", "Role 2"],
  "succession_readiness_evidence": [
    {
      "role": "Target role",
      "evidence_points": ["Evidence 1", "Evidence 2"],
      "gaps_to_address": ["Gap 1", "Gap 2"]
    }
  ]
}`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin' && user?.role !== 'leadership') {
      return Response.json({ error: 'Forbidden: Leadership access required' }, { status: 403 });
    }

    const { employee_email } = await req.json();

    if (!employee_email) {
      return Response.json({ error: 'employee_email is required' }, { status: 400 });
    }

    // Fetch employee data
    const [employeeUser] = await base44.asServiceRole.entities.User.filter({ email: employee_email });
    if (!employeeUser) {
      return Response.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Fetch training/learning progress
    const userProgress = await base44.asServiceRole.entities.UserProgress.filter({
      user_id: employeeUser.id
    }, '-created_date', 100);

    const enrollments = await base44.asServiceRole.entities.Enrollment.filter({
      student_id: employeeUser.id
    }, '-created_date', 50);

    // Fetch maintenance tasks (as proxy for project delivery)
    const maintenanceTasks = await base44.asServiceRole.entities.MaintenanceTask.filter({
      assigned_to: employee_email
    }, '-created_date', 50);

    // Prepare structured input for LLM
    const inputData = {
      employee: {
        email: employeeUser.email,
        name: employeeUser.full_name,
        role: employeeUser.role
      },
      training_records: userProgress.map(p => ({
        record_id: p.id,
        lesson_id: p.lesson_id,
        completed: p.completed,
        completion_date: p.completion_date,
        quiz_score: p.quiz_score,
        time_spent_seconds: p.time_spent_seconds
      })),
      enrollment_records: enrollments.map(e => ({
        record_id: e.id,
        course_id: e.course_id,
        status: e.status,
        enrollment_date: e.enrollment_date,
        completion_date: e.completion_date,
        final_grade: e.final_grade
      })),
      project_delivery: maintenanceTasks.map(t => ({
        record_id: t.id,
        title: t.title,
        status: t.status,
        completed_date: t.completed_date,
        actual_hours: t.actual_hours,
        estimated_hours: t.estimated_hours
      })),
      available_opportunities: [
        { type: "training", title: "Advanced Safety Certification" },
        { type: "stretch_project", title: "Lead facility upgrade project" },
        { type: "mentorship_pairing", title: "Mentor new technicians" },
        { type: "leadership_track", title: "Supervisor development program" }
      ]
    };

    // Call LLM with structured prompt
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${TALENT_INSIGHTS_SYSTEM_PROMPT}

Input Data:
${JSON.stringify(inputData, null, 2)}

Analyze the above data and generate talent insights. Return JSON only.`,
      response_json_schema: {
        type: "object",
        properties: {
          employee_email: { type: "string" },
          employee_name: { type: "string" },
          profile_generated_date: { type: "string" },
          skills_evidence: {
            type: "array",
            items: {
              type: "object",
              properties: {
                skill_name: { type: "string" },
                evidence_type: { type: "string" },
                evidence_link: { type: "string" },
                date_achieved: { type: "string" },
                verified_by: { type: "string" }
              }
            }
          },
          strength_profile: {
            type: "array",
            items: {
              type: "object",
              properties: {
                skill: { type: "string" },
                rank: { type: "integer" },
                evidence_count: { type: "integer" },
                evidence_links: { type: "array", items: { type: "string" } }
              }
            }
          },
          growth_trend: {
            type: "object",
            properties: {
              improvement_areas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    skill: { type: "string" },
                    baseline_date: { type: "string" },
                    baseline_level: { type: "string" },
                    current_level: { type: "string" },
                    improvement_trajectory: { type: "string" }
                  }
                }
              },
              curve_description: { type: "string" }
            }
          },
          skill_gap_analysis: {
            type: "array",
            items: {
              type: "object",
              properties: {
                target_skill: { type: "string" },
                current_level: { type: "string" },
                target_level: { type: "string" },
                gap_severity: { type: "string" },
                business_justification: { type: "string" },
                evidence_of_need: { type: "string" }
              }
            }
          },
          learning_path: {
            type: "object",
            properties: {
              path_title: { type: "string" },
              estimated_duration_weeks: { type: "integer" },
              milestones: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    milestone_order: { type: "integer" },
                    milestone_title: { type: "string" },
                    target_completion_weeks: { type: "integer" },
                    courses_recommended: { type: "array", items: { type: "string" } },
                    practice_activities: { type: "array", items: { type: "string" } },
                    success_criteria: { type: "string" }
                  }
                }
              },
              stretch_projects: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    project_title: { type: "string" },
                    skills_applied: { type: "array", items: { type: "string" } },
                    estimated_duration_weeks: { type: "integer" },
                    support_needed: { type: "string" }
                  }
                }
              }
            }
          },
          mentorship_recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                mentor_profile_needed: { type: "string" },
                mentorship_focus: { type: "string" },
                interaction_frequency: { type: "string" },
                duration_months: { type: "integer" }
              }
            }
          },
          recommended_opportunities: {
            type: "array",
            items: {
              type: "object",
              properties: {
                opportunity_type: { type: "string" },
                title: { type: "string" },
                rationale: { type: "string" },
                expected_benefit: { type: "string" }
              }
            }
          },
          recognition_suggestions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                recognition_type: { type: "string" },
                reason: { type: "string" },
                evidence_basis: { type: "string" }
              }
            }
          },
          succession_bench_candidate: { type: "boolean" },
          succession_roles_qualified: { type: "array", items: { type: "string" } },
          succession_readiness_evidence: {
            type: "array",
            items: {
              type: "object",
              properties: {
                role: { type: "string" },
                evidence_points: { type: "array", items: { type: "string" } },
                gaps_to_address: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      }
    });

    // Create TalentInsight record
    const insightData = {
      employee_email: llmResponse.employee_email,
      employee_name: llmResponse.employee_name,
      profile_generated_date: llmResponse.profile_generated_date || new Date().toISOString(),
      skills_evidence: llmResponse.skills_evidence,
      strength_profile: llmResponse.strength_profile,
      growth_trend: llmResponse.growth_trend,
      skill_gap_analysis: llmResponse.skill_gap_analysis,
      learning_path: llmResponse.learning_path,
      mentorship_recommendations: llmResponse.mentorship_recommendations,
      recommended_opportunities: llmResponse.recommended_opportunities,
      recognition_suggestions: llmResponse.recognition_suggestions,
      succession_bench_candidate: llmResponse.succession_bench_candidate || false,
      succession_roles_qualified: llmResponse.succession_roles_qualified,
      succession_readiness_evidence: llmResponse.succession_readiness_evidence,
      generated_by: 'AI analysis (evidence-based, skill gap + learning path)',
      visible_to_roles: ['admin', 'leadership']
    };

    const created = await base44.asServiceRole.entities.TalentInsight.create(insightData);

    return Response.json({
      success: true,
      insight_id: created.id,
      employee_email: created.employee_email,
      employee_name: created.employee_name,
      strengths_identified: created.strength_profile?.length || 0,
      skill_gaps_identified: created.skill_gap_analysis?.length || 0,
      learning_milestones: created.learning_path?.milestones?.length || 0,
      stretch_projects: created.learning_path?.stretch_projects?.length || 0,
      mentorship_recommendations: created.mentorship_recommendations?.length || 0,
      opportunities_suggested: created.recommended_opportunities?.length || 0
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});