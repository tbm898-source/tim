# TIM edge agent

The edge agent is the trusted local executor for TIM. It runs on a Windows PC, Mac, or Linux host, polls the Base44 command ledger via the `deviceAgentBridge` function, validates every command against a local allowlist, and publishes the result.

It does **not** provide an arbitrary remote shell.

## Inspect this machine

```bash
npm run agent:capabilities
```

## Configure Windows and Android

Set values in the host environment or in a local `.env` mechanism managed outside this repository. Never commit credentials.

```powershell
$env:TIM_NODE_ID = 'tim-office-windows'
$env:TIM_NODE_NAME = 'Office Windows PC'
$env:TIM_TRUST_LEVEL = 'assist'
$env:TIM_ALLOWED_WORKSPACES = 'C:\Users\Tim\AndroidStudioProjects;C:\Users\Tim\Projects'
$env:TIM_ANDROID_STUDIO_PATH = 'C:\Program Files\Android\Android Studio\bin\studio64.exe'
$env:TIM_ADB_PATH = 'C:\Users\Tim\AppData\Local\Android\Sdk\platform-tools\adb.exe'
$env:TIM_AGENT_ENDPOINT = 'https://<your-base44-app>.base44.app/api/functions/deviceAgentBridge'
$env:TIM_COMMAND_SIGNING_SECRET = '<same-long-random-secret-configured-in-base44>'
npm run agent:run
```

Before using ADB, enable developer options and USB debugging on the Android device and approve the computer's RSA prompt on the device.

## Configure macOS, Xcode, and Apple Shortcuts

### One-time setup

```bash
bash agent/setup-mac.sh
```

The setup script will:

1. Prompt for the bridge endpoint (`https://...`)
2. Prompt for the signing secret with terminal echo disabled — it goes **directly to macOS Keychain** and is never written to a file
3. Prompt for the workspace allowlist (colon-separated paths)
4. Prompt for allowed Shortcut names (comma-separated; leave empty to disable `shortcut.run`)
5. Write non-secret configuration to `~/.config/tim-edge/agent.env` (mode 600)
6. Detect the npm binary for non-interactive LaunchAgent runs
7. Print a non-sensitive summary — node id, endpoint hostname, workspace count, npm path, Keychain item status

The script does **not** edit `.zshrc`, `.zprofile`, `.bash_profile`, or any shell profile.

### Verify configuration

Open a new terminal after running setup, then:

```bash
# Confirm detected capabilities (xcode.list/xcode.build appear only if xcodebuild is present;
# shortcut.run appears only if the allowlist is non-empty and shortcuts CLI is available)
npm run agent:capabilities

# Run all unit tests (no network required)
npm run agent:test
```

### Start the agent manually

```bash
bash agent/macos/run-tim-edge.sh
```

The wrapper:
- Verifies `~/.config/tim-edge/agent.env` permissions (must be 600, dir 700)
- Parses the config file against an explicit allowlist of variable names — it does **not** `source` the file
- Retrieves `TIM_COMMAND_SIGNING_SECRET` from Keychain at runtime
- Resolves the repository path relative to the wrapper location instead of relying on a hard-coded Dropbox path
- Never prints the secret
- Aborts with a clear message if Keychain lookup fails

### Verify in Base44

After the agent starts:

1. Confirm `tim-primary-mac` appears in the Base44 Devices list with status `online`
2. Test `system.inventory` — read-only, no approval required
3. Test `network.ping` — read-only, no approval required
4. Test `xcode.list` or `xcode.build` only after inventory and ping succeed
5. Test `shortcut.run` only after Xcode tests succeed (requires approval)

### Install as a background service (later, explicit step only)

Do **not** install the LaunchAgent during initial setup. Install it only after:

- Connected mode works manually
- `tim-primary-mac` appears correctly in Devices
- `system.inventory` succeeds
- Event and status reporting work correctly
- You explicitly decide to proceed

When ready:

```bash
# Review and fill in absolute paths in the template:
cat agent/macos/com.tim.tim-edge.plist.example

# Create log directory
mkdir -p ~/Library/Logs/TIM

# Copy template with all PLACEHOLDER strings replaced
cp agent/macos/com.tim.tim-edge.plist.example \
   ~/Library/LaunchAgents/com.tim.tim-edge.plist
# (edit the copy to replace PLACEHOLDER_REPO_ROOT and PLACEHOLDER_USERNAME)

launchctl load ~/Library/LaunchAgents/com.tim.tim-edge.plist
```

## Local command test

Create a command file outside the repository:

```json
{
  "action": "network.ping",
  "payload": { "host": "192.168.1.1" }
}
```

Then execute it locally (no credentials required):

```bash
node agent/tim-edge.mjs execute --file /tmp/tim-command.json
```

Consequential local tests such as `android.build`, `android.install`, `app.launch`, `xcode.build`, and `shortcut.run` require `--approved`. Connected mode accepts them only when the cloud command ledger contains an approval record.

## Security boundary

`TIM_COMMAND_SIGNING_SECRET` is configured as a protected Base44 function secret and separately on every trusted host. The agent rejects any command whose signature is missing or does not match its payload, approval timestamp, node, risk, and expiry.

On macOS the secret is stored in the login Keychain under service `TIM Edge Agent`, account `$USER`. It is retrieved at agent startup by `agent/macos/run-tim-edge.sh` and never written to disk.

Each machine must have its own `TIM_NODE_ID`. The Mac uses `tim-primary-mac`. The Windows host must use a distinct ID (e.g. `tim-office-windows`). Sharing an ID causes both machines to impersonate each other in the Devices ledger.

## Rollback

### Restore agent files

```bash
# List available backups
ls ~/TIM-agent-backups/

# Restore from a specific backup
BACKUP=~/TIM-agent-backups/20260623-130945
cp "$BACKUP/lib/config.mjs"          agent/lib/config.mjs
cp "$BACKUP/lib/base44-transport.mjs" agent/lib/base44-transport.mjs
cp "$BACKUP/lib/dispatcher.mjs"       agent/lib/dispatcher.mjs
cp "$BACKUP/README.md"                agent/README.md
cp "$BACKUP/tests/dispatcher.test.mjs" agent/tests/dispatcher.test.mjs
```

### Remove macOS configuration

```bash
# Remove config file (non-secret settings)
rm ~/.config/tim-edge/agent.env
rmdir ~/.config/tim-edge   # only if empty

# Remove Keychain item
security delete-generic-password -a "$USER" -s "TIM Edge Agent"
```

### Remove LaunchAgent (if installed)

```bash
launchctl unload ~/Library/LaunchAgents/com.tim.tim-edge.plist
rm ~/Library/LaunchAgents/com.tim.tim-edge.plist
```

### Stop a manually running agent

Press **Ctrl+C** in the terminal where `run-tim-edge.sh` is running. The agent catches SIGINT and SIGTERM, marks the node offline, and exits cleanly.

## Production hardening backlog

- One-time pairing codes and device-scoped, revocable credentials
- Atomic command claiming to prevent two agents from executing the same request
- Encrypted local credential storage using macOS Keychain (macOS) and Windows Credential Manager (Windows) — macOS Keychain now implemented
- Automatic service installers and health supervision for Windows and macOS
- Per-action rollback metadata and a dedicated emergency stop
- Home Assistant plus router-specific read-only connectors before any network writes
