#!/usr/bin/env bash
# agent/setup-mac.sh
#
# Configures the TIM edge agent on this Mac.
#
# What this script does:
#   1. Prompts for the bridge endpoint and signing secret.
#   2. Stores the signing secret in macOS Keychain (never in a file).
#   3. Writes non-secret configuration to ~/.config/tim-edge/agent.env.
#   4. Does NOT edit .zshrc, .zprofile, .bash_profile, or any shell profile.
#   5. Does NOT print the signing secret at any point.
#
# After running this script:
#   npm run agent:capabilities
#   npm run agent:test
#   bash agent/macos/run-tim-edge.sh   # to start the agent manually
set -euo pipefail

KEYCHAIN_SERVICE="TIM Edge Agent"
CONFIG_DIR="$HOME/.config/tim-edge"
CONFIG_FILE="$CONFIG_DIR/agent.env"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

print_step() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
print_ok()   { printf '\033[0;32m    ok: %s\033[0m\n' "$1"; }
print_err()  { printf '\033[0;31m    error: %s\033[0m\n' "$1" >&2; }

# ---------------------------------------------------------------------------
# Step 1 — Bridge endpoint
# ---------------------------------------------------------------------------

print_step "Bridge endpoint"
printf '    Enter the TIM_AGENT_ENDPOINT (must start with https://): '
read -r TIM_AGENT_ENDPOINT
TIM_AGENT_ENDPOINT="${TIM_AGENT_ENDPOINT# }"
TIM_AGENT_ENDPOINT="${TIM_AGENT_ENDPOINT% }"

