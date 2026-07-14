#!/usr/bin/env bash
# agent/setup-mac.sh — one-time Mac configuration for the TIM edge agent.
#
# Stores TIM_COMMAND_SIGNING_SECRET in macOS Keychain (never in a file).
# Writes non-secret settings to ~/.config/tim-edge/agent.env.
# Does NOT edit shell profiles.
set -euo pipefail

KEYCHAIN_SERVICE="TIM Edge Agent"
CONFIG_DIR="$HOME/.config/tim-edge"
CONFIG_FILE="$CONFIG_DIR/agent.env"
DEFAULT_APP_ID="695cfbf7fba07f58d25ff8bb"

print_step() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
print_ok()   { printf '\033[0;32m    ok: %s\033[0m\n' "$1"; }
print_err()  { printf '\033[0;31m    error: %s\033[0m\n' "$1" >&2; }

# ---------------------------------------------------------------------------
# Base44 server URL (not the bare website root — the agent appends the bridge path)
# ---------------------------------------------------------------------------

print_step "Base44 server URL"
printf '    Enter TIM_BASE44_SERVER_URL (must start with https://, e.g. https://base44.app): '
read -r TIM_BASE44_SERVER_URL
TIM_BASE44_SERVER_URL="${TIM_BASE44_SERVER_URL#"${TIM_BASE44_SERVER_URL%%[![:space:]]*}"}"
TIM_BASE44_SERVER_URL="${TIM_BASE44_SERVER_URL%"${TIM_BASE44_SERVER_URL##*[![:space:]]}"}"

if [[ "$TIM_BASE44_SERVER_URL" != https://* ]]; then
  print_err "Server URL must start with https://"
  exit 1
fi
TIM_BASE44_SERVER_URL="${TIM_BASE44_SERVER_URL%/}"
SERVER_HOST="${TIM_BASE44_SERVER_URL#https://}"
print_ok "Server host: $SERVER_HOST"
print_ok "Bridge path: ${TIM_BASE44_SERVER_URL}/api/apps/${DEFAULT_APP_ID}/functions/deviceAgentBridge"

# ---------------------------------------------------------------------------
# Signing secret → Keychain only
# ---------------------------------------------------------------------------

print_step "Signing secret (Keychain)"
printf '    Enter TIM_COMMAND_SIGNING_SECRET (64 hex chars, input hidden): '
read -rs TIM_COMMAND_SIGNING_SECRET
printf '\n'

if ! [[ "$TIM_COMMAND_SIGNING_SECRET" =~ ^[a-fA-F0-9]{64}$ ]]; then
  print_err "Secret must be exactly 64 hexadecimal characters."
  exit 1
fi

if security add-generic-password \
     -a "$USER" \
     -s "$KEYCHAIN_SERVICE" \
     -w "$TIM_COMMAND_SIGNING_SECRET" \
     -U 2>/dev/null; then
  print_ok "Keychain item created or updated (service='$KEYCHAIN_SERVICE', account='$USER')"
else
  print_err "Failed to write to Keychain."
  exit 1
fi
unset TIM_COMMAND_SIGNING_SECRET

# ---------------------------------------------------------------------------
# Workspaces
# ---------------------------------------------------------------------------

print_step "Workspace allowlist"
DEFAULT_WORKSPACES="$HOME/Developer:$HOME/Library/CloudStorage/Dropbox/CANONICAL/30_CODE:$HOME/Library/CloudStorage/Dropbox/CANONICAL"
VERIFIED_DEFAULTS=""
IFS=':' read -ra WS_PARTS <<< "$DEFAULT_WORKSPACES"
for ws in "${WS_PARTS[@]}"; do
  [[ -d "$ws" ]] && VERIFIED_DEFAULTS="${VERIFIED_DEFAULTS:+$VERIFIED_DEFAULTS:}$ws"
done
printf '    Verified defaults: %s\n' "$VERIFIED_DEFAULTS"
printf '    Press Enter to accept, or type colon-separated paths to override: '
read -r WS_INPUT
TIM_ALLOWED_WORKSPACES="${WS_INPUT:-$VERIFIED_DEFAULTS}"
WS_COUNT=0
IFS=':' read -ra WS_FINAL <<< "$TIM_ALLOWED_WORKSPACES"
for ws in "${WS_FINAL[@]}"; do [[ -n "$ws" ]] && WS_COUNT=$((WS_COUNT + 1)); done
print_ok "$WS_COUNT workspace(s) configured"

# ---------------------------------------------------------------------------
# Shortcuts
# ---------------------------------------------------------------------------

print_step "Shortcuts allowlist"
printf '    Enter comma-separated Shortcut names (empty = disable shortcut.run): '
read -r TIM_ALLOWED_SHORTCUTS
[[ -z "$TIM_ALLOWED_SHORTCUTS" ]] && print_ok "shortcut.run disabled" || print_ok "Shortcuts allowlisted"

# ---------------------------------------------------------------------------
# ADB path
# ---------------------------------------------------------------------------

ADB_DEFAULT="$HOME/Library/Android/sdk/platform-tools/adb"
[[ ! -x "$ADB_DEFAULT" ]] && ADB_DEFAULT="adb"

# ---------------------------------------------------------------------------
# Write non-secret config
# ---------------------------------------------------------------------------

print_step "Writing config file"
mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"

cat > "$CONFIG_FILE" <<EOF
TIM_BASE44_SERVER_URL=$TIM_BASE44_SERVER_URL
TIM_BASE44_APP_ID=$DEFAULT_APP_ID
TIM_NODE_ID=tim-primary-mac
TIM_NODE_NAME=Tim Primary Mac
TIM_TRUST_LEVEL=assist
TIM_ALLOWED_WORKSPACES=$TIM_ALLOWED_WORKSPACES
TIM_ALLOWED_SHORTCUTS=$TIM_ALLOWED_SHORTCUTS
TIM_ADB_PATH=$ADB_DEFAULT
EOF

chmod 600 "$CONFIG_FILE"
print_ok "Wrote $CONFIG_FILE (mode 600)"

print_step "Setup complete"
printf '    Node ID       : tim-primary-mac\n'
printf '    Server host   : %s\n' "$SERVER_HOST"
printf '    Workspaces    : %d\n' "$WS_COUNT"
printf '    Shortcuts     : %s\n' "${TIM_ALLOWED_SHORTCUTS:-<none>}"
printf '    Keychain      : service="%s" account="%s"\n' "$KEYCHAIN_SERVICE" "$USER"
printf '\n    Next steps:\n'
printf '      npm run agent:capabilities\n'
printf '      npm run agent:test\n'
printf '      bash agent/macos/run-tim-edge.sh\n'
