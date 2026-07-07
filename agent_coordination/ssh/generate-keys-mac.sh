#!/usr/bin/env bash
# Ensure Mac has TIM agent SSH config (uses existing ~/.ssh/id_ed25519).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
bash "$SCRIPT_DIR/install-on-mac.sh"
if [[ ! -f "$HOME/.ssh/id_ed25519" ]]; then
  echo "No ~/.ssh/id_ed25519 — create one: ssh-keygen -t ed25519 -C tim-agent-cursor@macbook-air"
  exit 1
fi
echo "Mac key fingerprint:"
ssh-keygen -lf "$HOME/.ssh/id_ed25519.pub"
