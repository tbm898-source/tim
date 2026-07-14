/**
 * Browser port of classroom-chatgpt-bridge AYA gate (keep in sync with src/aya-gate.mjs).
 */

const URL_RE = /\bhttps?:\/\/[^\s)<>"']+/gi;

export const DEFAULT_AYA_POLICY = {
  ayaStatement:
    'Content must be appropriate for your students and comply with your institution policies.',
  blockOnFailure: true,
  maxCharacters: 30000,
  maxBytes: null,
  requiredPhrases: [],
  blockedPhrases: [],
  blockedRegex: [
    '\\b(?:password|ssn|social\\s*security)\\s*[:=]',
    '\\b\\d{3}-\\d{2}-\\d{4}\\b',
  ],
  blockedUrlHosts: ['discord.gg', 'discord.com/channels', 't.me/'],
  allowedUrlHosts: [],
  allowOnlyHttpsLinks: true,
};

/**
 * @param {string} text
 * @param {object} [policy]
 * @returns {{ ok: boolean, reasons: string[], policy: object }}
 */
export function gateContent(text, policy = DEFAULT_AYA_POLICY) {
  const reasons = [];
  if (typeof text !== 'string') {
    return { ok: false, reasons: ['Content must be a string'], policy };
  }

  const bytes = new TextEncoder().encode(text).length;
  if (policy.maxBytes != null && bytes > policy.maxBytes) {
    reasons.push(`Exceeds maxBytes (${bytes} > ${policy.maxBytes})`);
  }
  if (policy.maxCharacters != null && text.length > policy.maxCharacters) {
    reasons.push(`Exceeds maxCharacters (${text.length} > ${policy.maxCharacters})`);
  }

  for (const phrase of policy.requiredPhrases || []) {
    if (!text.toLowerCase().includes(String(phrase).toLowerCase())) {
      reasons.push(`Missing required phrase: "${phrase}"`);
    }
  }

  for (const phrase of policy.blockedPhrases || []) {
    if (text.toLowerCase().includes(String(phrase).toLowerCase())) {
      reasons.push(`Blocked phrase matched: "${phrase}"`);
    }
  }

  for (const pattern of policy.blockedRegex || []) {
    try {
      const re = new RegExp(pattern, 'i');
      if (re.test(text)) {
        reasons.push(`Blocked pattern matched: ${pattern}`);
      }
    } catch {
      reasons.push(`Invalid regex in policy (skipped): ${pattern}`);
    }
  }

  const urls = text.match(URL_RE) || [];
  for (const u of urls) {
    let url;
    try {
      url = new URL(u.replace(/[.,;]+$/, ''));
    } catch {
      reasons.push(`Malformed URL: ${u}`);
      continue;
    }
    if (policy.allowOnlyHttpsLinks && url.protocol !== 'https:') {
      reasons.push(`Non-HTTPS link not allowed: ${url.href}`);
    }
    const host = url.hostname.toLowerCase();
    for (const bad of policy.blockedUrlHosts || []) {
      if (host === bad || host.endsWith(`.${bad}`)) {
        reasons.push(`Blocked URL host: ${host}`);
      }
    }
  }

  const allow = policy.allowedUrlHosts || [];
  if (allow.length > 0) {
    for (const u of urls) {
      let url;
      try {
        url = new URL(u.replace(/[.,;]+$/, ''));
      } catch {
        continue;
      }
      const host = url.hostname.toLowerCase();
      const ok = allow.some((h) => host === h || host.endsWith(`.${h}`));
      if (!ok) {
        reasons.push(`URL host not in allowlist: ${host}`);
      }
    }
  }

  return { ok: reasons.length === 0, reasons, policy };
}

/** Escape text for a single-quoted shell argument. */
export function shellQuote(text) {
  return `'${String(text).replace(/'/g, `'\\''`)}'`;
}

export function buildPostCommand(courseId, text) {
  return `npm run teach:post -- --courseId ${courseId} --text ${shellQuote(text)}`;
}

export function buildDryRunCommand(courseId, text) {
  return `npm run teach:post -- --courseId ${courseId} --text ${shellQuote(text)} --dry-run`;
}
