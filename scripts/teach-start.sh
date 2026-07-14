#!/usr/bin/env bash
# Start the local Classroom bridge for one-click post in TIM.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BRIDGE="$(cd "$ROOT/../classroom-chatgpt-bridge" && pwd)"

if [[ ! -d "$BRIDGE" ]]; then
  echo "Bridge not found at $BRIDGE"
  echo "Run: npm run teach:setup"
  exit 1
fi

if [[ ! -f "$BRIDGE/token.json" ]]; then
  echo "Google OAuth not set up yet."
  echo "Run once: npm run teach:auth-google"
  exit 1
fi

echo "Starting Classroom bridge (TIM one-click post)…"
echo "Keep this terminal open during class. Ctrl+C to stop."
exec npm --prefix "$BRIDGE" run serve
