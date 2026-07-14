#!/usr/bin/env bash
# agent/macos/run-tim-edge.sh — runtime wrapper for the TIM edge agent on macOS.
#
# Parses ~/.config/tim-edge/agent.env (allowlist only, no source).
# Retrieves TIM_COMMAND_SIGNING_SECRET from Keychain.
# Never prints the secret.
set -euo pipefail

KEYCHAIN_SERVICE="TIM Edge Agent"
CONFIG_FILE="$HOME/.config/tim-edge/agent.env"
CONFIG_DIR="$(dirname "$CONFIG_FILE")"
REPO_ROOT="/Users/timmi/Library/CloudStorage/Dropbox/CANONICAL/30_CODE/tim"
NPM_BIN="/opt/homebrew/bin/npm"

readonly -a ALLOWED_VARS=(
  TIM_BASE44_SERVER_URL
  TIM_BASE44_APP_ID
  TIM_NODE_ID
  TIM_NODE_NAME
  TIM_TRUST_LEVEL
  TIM_ALLOWED_WORKSPACES
  TIM_ALLOWED_SHORTCUTS
  TIM_ANDROID_STUDIO_PATH
  TIM_ADB_PATH
  TIM_POLL_INTERVAL_MS
)

dir_perms="$(stat -f '%OLp' "$CONFIG_DIR" 2>/dev/null || echo 'missing')"
file_perms="$(stat -f '%OLp' "$CONFIG_FILE" 2>/dev/null || echo 'missing')"

if [[ "$dir_perms" == 'missing' || "$file_perms" == 'missing' ]]; then
  echo "ERROR: $CONFIG_FILE not found. Run: bash agent/setup-mac.sh" >&2
  exit 1
fi
if [[ "$dir_perms" != '700' ]]; then
  echo "ERROR: $CONFIG_DIR must be mode 700 (found $dir_perms)." >&2
  exit 1
fi
if [[ "$file_perms" != '600' ]]; then
  echo "ERROR: $CONFIG_FILE must be mode 600 (found $file_perms)." >&2
  exit 1
fi

is_allowed_var() {
  local name="$1"
  for allowed in "${ALLOWED_VARS[@]}"; do
    [[ "$name" == "$allowed" ]] && return 0
  done
  return 1
}

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" == \#* ]] && continue
  var_name="${line%%=*}"
  var_value="${line#*=}"
  var_name="${var_name#"${var_name%%[![:space:]]*}"}"
  var_name="${var_name%"${var_name##*[![:space:]]}"}"
  if ! is_allowed_var "$var_name"; then
    echo "ERROR: Unknown variable '$var_name' in $CONFIG_FILE." >&2
    exit 1
  fi
  if [[ "$var_value" == *'$('* || "$var_value" == *'`'* || "$var_value" == *$'\n'* ]]; then
    echo "ERROR: Value of '$var_name' contains forbidden shell syntax." >&2
    exit 1
  fi
  export "$var_name=$var_value"
done < "$CONFIG_FILE"

if ! TIM_COMMAND_SIGNING_SECRET="$(security find-generic-password -a "$USER" -s "$KEYCHAIN_SERVICE" -w 2>/dev/null)"; then
  echo "ERROR: Could not retrieve signing secret from Keychain (service='$KEYCHAIN_SERVICE')." >&2
  echo "       Run: bash agent/setup-mac.sh" >&2
  exit 1
fi
if [[ -z "$TIM_COMMAND_SIGNING_SECRET" ]]; then
  echo "ERROR: Keychain returned an empty secret. Re-run setup." >&2
  exit 1
fi
export TIM_COMMAND_SIGNING_SECRET

cd "$REPO_ROOT"
exec "$NPM_BIN" run agent:run
