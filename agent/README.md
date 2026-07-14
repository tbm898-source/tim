# TIM edge agent

The edge agent is the trusted local executor for TIM. It runs on a Windows PC, Mac, or Linux host, polls the Base44 command ledger, validates every command against a local allowlist, and publishes the result.

It does **not** provide an arbitrary remote shell.

## Inspect this machine

```powershell
npm run agent:capabilities
```

## Configure Windows and Android

Set values in the host environment or in a local `.env` mechanism managed outside this repository. Never commit the signing secret.

**Remote setup from Mac (Dropbox sync):** `agent/.env.dhd-admin` syncs to the Windows checkout. On DHD-ADMIN, run once:

```powershell
cd "C:\Users\Tim Milkewicz\Dropbox\CANONICAL\30_CODE\tim"
powershell -ExecutionPolicy Bypass -File agent\run-dhd-admin.ps1
```

Optional autostart at logon:

```powershell
powershell -ExecutionPolicy Bypass -File agent\install-dhd-admin-autostart.ps1
Start-ScheduledTask -TaskName 'TIM-Edge-Agent-dhd-admin'
```

```powershell
$env:TIM_NODE_ID = 'tim-office-windows'
$env:TIM_NODE_NAME = 'Office Windows PC'
$env:TIM_TRUST_LEVEL = 'assist'
$env:TIM_ALLOWED_WORKSPACES = 'C:\Users\Tim\AndroidStudioProjects;C:\Users\Tim\Projects'
$env:TIM_ANDROID_STUDIO_PATH = 'C:\Program Files\Android\Android Studio\bin\studio64.exe'
$env:TIM_ADB_PATH = 'C:\Users\Tim\AppData\Local\Android\Sdk\platform-tools\adb.exe'
$env:TIM_COMMAND_SIGNING_SECRET = '<same-long-random-secret-configured-in-base44>'
npm run agent:run
```

Before using ADB, enable developer options and USB debugging on the Android device and approve the computer's RSA prompt on the device.

## Configure macOS, Xcode, and Apple Shortcuts

### One-time setup

```bash
bash agent/setup-mac.sh
```

The script prompts for:

1. **Base44 server URL** — e.g. `https://base44.app` or your custom domain like `https://oneosiris.com`. Do **not** enter the full bridge path; the agent appends `/api/apps/<appId>/functions/deviceAgentBridge` automatically.
2. **Signing secret** — hidden input, stored in macOS Keychain only (service: `TIM Edge Agent`)
3. **Workspace allowlist** — colon-separated paths
4. **Shortcut allowlist** — comma-separated names, or empty to disable `shortcut.run`

Non-secret settings are written to `~/.config/tim-edge/agent.env` (mode 600). The script does not edit shell profiles.

### Verify and start

```bash
npm run agent:capabilities   # uses hostname default unless env is loaded
npm run agent:test
bash agent/macos/run-tim-edge.sh
```

The wrapper loads `~/.config/tim-edge/agent.env`, retrieves the secret from Keychain, and starts the agent as `tim-primary-mac`.

### Rollback (macOS)

```bash
rm ~/.config/tim-edge/agent.env
security delete-generic-password -a "$USER" -s "TIM Edge Agent"
```

Stop a running agent with **Ctrl+C**.

### LaunchAgent (later, after manual verification)

See `agent/macos/com.tim.tim-edge.plist.example`. Replace all `PLACEHOLDER` paths before installing. Do not load until connected mode is confirmed working.

## Local command test

Create a command file outside the repository:

```json
{
  "action": "network.ping",
  "payload": { "host": "192.168.1.1" }
}
```

Then execute it locally:

```powershell
node agent/tim-edge.mjs execute --file C:\Temp\tim-command.json
```

Consequential local tests such as `android.build`, `android.install`, `app.launch`, `xcode.build`, and `shortcut.run` require `--approved`. Connected mode accepts them only when the cloud command ledger contains an approval record.

## Current security boundary

Configure `TIM_COMMAND_SIGNING_SECRET` as a protected Base44 function secret and separately on every trusted agent. The agent rejects any command whose signature is missing or does not match its payload, approval timestamp, node, risk, and expiry.

The agent uses the HMAC-protected `deviceAgentBridge` function for connected mode, so it does not need a Base44 user access token on the trusted host. Before exposing the control plane beyond a private test environment, replace shared-secret provisioning with one-time pairing and device-scoped, revocable credentials.

## Windows Tailnet recovery (DHD-Admin offline)

If `dhd-admin` or other Windows nodes show **offline** in `tailscale status` from the Mac, do not edit this repo on Windows until Tailscale is healthy again (Dropbox conflict copies are the usual symptom).

On the Windows host (local console or RDP, not over Tailscale):

1. Open the Tailscale app — confirm **Connected** (re-login if needed).
2. Tray icon → **Use exit node** → **None** if `goliathsystem` or another exit node is offline (offline exit nodes can kill all internet on Windows).
3. Admin PowerShell: `Restart-Service Tailscale`
4. Confirm normal internet works outside Tailscale, then confirm Tailscale shows Connected.

From the Mac, verify: `tailscale ping dhd-admin` (should reply). Only then run `agent\run-dhd-admin.ps1` again.

**Mac-only workflow until then:** commit and push from the Mac checkout; leave DHD-Admin idle.
