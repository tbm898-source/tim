#!/usr/bin/env bash
# scripts/macos/run-classroom-bridge.sh — LaunchAgent wrapper for Classroom bridge.
set -euo pipefail

CONFIG_FILE="$HOME/.config/tim-classroom-bridge/agent.env"
LOG_DIR="$HOME/Library/Logs/TIM"
mkdir -p "$LOG_DIR"

export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "ERROR: $CONFIG_FILE not found. Run: npm run teach:wizard" >> "$LOG_DIR/classroom-bridge-error.log"
  exit 1
fi

# shellcheck disable=SC1090
source "$CONFIG_FILE"

if [[ -z "${TIM_ROOT:-}" || ! -d "$TIM_ROOT" ]]; then
  echo "ERROR: Invalid TIM_ROOT in $CONFIG_FILE" >> "$LOG_DIR/classroom-bridge-error.log"
  exit 1
fi

if [[ ! -f "${BRIDGE_ROOT:-}/token.json" ]]; then
  echo "ERROR: Google OAuth missing. Run: npm run teach:auth-google" >> "$LOG_DIR/classroom-bridge-error.log"
  exit 1
fi

cd "$TIM_ROOT"
exec npm run teach:serve >> "$LOG_DIR/classroom-bridge.log" 2>> "$LOG_DIR/classroom-bridge-error.log"
