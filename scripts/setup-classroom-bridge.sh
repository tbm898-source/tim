#!/usr/bin/env bash
# One-time Classroom + ChatGPT bridge setup (Mac).
set -euo pipefail

BRIDGE="$(cd "$(dirname "$0")/../.." && pwd)/classroom-chatgpt-bridge"
TIM_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! -d "$BRIDGE" ]]; then
  echo "Missing bridge repo: $BRIDGE" >&2
  exit 1
fi

cd "$BRIDGE"
echo "==> Installing npm dependencies..."
npm install

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "==> Created .env — add OPENAI_API_KEY from https://platform.openai.com/api-keys"
else
  echo "==> .env already exists"
fi

if [[ ! -f config/aya-policy.json ]]; then
  cp config/aya-policy.example.json config/aya-policy.json
  echo "==> Created config/aya-policy.json"
fi

echo ""
echo "Next steps:"
echo "  1. Edit $BRIDGE/.env and set OPENAI_API_KEY"
echo "  2. Google Cloud: enable Classroom API, OAuth desktop client, download client_secret.json to bridge folder"
echo "  3. cd $TIM_ROOT && npm run teach:auth-google"
echo "  4. npm run teach:courses"
echo "  5. Open TIM → Classroom AI or Classroom Draft"
echo "  6. Optional — auto-start bridge at login: npm run teach:wizard"
echo ""

if grep -q '^OPENAI_API_KEY=$' .env 2>/dev/null || grep -q '^OPENAI_API_KEY=\s*$' .env 2>/dev/null; then
  echo "⚠ OPENAI_API_KEY is still empty in .env"
fi

if [[ ! -f token.json ]]; then
  echo "⚠ Google token.json not found — run: npm run teach:auth-google (from $TIM_ROOT)"
fi
