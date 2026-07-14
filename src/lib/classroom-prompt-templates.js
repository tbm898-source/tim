/**
 * Classroom announcement prompt templates for ChatGPT sidebar workflow.
 * Keep in sync with docs/teaching/classroom-prompt-kit.md
 */

export const POST_TYPES = [
  {
    id: 'lab_reminder',
    label: 'Lab reminder',
    description: 'Remind students about an upcoming lab session.',
    fields: [
      { key: 'day', label: 'Day', placeholder: 'Thursday', type: 'text' },
      { key: 'time', label: 'Time', placeholder: '9:00 AM', type: 'text' },
      { key: 'location', label: 'Location', placeholder: 'Shop Bay 2', type: 'text' },
      { key: 'gear', label: 'Safety gear / tools', placeholder: 'hard hat, safety glasses, work gloves', type: 'text' },
    ],
    template: (v) =>
      `I'm a solar construction technology instructor. Write a Google Classroom announcement reminding students that ${v.day} lab starts at ${v.time} in ${v.location}. They must bring ${v.gear}. Tone: clear, friendly, professional. Under 120 words. No emojis. Output only the announcement text I can paste into Classroom.`,
  },
  {
    id: 'assignment_due',
    label: 'Assignment due date',
    description: 'Announce an assignment deadline and submission details.',
    fields: [
      { key: 'assignmentName', label: 'Assignment name', placeholder: 'Module 3 wiring diagram', type: 'text' },
      { key: 'dueDate', label: 'Due date', placeholder: 'Friday, March 14', type: 'text' },
      { key: 'dueTime', label: 'Due time', placeholder: '11:59 PM', type: 'text' },
      { key: 'submitFormat', label: 'Submission format', placeholder: 'PDF upload in Classroom', type: 'text' },
    ],
    template: (v) =>
      `Draft a Google Classroom announcement: assignment "${v.assignmentName}" is due ${v.dueDate} at ${v.dueTime}. Include what to submit (${v.submitFormat}), where to submit (Classroom assignment), and that late work follows our syllabus policy. Appropriate for college/secondary students. Plain language. Output only the announcement body.`,
  },
  {
    id: 'week_ahead',
    label: 'Week ahead preview',
    description: 'Preview topics and lab schedule for the coming week.',
    fields: [
      { key: 'courseName', label: 'Course name', placeholder: 'Solar Construction Technology', type: 'text' },
      { key: 'topic1', label: 'Topic 1', placeholder: 'PV array mounting', type: 'text' },
      { key: 'topic2', label: 'Topic 2', placeholder: 'inverter wiring', type: 'text' },
      { key: 'labDay', label: 'Lab day', placeholder: 'Wednesday', type: 'text' },
    ],
    template: (v) =>
      `Write a short "week ahead" Google Classroom post for my ${v.courseName} class. Cover: topics we're covering (${v.topic1}, ${v.topic2}), lab day ${v.labDay}, and one thing students should review before class. Encouraging but not cheesy. Max 150 words. Output only the post text.`,
  },
  {
    id: 'after_class_recap',
    label: 'After-class recap',
    description: 'Summarize what was covered and what is due next.',
    fields: [
      { key: 'topic', label: 'Lesson topic', placeholder: 'string sizing and OCPD', type: 'text' },
      { key: 'officeHoursTime', label: 'Office hours (optional)', placeholder: 'Tuesdays 2–4 PM', type: 'text' },
    ],
    template: (v) => {
      const hours = v.officeHoursTime?.trim()
        ? ` and optional office hours ${v.officeHoursTime}`
        : '';
      return `Write a brief Google Classroom recap for today's lesson on ${v.topic}. Include: what we covered (3 bullets), what's due next${hours}. Student-friendly, inclusive language. Output only the announcement.`;
    },
  },
  {
    id: 'universal',
    label: 'Universal master',
    description: 'Flexible template for any announcement type.',
    fields: [
      { key: 'courseName', label: 'Course name', placeholder: 'Solar Construction Technology', type: 'text' },
      {
        key: 'audience',
        label: 'Audience',
        type: 'select',
        options: [
          { value: 'secondary', label: 'Secondary' },
          { value: 'college', label: 'College' },
          { value: 'mixed', label: 'Mixed' },
        ],
      },
      {
        key: 'purpose',
        label: 'Purpose',
        type: 'select',
        options: [
          { value: 'reminder', label: 'Reminder' },
          { value: 'due date', label: 'Due date' },
          { value: 'recap', label: 'Recap' },
          { value: 'policy', label: 'Policy' },
          { value: 'event', label: 'Event' },
          { value: 'other', label: 'Other' },
        ],
      },
      {
        key: 'facts',
        label: 'Key facts (one per line)',
        placeholder: 'Lab moved to Room 204\nBring safety glasses\nQuiz Friday',
        type: 'textarea',
      },
      { key: 'wordLimit', label: 'Word limit', placeholder: '120', type: 'text' },
    ],
    template: (v) => {
      const factLines = (v.facts || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `- ${line}`)
        .join('\n');
      const audienceLabel =
        v.audience === 'secondary' ? 'secondary' : v.audience === 'college' ? 'college' : 'mixed';
      return `You are helping me draft a Google Classroom announcement for ${v.courseName}.

Audience: ${audienceLabel}
Purpose: ${v.purpose}
Key facts I must include:
${factLines}

Constraints:
- Plain language, appropriate for students, inclusive tone
- No jokes at students' expense; no sensitive personal data
- No external signup links unless I listed them above
- Under ${v.wordLimit} words unless I need longer for clarity
- Output only the announcement body (no markdown fences, no subject line unless I asked)

Draft the announcement now.`;
    },
  },
];

const POST_TYPE_MAP = Object.fromEntries(POST_TYPES.map((t) => [t.id, t]));

export const DEFAULT_POST_TYPE_ID = 'lab_reminder';

export function getPostType(typeId) {
  return POST_TYPE_MAP[typeId] ?? POST_TYPE_MAP[DEFAULT_POST_TYPE_ID];
}

/** Label shown in post-type dropdown (universal → Custom / other). */
export function getPostTypeSelectLabel(type) {
  if (type.id === 'universal') return 'Custom / other';
  return type.label;
}

/** Daily types first, universal last. */
export function getOrderedPostTypes() {
  const daily = POST_TYPES.filter((t) => t.id !== 'universal');
  const universal = POST_TYPES.filter((t) => t.id === 'universal');
  return [...daily, ...universal];
}

/**
 * @param {string} typeId
 * @param {Record<string, string>} values
 * @returns {{ prompt: string, missingFields: string[], ok: boolean }}
 */
export function buildPrompt(typeId, values = {}) {
  const postType = getPostType(typeId);
  const missingFields = [];

  for (const field of postType.fields) {
    const val = values[field.key];
    const isEmpty = field.type === 'textarea' ? !val?.trim() : !val?.trim();
    if (field.key === 'officeHoursTime' && postType.id === 'after_class_recap') {
      continue;
    }
    if (isEmpty) {
      missingFields.push(field.label);
    }
  }

  if (missingFields.length > 0) {
    return { prompt: '', missingFields, ok: false };
  }

  const prompt = postType.template(values);
  return { prompt, missingFields: [], ok: true };
}

export const SESSION_STORAGE_KEY = 'tim.classroomDraftHelper';
