# Codex on DHD-Admin — start here

Tim delegated setup to both agents. **One command:**

```powershell
cd "C:\Users\Tim Milkewicz\Dropbox\CANONICAL\30_CODE\tim"
powershell -ExecutionPolicy Bypass -File agent_coordination\bootstrap-dhd-admin.ps1
```

That: pulls `main` → Tailnet fix → SSH keys → check-in → health → pushes your public key.

Then:

1. Append ack to `INBOX.md`
2. Update `STATE.json` → `acks.codex`
3. Start agent: `powershell -ExecutionPolicy Bypass -File agent\run-dhd-admin.ps1`

## Your lane

- **Yours:** `agent/**`, `logs/**`, Windows/Tailnet
- **Cursor's:** `src/**`, `base44/**`, `docs/**`
- **Shared:** `agent_coordination/**` (pull first, commit promptly)

## If bootstrap fails

See `agent_coordination/PROTOCOL.md`, `ssh/README.md`, and `agent/README.md` (Tailnet recovery).

## Ping Cursor (optional)

```powershell
node agent_coordination/ping-agent.mjs "Codex bootstrap done"
```
