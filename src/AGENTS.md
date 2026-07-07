# AGENTS.md — Base44 App Context for OpenAI Codex CLI

> **Multi-agent coordination:** read [`agent_coordination/`](../agent_coordination/) first (`STATE.json`, `ROLES.md`).

## Project Overview
This is a **Base44** platform application built with **React + Vite + Tailwind CSS + TypeScript**.
It is a multi-domain management suite covering:
- **Learning Management** (courses, modules, lessons, quizzes, assignments, enrollments, student progress)
- **Asset & Maintenance Management** (assets, maintenance tasks, parts inventory, locations, camera systems)
- **Integrity & Compliance** (whistleblower tips, integrity alerts, evidence packages, identity vault, consent records)
- **Talent Insights** (AI-generated employee skill profiles, learning paths, succession planning)
- **TIM AI Assistant** (multimodal AI chat, image generation, voice, study tools)

---

## Tech Stack
- **Frontend**: React 18, React Router v6, Tailwind CSS, shadcn/ui, Framer Motion, Recharts, Lucide React
- **Backend**: Base44 Backend Functions (Deno Deploy handlers in `functions/`)
- **Database**: Base44 Entity SDK (`base44.entities.*`)
- **Auth**: Base44 Auth (`base44.auth.me()`, roles: `admin` | `user`)
- **AI**: Base44 `InvokeLLM` integration, agent SDK
- **Integrations**: Base44 OAuth app connectors + Core integrations

---

## File Structure
```
src/
  pages/           # React page components (one per route)
  components/      # Reusable UI components (organized by domain)
  entities/        # JSON schema definitions for database entities
  functions/       # Backend Deno functions (HTTP handlers)
  agents/          # AI agent JSON config files
  lib/             # Auth context, utils, router helpers
  api/             # Base44 SDK client
  index.css        # Tailwind + CSS variables (design tokens)
  App.jsx          # Router — MUST add <Route> for every new page
```

---

## Key Entities
| Entity | Purpose |
|---|---|
| `Asset` | Physical assets with status, location, maintenance schedule |
| `MaintenanceTask` | Maintenance work orders — has `clickup_task_id` field |
| `Part` | Spare parts inventory |
| `Location` | Physical sites |
| `WhistleblowerTip` | Anonymous tip submissions with credibility assessment |
| `IntegrityAlert` | Detected anomaly signals with escalation path |
| `EvidencePackage` | Forensic evidence bundles with manifest hash |
| `TalentInsight` | AI-generated employee skill + growth profiles |
| `Student`, `Enrollment`, `Course`, `Module`, `Lesson` | LMS core |
| `UserProgress` | Lesson-level completion tracking |
| `Badge`, `Streak` | Gamification |

---

## Backend Function Conventions
```js
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me(); // authenticate
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  // Admin check:
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  // User-scoped DB:
  const items = await base44.entities.SomeEntity.list();
  // Service-role DB (admin privileges):
  const all = await base44.asServiceRole.entities.SomeEntity.list();
  // Connector OAuth token:
  const { accessToken } = await base44.asServiceRole.connectors.getConnection("clickup");

  return Response.json({ ok: true, items });
});
```

**Rules:**
- Use `Deno.serve(async (req) => { ... })` — no other patterns
- Import with `npm:` prefix, always pin version
- No local imports between function files
- Write temp files to `/tmp` only
- Pass params via JSON body only (no URL params)
- Frontend calls functions via: `await base44.functions.invoke('functionName', payload)`

---

## Frontend Conventions
- All pages export a default React component matching filename
- Routes are manually registered in `App.jsx` — new pages need explicit `<Route>`
- Layout wrapper (`Layout.jsx`) provides mobile bottom nav + safe areas
- Design tokens in `index.css` → mapped in `tailwind.config.js` → use semantic class names (`bg-background`, `text-foreground`, etc.)
- Never construct Tailwind class names dynamically
- Use `base44.entities.EntityName.list/filter/create/update/delete` for DB ops

---

## Auth Roles
- `admin` — full access, can invoke admin-only functions
- `user` — standard access

---

## Codex CLI Tips
- Entity schemas are in `entities/*.json` — read these to understand data shapes
- Backend functions are in `functions/*.js` — each is a standalone Deno HTTP handler
- The app uses **no server-side rendering** — all React, client-rendered
- The `base44` client is pre-initialized in `src/api/base44Client.js`
- Do not install packages not in the approved list (see `package.json`)