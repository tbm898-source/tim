#!/usr/bin/env bash
# agent/macos/run-tim-edge.sh
#
# Runtime wrapper for the TIM edge agent on macOS.
#
# - Loads non-secret configuration from ~/.config/tim-edge/agent.env
#   by parsing it explicitly (does NOT use `source`).
# - Retrieves TIM_COMMAND_SIGNING_SECRET from macOS Keychain.
# - Never prints the signing secret.
# - Rejects any unknown variable names or values containing shell syntax.
# - Aborts if config file or directory permissions are looser than expected.
# - Does NOT edit any shell profile.
set -euo pipefail

KEYCHAIN_SERVICE="TIM Edge Agent"
CONFIG_FILE="$HOME/.config/tim-edge/agent.env"
CONFIG_DIR="$(dirname "$CONFIG_FILE")"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd)"

# ---------------------------------------------------------------------------
# Allowlisted variable names — only these may appear in agent.env
# ---------------------------------------------------------------------------
readonly -a ALLOWED_VARS=(
  TIM_AGENT_ENDPOINT
  TIM_NODE_ID
  TIM_NODE_NAME
  TIM_TRUST_LEVEL
  TIM_ALLOWED_WORKSPACES
  TIM_ALLOWED_SHORTCUTS
  TIM_ANDROID_STUDIO_PATH
  TIM_ADB_PATH
  TIM_NPM_BIN
  TIM_POLL_INTERVAL_MS
)

# ---------------------------------------------------------------------------
# Permission checks
# ---------------------------------------------------------------------------

dir_perms="$(stat -f '%OLp' "$CONFIG_DIR" 2>/dev/null || echo 'missing')"
file_perms="$(stat -f '%OLp' "$CONFIG_FILE" 2>/dev/null || echo 'missing')"

if [[ "$dir_perms" == 'missing' || "$file_perms" == 'missing' ]]; then
  echo "ERROR: $CONFIG_FILE not found. Run agent/setup-mac.sh first." >&2
  exit 1
fi

if [[ "$dir_perms" != '700' ]]; then
  echo "ERROR: $CONFIG_DIR must have permissions 700 (found $dir_perms). Fix with: chmod 700 $CONFIG_DIR" >&2
  exit 1
fi

if [[ "$file_perms" != '600' ]]; then
  echo "ERROR: $CONFIG_FILE must have permissions 600 (found $file_perms). Fix with: chmod 600 $CONFIG_FILE" >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Parse agent.env — allowlist-only, no source, no shell execution
# ---------------------------------------------------------------------------

is_allowed_var() {
  local name="$1"
  for allowed in "${ALLOWED_VARS[@]}"; do
    [[ "$name" == "$allowed" ]] && return 0
  done
  return 1
}

while IFS= read -r line || [[ -n "$line" ]]; do
  # Skip blank lines and comments
  [[ -z "$line" || "$line" == \#* ]] && continue

  # Split on first '='
  var_name="${line%%=*}"
  var_value="${line#*=}"

  # Strip leading/trailing whitespace from name
  var_name="${var_name#"${var_name%%[![:space:]]*}"}"
  var_name="${var_name%"${var_name##*[![:space:]]}"}"

  # Reject unknown variable names
  if ! is_allowed_var "$var_name"; then
    echo "ERROR: Unknown variable '$var_name' in $CONFIG_FILE. Aborting." >&2
    exit 1
  fi

  # Reject values containing command substitution or backticks
  if [[ "$var_value" == *'$('* || "$var_value" == *'`'* ]]; then
    echo "ERROR: Value of '$var_name' contains forbidden shell syntax. Aborting." >&2
    exit 1
  fi

  # Reject values containing embedded newlines (would truncate unexpectedly)
  if [[ "$var_value" == *$'\n'* ]]; then
    echo "ERROR: Value of '$var_name' contains a newline. Aborting." >&2
    exit 1
  fi

  export "$var_name=$var_value"
done < "$CONFIG_FILE"

# ---------------------------------------------------------------------------
# Resolve npm without relying on interactive shell profiles
# ---------------------------------------------------------------------------

resolve_npm() {
  if [[ -n "${TIM_NPM_BIN:-}" && -x "$TIM_NPM_BIN" ]]; then
    printf '%s\n' "$TIM_NPM_BIN"
    return 0
  fi

  local candidate
  for candidate in /opt/homebrew/bin/npm /usr/local/bin/npm /usr/bin/npm; do
    if [[ -x "$candidate" ]]; then
      printf '%s\n' "$candidate"
      return 0
    fi
  done

  if command -v npm >/dev/null 2>&1; then
    command -v npm
    return 0
  fi

  return 1
}

if ! NPM_BIN="$(resolve_npm)"; then
  echo "ERROR: npm was not found. Install Node.js or set TIM_NPM_BIN in $CONFIG_FILE." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
# Retrieve signing secret from Keychain — never from the config file
# ---------------------------------------------------------------------------

TIM_COMMAND_SIGNING_SECRET=""
if ! TIM_COMMAND_SIGNING_SECRET="$(security find-generic-password \
    -a "$USER" \
    -s "$KEYCHAIN_SERVICE" \
    -w 2>/dev/null)"; then
  echo "ERROR: Could not retrieve signing secret from Keychain (service='$KEYCHAIN_SERVICE', account='$USER')." >&2
  echo "       Run agent/setup-mac.sh to configure the Keychain item." >&2
  exit 1
fi

if [[ -z "$TIM_COMMAND_SIGNING_SECRET" ]]; then
  echo "ERROR: Keychain returned an empty secret. Re-run agent/setup-mac.sh." >&2
  exit 1
fi

export TIM_COMMAND_SIGNING_SECRET

# ---------------------------------------------------------------------------
# Start the agent
# ---------------------------------------------------------------------------

cd "$REPO_ROOT"
exec "$NPM_BIN" run agent:run
