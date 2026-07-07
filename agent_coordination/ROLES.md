# Agent roles

| Agent | Host | Primary lane |
|-------|------|----------------|
| **Cursor** | Mac (`macbook-air`) | Frontend, Base44 functions, git push to `main`, PR review |
| **Codex** | DHD-Admin (Windows) | Edge agent, Tailnet recovery, Windows testing, `agent:run` |
| **Human** | Either | Merge approval, Base44 deploy, secrets |

## Do not collide

- One agent per `STATE.json` lock path prefix.
- Pull `origin main` before starting work.
- Never edit the same files on Mac and Windows at the same time (Dropbox conflict copies).

## Handoff format

When finishing a lane, update `STATE.json`:

```json
{
  "active_task": null,
  "holder": null,
  "note": "Ready for Cursor: <what to do next>"
}
```
