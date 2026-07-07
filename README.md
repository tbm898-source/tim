# TIM (Base44 App)

Multi-domain platform: SETH AI assistant, LMS, asset management, integrity/compliance, talent insights, and device control via the TIM edge agent.

## Quick start (Mac)

```bash
npm install
npm run dev
npm run check          # agent tests + production build
npm run agent:health   # verify signing secret + Base44 bridge
```

## Edge agent (Windows / Mac / Linux)

See [agent/README.md](agent/README.md). On DHD-Admin after `git pull`:

```powershell
npm run agent:health
powershell -ExecutionPolicy Bypass -File agent\run-dhd-admin.ps1
```

## Dual-machine workflow

Mac commits; Windows pulls. **Do not** rely on Dropbox for code sync. See [docs/DUAL_MACHINE_WORKFLOW.md](docs/DUAL_MACHINE_WORKFLOW.md).

## Multi-agent coordination

**Start here:** [agent_coordination/](agent_coordination/) — **`PROTOCOL.md`**, `STATE.json`, `INBOX.md`, `npm run coord:check-in`

## Architecture

- Frontend: React + Vite in `src/`
- Backend: Base44 functions in `base44/functions/`
- Device control: [docs/DEVICE_CONTROL_ARCHITECTURE.md](docs/DEVICE_CONTROL_ARCHITECTURE.md)
