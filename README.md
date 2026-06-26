# TIM

TIM is a Base44-powered personal operations copilot. Its primary interface is a conversational command center for understanding systems, organizing work, and preparing safe, reviewable actions.

## Current capabilities

- AI chat, image generation, study tools, and conversation history
- Trusted-device command ledger with approval-gated execution and audit events
- A local edge agent for Windows/Android Studio/ADB and macOS/Xcode/Shortcuts
- A signed `deviceAgentBridge` backend function so agents do not need a broad Base44 user token
- Asset, location, camera-system, parts, and maintenance records
- Maintenance work queue with ClickUp synchronization
- Integrity monitoring, evidence workflows, and talent/learning tools

TIM only has operational access through configured Base44 entities, backend functions, and connectors. The interface must not imply that a device or service is connected when it is not.

Device control requires a TIM edge agent on each trusted computer. See [agent/README.md](agent/README.md) for setup and [docs/DEVICE_CONTROL_ARCHITECTURE.md](docs/DEVICE_CONTROL_ARCHITECTURE.md) for the security model and platform limits.

Required device-control functions:

- `queueDeviceCommand`
- `approveDeviceCommand`
- `deviceAgentBridge`

## Run locally

```bash
npm ci
npm run dev
```

Local Base44 data access requires the environment values normally supplied by Base44:

- `VITE_BASE44_APP_ID`
- `VITE_BASE44_BACKEND_URL`
- `VITE_BASE44_FUNCTIONS_VERSION` when required by the deployment

Without those values, the interface renders for frontend work but connected data and AI calls will report unavailable states.

For an unauthenticated UI preview during local frontend work, open `http://localhost:5173/?preview=true`. Preview mode is development-only and does not grant backend access.

## Quality checks

```bash
npm run build
npm run lint
npm run typecheck
npm run agent:test
npm run agent:capabilities
```

The React application is JavaScript and is validated by Vite plus ESLint; `typecheck` validates the TypeScript surface without emitting files.

## Operating model

Consequential automation should follow five visible stages: observe, plan, approve, execute, and verify. New home-network or system connectors should be read-only first, scoped to the minimum required permissions, and upgraded to write access only after approval and rollback behavior are defined.
