# agent_coordination

**Find this folder:** repo root `agent_coordination/` (same level as `agent/`, `src/`, `docs/`).

Multi-agent coordination for TIM — Cursor (Mac), Codex (DHD-Admin), and future agents.

## Read order

1. `PROTOCOL.md` — **how Cursor and Codex work together**
2. `STATE.json` — who owns what right now
3. `INBOX.md` — async messages between agents
4. `LANES.json` — path ownership
5. `ROLES.md` — summary table
6. `CODEX_START.md` — DHD-Admin checklist (Codex only)
7. `docs/DUAL_MACHINE_WORKFLOW.md` — git-not-Dropbox rules

## Tools (Mac or DHD-Admin, after `git pull`)

```bash
npm run coord:check-in -- --agent cursor   # or codex
node agent_coordination/query-node.mjs dhd-admin
node agent_coordination/ping-agent.mjs "message"
```

## Update rules

- **Git is authoritative.** Commit and push coordination changes; do not rely on Dropbox alone.
- **Update `STATE.json`** when you start or finish a task (set `holder`, `updated_at`, `expires_at`).
- **Mac commits infra/frontend/Base44** unless `STATE.json` assigns the lane to another agent.
- **DHD-Admin (Codex)** owns edge agent ops, Windows/Tailnet recovery, and local agent runs unless reassigned.

## Quick status check

```bash
cat agent_coordination/STATE.json
npm run agent:health   # from repo root
```
