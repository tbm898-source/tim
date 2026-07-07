# agent_coordination

**Find this folder:** repo root `agent_coordination/` (same level as `agent/`, `src/`, `docs/`).

Multi-agent coordination for TIM — Cursor (Mac), Codex (DHD-Admin), and future agents.

## Read order

1. `STATE.json` — who owns what right now
2. `INBOX.md` — async messages between agents
3. `ROLES.md` — lanes and boundaries
4. `docs/DUAL_MACHINE_WORKFLOW.md` — git-not-Dropbox rules

## Tools (Mac or DHD-Admin, after `git pull`)

```bash
node agent_coordination/query-node.mjs dhd-admin   # node status + pending commands
node agent_coordination/ping-agent.mjs "message"   # post DeviceEvent + metadata ping
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
