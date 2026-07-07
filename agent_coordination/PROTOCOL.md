# Multi-agent protocol (Cursor + Codex)

Both agents follow this **every session**. Human (Tim) sets priority; agents execute in lane.

## The bus (no SSH required)

| Channel | Use for |
|---------|---------|
| **Git `main`** | Code, docs, `STATE.json`, `INBOX.md` — authoritative |
| **Base44 bridge** | Live agent status, urgent pings (`ping-agent.mjs`) |
| **Tailscale** | Human checks only (`tailscale ping dhd-admin`) |

Dropbox syncs files but is **not** coordination. Always `git pull origin main` first.

## Session start (mandatory)

```bash
git pull origin main
npm run coord:check-in          # Mac or Windows
cat agent_coordination/STATE.json
cat agent_coordination/INBOX.md   # read latest message
```

**STOP** if check-in says `WAIT` — another agent holds locks you need.

## Claim work

Before editing locked paths, update `STATE.json`:

```json
{
  "holder": "cursor",
  "host": "macbook-air",
  "updated_by": "cursor",
  "active_task": "short description",
  "locks": ["src/**"],
  "updated_at": "<ISO8601>",
  "expires_at": "<ISO8601 + 4h or null>"
}
```

- **One holder** at a time for overlapping paths.
- **Release** when done: set `holder` null, `active_task` null, `locks` [], append handoff to `INBOX.md`.
- **Shared folder** `agent_coordination/**`: pull first; prefer one editor at a time; always commit coordination changes promptly.

## Lanes (default ownership)

See `LANES.json`. Summary:

| Agent | Owns | Does not touch (unless handoff) |
|-------|------|----------------------------------|
| **Cursor** | `src/**`, `base44/**`, `docs/**`, `.github/**` | `agent/**` while Codex holds lock |
| **Codex** | `agent/**`, `logs/**`, Windows ops | `src/**`, `base44/**` while Cursor owns app work |
| **Either** | `agent_coordination/**`, root `README.md`, `package.json` | — with pull + STATE update |

## Handoff message (INBOX.md)

```markdown
## YYYY-MM-DD — <agent> → <agent>

**Task:** what was done  
**Branch/ commit:** abc123 on main  
**Next:** what the other agent should do  
**Blockers:** none | describe  
```

Then run (optional, for visibility on `/Devices`):

```bash
node agent_coordination/ping-agent.mjs "handoff: <one line>"
```

## Conflict prevention

1. Never edit the same repo on Mac and Windows simultaneously.
2. Never force-push `main`.
3. If Dropbox created `*conflicted copy*`, delete after merging — do not commit them.
4. If both agents need the same path: negotiate in `INBOX.md`; human breaks ties.

## Acknowledgment

After reading a protocol or inbox message, update `STATE.json`:

```json
"acks": {
  "cursor": { "at": "...", "commit": "<short sha>", "note": "read protocol v2" },
  "codex": { "at": "...", "commit": "...", "note": "read protocol v2" }
}
```

Both acks should reference the same `protocol_version` in STATE.

## Escalation to human

Append `INBOX.md` with tag **`[NEEDS TIM]`** when:

- Lane conflict cannot be resolved
- Base44 deploy or secrets needed
- Agent offline > 15 min during critical work
- Git push blocked / merge conflict on `main`
