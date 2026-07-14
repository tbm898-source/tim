# Classroom prompt kit

Read-only reference for instructor announcement templates and the ChatGPT → TIM → Classroom workflow.

**Scope:** Documentation and prompt templates. Auto-post via local bridge when `npm run teach:serve` is running on your Mac.

---

## Workflow

1. **Draft** — pick your lane:
   - **Classroom Draft** (`/ClassroomDraftHelper`): structured fields → copy ChatGPT prompt → draft in Cursor sidebar; or
   - **Classroom AI** (`/ClassroomPublisher`): freeform prompt → TIM drafts in-app; or
   - Manual templates below in ChatGPT sidebar.
2. **Review** the output — edit for accuracy, names, dates, and tone.
3. **Paste** (Draft path only) into Classroom Draft, or edit in Classroom AI.
4. **AYA check** in TIM.
5. **Post** — click **Post to Classroom** if bridge is running (`npm run teach:serve`), or copy text/command manually.

---

## Classroom tools compared

| | Classroom Draft | Classroom AI |
|---|---|---|
| Drafting | ChatGPT sidebar (copy prompt) | TIM `InvokeLLM` |
| Input | Structured post-type fields | Freeform prompt |
| Post | Bridge button or copy | Bridge button or copy command |

**Bridge setup:** `npm run teach:setup` then `npm run teach:auth-google`.

**Auto-start at login (Mac, recommended):** `npm run teach:wizard` — installs LaunchAgent, no terminal needed before class.

**Manual session:** `npm run teach:start`

---

## 1. Lab reminder

```
I'm a solar construction technology instructor. Write a Google Classroom announcement reminding students that [DAY] lab starts at [TIME] in [LOCATION]. They must bring [SAFETY GEAR / TOOLS]. Tone: clear, friendly, professional. Under 120 words. No emojis. Output only the announcement text I can paste into Classroom.
```

**Placeholders:** `[DAY]`, `[TIME]`, `[LOCATION]`, `[SAFETY GEAR / TOOLS]`

---

## 2. Assignment due date

```
Draft a Google Classroom announcement: assignment "[ASSIGNMENT NAME]" is due [DATE] at [TIME]. Include what to submit ([format]), where to submit (Classroom assignment), and that late work follows our syllabus policy. Appropriate for college/secondary students. Plain language. Output only the announcement body.
```

**Placeholders:** `[ASSIGNMENT NAME]`, `[DATE]`, `[TIME]`, `[format]`

---

## 3. Week ahead preview

```
Write a short "week ahead" Google Classroom post for my [COURSE NAME] class. Cover: topics we're covering ([TOPIC 1], [TOPIC 2]), lab day [DAY], and one thing students should review before class. Encouraging but not cheesy. Max 150 words. Output only the post text.
```

**Placeholders:** `[COURSE NAME]`, `[TOPIC 1]`, `[TOPIC 2]`, `[DAY]`

---

## 4. After-class recap

```
Write a brief Google Classroom recap for today's lesson on [TOPIC]. Include: what we covered (3 bullets), what's due next, and optional office hours [TIME]. Student-friendly, inclusive language. Output only the announcement.
```

**Placeholders:** `[TOPIC]`, `[TIME]`

---

## 5. Universal master prompt

Use when none of the templates above fit, or when you want one reusable pattern for any announcement.

```
You are helping me draft a Google Classroom announcement for [COURSE NAME].

Audience: [secondary / college / mixed — pick one]
Purpose: [reminder | due date | recap | policy | event | other]
Key facts I must include:
- [fact 1]
- [fact 2]
- [fact 3]

Constraints:
- Plain language, appropriate for students, inclusive tone
- No jokes at students' expense; no sensitive personal data
- No external signup links unless I listed them above
- Under [WORD LIMIT] words unless I need longer for clarity
- Output only the announcement body (no markdown fences, no subject line unless I asked)

Draft the announcement now.
```

**Placeholders:** `[COURSE NAME]`, audience, purpose, facts, `[WORD LIMIT]`

---

## Related paths

| Item | Location |
|------|----------|
| Structured prompt builder | TIM **Classroom Draft** (`/ClassroomDraftHelper`) |
| In-app AI draft + post | TIM **Classroom AI** (`/ClassroomPublisher`) |
| Local bridge server | `npm run teach:serve` (Mac, loopback only) |

---

## Do not store here

- OpenAI API keys
- Google OAuth tokens or `client_secret.json`
- Student names, grades, or identifiable records
