# TIM device-control architecture

## Outcome

TIM is split into two deliberately different parts:

1. The Base44 app is the control plane: device inventory, requests, approvals, status, and audit history.
2. A TIM edge agent runs on each trusted computer and performs a small set of locally allowlisted actions.

Osiris Rising can observe TIM through a narrow connector contract, but it does not become the device executor. Consequential commands still flow through TIM's Base44 ledger, approval step, command signing, and edge-agent verification.

This makes the system useful without turning the web application into an unaudited remote shell.

```text
TIM web console
    │ request / approve / inspect
    ▼
Base44 DeviceCommand ledger
    │ authenticated polling
    ▼
Trusted edge agent ──► Windows / Android Studio / ADB
                   └─► macOS / Xcode / Shortcuts
```

Every consequential command follows `observe → plan → approve → execute → verify`.

## Supported first slice

| Target | Mechanism | Current actions |
|---|---|---|
| Windows PC | TIM edge agent | Host inventory, bounded ping, launch configured Android Studio, Gradle wrapper tasks |
| Android phone/tablet | ADB through a trusted host | List authorized devices and install an approved APK |
| Mac | TIM edge agent | Host inventory, Xcode launch, `xcodebuild` list/build/test, allowlisted Shortcuts |
| iPhone/iPad | Xcode, Shortcuts, HomeKit, or MDM through a Mac/service | Supported platform workflows only; no unrestricted remote UI control |
| Home network | Host agent now; vendor/Home Assistant/SNMP integrations next | Bounded ping now; discovery and configuration require connector-specific policies |

Android's official tooling exposes device operations through [Android Debug Bridge](https://developer.android.com/tools/adb), and Android projects can be built from the command line with the [Gradle wrapper](https://developer.android.com/build/building-cmdline). Apple provides the [xcodebuild command-line tool](https://developer.apple.com/library/archive/technotes/tn2339/_index.html) on macOS and supports running named [Shortcuts from the command line](https://support.apple.com/guide/shortcuts-mac/run-shortcuts-from-the-command-line-apd455c82f02/mac).

## Command policy

The cloud function and local dispatcher both validate the action. Base44 signs each authorized command with `TIM_COMMAND_SIGNING_SECRET`; the edge agent verifies that signature before execution. The signature binds the node, action, risk, expiry, approval time, and complete payload, so changing any of them invalidates the command. Passing one layer is not enough.

| Action | Risk | Approval | Local restriction |
|---|---:|---:|---|
| `system.inventory` | Read only | No | Built-in OS APIs only |
| `network.ping` | Read only | No | One validated host; no free-form arguments |
| `android.devices` | Read only | No | `adb devices -l` only |
| `android.build` | Medium | Yes | Allowed workspace and one of four Gradle tasks |
| `android.install` | High | Yes | `.apk` inside an allowed workspace |
| `app.launch` | Medium | Yes | Android Studio or Xcode only |
| `xcode.list` | Read only | No | Project/workspace inside an allowed root |
| `xcode.build` | Medium | Yes | Allowed project, validated scheme, build/test only |
| `shortcut.run` | High | Yes | Exact name in `TIM_ALLOWED_SHORTCUTS` |

There is no `shell.exec`, arbitrary executable path, arbitrary command argument list, or browser-supplied working directory.

## Deployment sequence

1. Generate a long random `TIM_COMMAND_SIGNING_SECRET` and store it as a protected Base44 function secret.
2. Deploy the three new Base44 entities: `DeviceNode`, `DeviceCommand`, and `DeviceEvent`.
3. Deploy `queueDeviceCommand` and `approveDeviceCommand`.
4. Publish the updated frontend.
5. On one Windows machine, configure the same signing secret and the agent with `TIM_TRUST_LEVEL=observe`, start it, and confirm heartbeats and read-only inventory.
6. Change that machine to `assist` only after the command ledger and approval flow are verified.
7. Pair Android with ADB and test `android.devices` before build or install actions.
8. Repeat on a Mac for Xcode and a small Shortcuts allowlist.

The repository owner must perform or authorize Base44 publication. This checkout cannot publish to GitHub because the authenticated account currently has read-only repository access.

## Integration handoff — 2026-06-27

| Field | Value |
|---|---|
| Machine used | MacBook Air (Eugene, Space Bar) via Tailscale |
| Mac checkout | `/Users/timmi/Library/CloudStorage/Dropbox/CANONICAL/30_CODE/tim` |
| Authoritative repo | `https://github.com/tbm898-source/tim.git` branch `main` |
| Base44 app ID | `695cfbf7fba07f58d25ff8bb` |
| Bridge endpoint pattern | `https://base44.app/api/apps/695cfbf7fba07f58d25ff8bb/functions/deviceAgentBridge` |
| Agent auth | `TIM_COMMAND_SIGNING_SECRET` HMAC on `timestamp.body` via `X-TIM-Timestamp` + `X-TIM-Signature` |
| Legacy token | `TIM_BASE44_ACCESS_TOKEN` not used by connected agent mode |

### Verified from Mac

- Tailscale: `dhd-admin` (`100.95.71.54`) online, `goliathsystem` (`100.113.126.122`) online
- SSH Mac → DHD-ADMIN: blocked (Mac public key not in DHD-ADMIN `authorized_keys`)
- SSH Mac → goliathserver: blocked (`timmi` rejected)
- Mac agent capabilities: runnable locally via `npm run agent:capabilities`

### Files added or updated in this slice

- `base44/functions/deviceAgentBridge/entry.ts` — signed bridge for edge agents
- `base44/entities/DeviceNode.jsonc`, `DeviceCommand.jsonc`, `DeviceEvent.jsonc`
- `base44/functions/queueDeviceCommand/entry.ts`, `approveDeviceCommand/entry.ts`
- `agent/` edge agent, `src/pages/Devices.jsx`, `src/api/entities.js`
- `agent/tests/bridge-signature.test.mjs`

### Remaining blockers

1. Add Mac SSH public key to DHD-ADMIN `authorized_keys` (manual RDP step)
2. Configure `TIM_COMMAND_SIGNING_SECRET` in Base44 function secrets and on DHD-ADMIN agent host
3. Deploy updated Base44 functions and entities from this checkout
4. Start agent on DHD-ADMIN with `TIM_NODE_ID=dhd-admin` and verify node appears in `/Devices`

### Rollback

- Remove `base44/functions/deviceAgentBridge/`
- Stop the edge agent process on DHD-ADMIN
- Delete test `DeviceNode` records for `dhd-admin` from Base44 if duplicates were created during testing

## Production hardening backlog

- One-time pairing codes and device-scoped, revocable credentials instead of manually copied shared secrets
- Signed commands with nonce and expiry validation on the edge agent
- Atomic command claiming to prevent two agents from executing the same request
- Encrypted local credential storage using Windows Credential Manager and macOS Keychain
- Automatic service installers and health supervision for Windows and macOS
- Per-action rollback metadata and a dedicated emergency stop
- Home Assistant plus router-specific read-only connectors before any network writes
- Notification and approval delivery to phone/tablet without making the phone itself a privileged executor
