#!/usr/bin/env bash
# agent_coordination/ssh/install-on-mac.sh
#
# Appends Tailscale SSH host entries for DHD-ADMIN and GoliathSystem to ~/.ssh/config.
# Optionally installs Codex pubkey into ~/.ssh/authorized_keys for reverse Windows → Mac.
set -euo pipefail

DIR="$(dirname "$0")"
SSH_CONFIG="$HOME/.ssh/config"
AUTH="$HOME/.ssh/authorized_keys"
CODEX_PUB="$DIR/keys/codex-dhd-admin.pub"

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
touch "$SSH_CONFIG"
chmod 600 "$SSH_CONFIG"

if [[ -f "$CODEX_PUB" ]] && ! grep -q 'Placeholder' "$CODEX_PUB"; then
  touch "$AUTH"
  chmod 600 "$AUTH"
  if ! grep -qF "$(tr -d '\r' < "$CODEX_PUB" | head -1)" "$AUTH" 2>/dev/null; then
    tr -d '\r' < "$CODEX_PUB" | head -1 >> "$AUTH"
    echo "Added Codex key to $AUTH"
  else
    echo "Codex key already in $AUTH"
  fi
else
  echo "Skip authorized_keys — codex-dhd-admin.pub not ready yet."
fi

append_block() {
  local marker_begin="$1"
  local marker_end="$2"
  local snippet_file="$3"
  local label="$4"
  local already_host_pattern="${5:-}"

  if [[ ! -f "$snippet_file" ]]; then
    echo "Missing $snippet_file" >&2
    exit 1
  fi

  if grep -q "$marker_begin" "$SSH_CONFIG" 2>/dev/null; then
    echo "SSH config block for $label already present."
    return 0
  fi

  if [[ -n "$already_host_pattern" ]] && grep -Eq "$already_host_pattern" "$SSH_CONFIG" 2>/dev/null; then
    echo "Host entry for $label already exists (unmarked). Skipping snippet to avoid duplicates."
    return 0
  fi

  {
    echo ""
    echo "$marker_begin"
    cat "$snippet_file"
    echo "$marker_end"
  } >> "$SSH_CONFIG"
  echo "Appended $label host block to $SSH_CONFIG"
}

append_block '# BEGIN tim-dhd-admin' '# END tim-dhd-admin' "$DIR/ssh-config.snippet" 'DHD-ADMIN' '^Host dhd-admin'
append_block '# BEGIN tim-goliathsystem' '# END tim-goliathsystem' "$DIR/ssh-config-goliath.snippet" 'GoliathSystem' '^Host goliathsystem'

echo ""
echo "Next:"
echo "  ssh dhd-admin hostname     # already trusted"
echo "  # One-time Goliath trust (password or console), then:"
echo "  ssh-copy-id -i ~/.ssh/id_ed25519.pub macro@100.113.126.122"
echo "  # or on Goliath as macro: bash install-on-goliath.sh"
echo "  ssh goliathsystem hostname"
