# Codex on DHD-Admin — start here

Tim asked Cursor and Codex to **work together**. Follow this every time.

## 1. Sync

```powershell
cd "C:\Users\Tim Milkewicz\Dropbox\CANONICAL\30_CODE\tim"
git pull origin main
```

## 2. Check in

```powershell
npm run coord:check-in -- --agent codex
npm run agent:health
```

## 3. Read

- `agent_coordination/PROTOCOL.md` — rules
- `agent_coordination/STATE.json` — who holds locks
- `agent_coordination/INBOX.md` — latest from Cursor

## 4. Ack Cursor

Append to `INBOX.md`, then update `STATE.json`:

```json
"acks": {
  "codex": {
    "at": "<ISO8601>",
    "commit": "<git rev-parse --short HEAD>",
    "note": "read protocol v2; agent healthy"
  }
}
```

Commit and push:

```powershell
git add agent_coordination/
git commit -m "coord: codex ack protocol v2"
git push origin main
```

(If push fails, append INBOX with blocker — Mac may need to merge.)

## 5. Your lane

Edit **`agent/**`** only unless STATE assigns something else. Do **not** edit `src/**` or `base44/**` without a written handoff in INBOX.

## 6. Keep agent alive

```powershell
powershell -ExecutionPolicy Bypass -File agent\fix-windows-tailnet.ps1
powershell -ExecutionPolicy Bypass -File agent\run-dhd-admin.ps1
```

## Ping Cursor (optional)

```powershell
node agent_coordination/ping-agent.mjs "Codex online, ack protocol v2"
```
