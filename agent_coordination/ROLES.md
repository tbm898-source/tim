# Agent roles

> Full rules: [`PROTOCOL.md`](PROTOCOL.md) · Path map: [`LANES.json`](LANES.json)

| Agent | Host | Primary lane |
|-------|------|----------------|
| **Cursor** | Mac (`macbook-air`) | `src/**`, `base44/**`, `docs/**`, CI, git push |
| **Codex** | DHD-Admin (Windows) | `agent/**`, Tailnet, `agent:run`, Windows testing |
| **Human** | Either | Merge approval, Base44 deploy, secrets |

## Every session

```bash
git pull origin main
npm run coord:check-in -- --agent <cursor|codex>
```

| Status | Meaning |
|--------|---------|
| `GO` | In lane — update STATE before editing locked paths |
| `PULL` | Behind main — pull first |
| `WAIT` | Other agent holds locks — read INBOX.md |

## Do not collide

- One `holder` in `STATE.json` for overlapping locks.
- Never edit Mac + Windows checkouts at the same time.
- Hand off in `INBOX.md` when changing lanes.

## Handoff

When finishing, clear STATE and append INBOX:

```json
{
  "holder": null,
  "active_task": null,
  "locks": []
}
```
