# TIM edge agent

The edge agent is the trusted local executor for TIM. It runs on a Windows PC, Mac, or Linux host, polls the Base44 command ledger, validates every command against a local allowlist, and publishes the result.

It does **not** provide an arbitrary remote shell.

## Inspect this machine

```powershell
npm run agent:capabilities
```

## Configure Windows and Android

Set values in the host environment or in a local `.env` mechanism managed outside this repository. Never commit the signing secret.

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

```bash
export TIM_NODE_ID='tim-primary-mac'
export TIM_NODE_NAME='Primary Mac'
export TIM_TRUST_LEVEL='assist'
export TIM_ALLOWED_WORKSPACES="$HOME/Developer:$HOME/Projects"
export TIM_ALLOWED_SHORTCUTS='Good Night,Start Work'
export TIM_COMMAND_SIGNING_SECRET='<same-long-random-secret-configured-in-base44>'
npm run agent:run
```

Install Xcode and its command-line tools first. Only Shortcuts named in `TIM_ALLOWED_SHORTCUTS` can run.

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
