# Dual-machine workflow (Mac + Windows)

TIM is developed on a **Mac checkout** and operated on **DHD-Admin** (Windows). Dropbox syncs files but must not be the source of truth for code updates.

## Rules

1. **Git is authoritative** — `git pull origin main` on each machine after pushes.
2. **One editor at a time** — never edit the same repo on Mac and Windows simultaneously (Dropbox creates `*conflicted copy*` files).
3. **Mac commits and pushes** — Windows pulls and runs agents only unless explicitly coordinated.
4. **Tailnet before Windows work** — if internet fails on Windows, run `agent\fix-windows-tailnet.ps1` before Codex or npm.

## DHD-Admin startup sequence

```powershell
git pull origin main
powershell -ExecutionPolicy Bypass -File agent\fix-windows-tailnet.ps1
npm run agent:health
powershell -ExecutionPolicy Bypass -File agent\run-dhd-admin.ps1
```

## Mac verification

```bash
tailscale ping dhd-admin
npm run agent:health
```

## Exit node warning

Do not use **goliathsystem** as an exit node unless it is online. An offline exit node black-holes all internet on Windows.

## Multi-agent coordination

Before starting work, read [`agent_coordination/`](../agent_coordination/) — `STATE.json` and `ROLES.md` define who owns which paths.
