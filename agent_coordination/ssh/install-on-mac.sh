#!/usr/bin/env bash
# Install Codex SSH public key on Mac + merge dhd-admin SSH config.
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SSH_DIR="$HOME/.ssh"
PUB="$REPO_ROOT/agent_coordination/ssh/keys/codex-dhd-admin.pub"
SNIPPET="$REPO_ROOT/agent_coordination/ssh/ssh-config.snippet"
CONFIG="$SSH_DIR/config"
AUTH="$SSH_DIR/authorized_keys"

mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"

if [[ -f "$PUB" ]] && ! grep -q 'Placeholder' "$PUB"; then
  touch "$AUTH"
  chmod 600 "$AUTH"
  if ! grep -qF "$(tr -d '\r' < "$PUB" | head -1)" "$AUTH" 2>/dev/null; then
    tr -d '\r' < "$PUB" | head -1 >> "$AUTH"
    echo "Added Codex key to $AUTH"
  else
    echo "Codex key already in $AUTH"
  fi
else
  echo "Skip authorized_keys — codex-dhd-admin.pub not ready yet."
fi

if [[ -f "$SNIPPET" ]]; then
  if [[ -f "$CONFIG" ]] && grep -q 'Host dhd-admin' "$CONFIG"; then
    echo "dhd-admin already in $CONFIG"
  else
    {
      echo ""
      echo "# TIM agent coordination (agent_coordination/ssh)"
      cat "$SNIPPET"
    } >> "$CONFIG"
    chmod 600 "$CONFIG"
    echo "Appended ssh-config.snippet to $CONFIG"
  fi
fi

echo "Mac SSH config ready. Test after Codex runs install-on-dhd-admin.ps1:"
echo "  ssh dhd-admin hostname"