if [[ "$TIM_AGENT_ENDPOINT" != https://* ]]; then
  print_err "Endpoint must start with https://"
  exit 1
fi
ENDPOINT_HOST="${TIM_AGENT_ENDPOINT#https://}"
ENDPOINT_HOST="${ENDPOINT_HOST%%/*}"
print_ok "Endpoint host: $ENDPOINT_HOST"

# ---------------------------------------------------------------------------
# Step 2 — Signing secret (goes to Keychain only, never printed)
# ---------------------------------------------------------------------------

print_step "Signing secret (Keychain)"
printf '    Enter TIM_COMMAND_SIGNING_SECRET (64 hex chars, input hidden): '
read -rs TIM_COMMAND_SIGNING_SECRET
printf '\n'

if ! [[ "$TIM_COMMAND_SIGNING_SECRET" =~ ^[a-fA-F0-9]{64}$ ]]; then
  print_err "Secret must be exactly 64 hexadecimal characters."
  exit 1
fi

# Store in Keychain — update if already exists (-U flag)
if security add-generic-password \
     -a "$USER" \
     -s "$KEYCHAIN_SERVICE" \
     -w "$TIM_COMMAND_SIGNING_SECRET" \
     -U 2>/dev/null; then
  print_ok "Keychain item created or updated for service '$KEYCHAIN_SERVICE' account '$USER'"
else
  print_err "Failed to write to Keychain. Check that you have access to the login keychain."
  exit 1
fi
# Clear from shell memory immediately after Keychain write
unset TIM_COMMAND_SIGNING_SECRET

# ---------------------------------------------------------------------------
# Step 3 — Workspace allowlist
# ---------------------------------------------------------------------------

print_step "Workspace allowlist"
DEFAULT_WORKSPACES="$HOME/Developer:$HOME/Library/CloudStorage/Dropbox/CANONICAL/30_CODE:$HOME/Library/CloudStorage/Dropbox/CANONICAL"

# Remove paths that do not exist
VERIFIED_DEFAULTS=""
IFS=':' read -ra WS_PARTS <<< "$DEFAULT_WORKSPACES"
for ws in "${WS_PARTS[@]}"; do
  if [[ -d "$ws" ]]; then
    VERIFIED_DEFAULTS="${VERIFIED_DEFAULTS:+$VERIFIED_DEFAULTS:}$ws"
  fi
done

printf '    Verified defaults: %s\n' "$VERIFIED_DEFAULTS"
printf '    Press Enter to accept, or type colon-separated paths to override: '
read -r WS_INPUT
TIM_ALLOWED_WORKSPACES="${WS_INPUT:-$VERIFIED_DEFAULTS}"

WS_COUNT=0
IFS=':' read -ra WS_FINAL <<< "$TIM_ALLOWED_WORKSPACES"
for ws in "${WS_FINAL[@]}"; do
  [[ -n "$ws" ]] && WS_COUNT=$((WS_COUNT + 1))
done
print_ok "$WS_COUNT workspace(s) configured"

# ---------------------------------------------------------------------------
# Step 4 — Shortcut allowlist (empty disables shortcut.run)
# ---------------------------------------------------------------------------

print_step "Shortcuts allowlist"
printf '    Enter comma-separated Shortcut names to allow (leave empty to disable shortcut.run): '
read -r TIM_ALLOWED_SHORTCUTS

if [[ -z "$TIM_ALLOWED_SHORTCUTS" ]]; then
  print_ok "shortcut.run disabled (empty allowlist)"
else
  SC_COUNT=$(echo "$TIM_ALLOWED_SHORTCUTS" | tr ',' '\n' | grep -c '.')
  print_ok "$SC_COUNT Shortcut(s) allowlisted"
fi

# ---------------------------------------------------------------------------
# Step 5 — Detect ADB path
# ---------------------------------------------------------------------------

ADB_DEFAULT="$HOME/Library/Android/sdk/platform-tools/adb"
if [[ ! -x "$ADB_DEFAULT" ]]; then
  ADB_DEFAULT="adb"
fi
TIM_ADB_PATH="$ADB_DEFAULT"

# ---------------------------------------------------------------------------
# Step 6 — Detect npm path for non-interactive LaunchAgent runs
# ---------------------------------------------------------------------------

print_step "Node/npm runtime"
TIM_NPM_BIN="$(command -v npm || true)"
if [[ -z "$TIM_NPM_BIN" ]]; then
  for candidate in /opt/homebrew/bin/npm /usr/local/bin/npm /usr/bin/npm; do
    if [[ -x "$candidate" ]]; then
      TIM_NPM_BIN="$candidate"
      break
    fi
  done
fi

if [[ -z "$TIM_NPM_BIN" ]]; then
  print_err "npm was not found. Install Node.js first, then re-run setup."
  exit 1
fi
print_ok "npm: $TIM_NPM_BIN"

# ---------------------------------------------------------------------------
# Step 7 — Write non-secret config file
# ---------------------------------------------------------------------------

print_step "Writing config file"
mkdir -p "$CONFIG_DIR"
chmod 700 "$CONFIG_DIR"

cat > "$CONFIG_FILE" <<EOF
TIM_AGENT_ENDPOINT=$TIM_AGENT_ENDPOINT
TIM_NODE_ID=tim-primary-mac
TIM_NODE_NAME=Tim Primary Mac
TIM_TRUST_LEVEL=assist
TIM_ALLOWED_WORKSPACES=$TIM_ALLOWED_WORKSPACES
TIM_ALLOWED_SHORTCUTS=$TIM_ALLOWED_SHORTCUTS
TIM_ADB_PATH=$TIM_ADB_PATH
TIM_NPM_BIN=$TIM_NPM_BIN
EOF

chmod 600 "$CONFIG_FILE"
print_ok "Wrote $CONFIG_FILE (mode 600)"
print_ok "Directory $CONFIG_DIR (mode 700)"

# ---------------------------------------------------------------------------
# Summary (non-sensitive only)
# ---------------------------------------------------------------------------

print_step "Setup complete"
printf '    Node ID        : tim-primary-mac\n'
printf '    Endpoint host  : %s\n' "$ENDPOINT_HOST"
printf '    Workspaces     : %d\n' "$WS_COUNT"
printf '    Shortcuts      : %s\n' "${TIM_ALLOWED_SHORTCUTS:-<none — shortcut.run disabled>}"
printf '    ADB path       : %s\n' "$TIM_ADB_PATH"
printf '    npm path       : %s\n' "$TIM_NPM_BIN"
printf '    Keychain item  : service="%s" account="%s"\n' "$KEYCHAIN_SERVICE" "$USER"
printf '\n'
printf '    Next steps:\n'
printf '      npm run agent:capabilities\n'
printf '      npm run agent:test\n'
printf '      bash agent/macos/run-tim-edge.sh\n'
