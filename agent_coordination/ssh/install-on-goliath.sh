#!/usr/bin/env bash
# agent_coordination/ssh/install-on-goliath.sh
#
# Run ON GoliathSystem as user macro (local console, iLO, or one-time password SSH).
# Installs the Mac Cursor ed25519 public key into ~/.ssh/authorized_keys.
# Does not print or move private keys.
set -euo pipefail

PUBKEY_LINE='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMxT4yvRwJQcHmfA45xWqkx4qIaPrQQJ9LNl2HkK2w0l timmi@macbook-air.tail833d79.ts.net'
MARKER='timmi@macbook-air.tail833d79.ts.net'
SSH_DIR="${HOME}/.ssh"
AUTH_KEYS="${SSH_DIR}/authorized_keys"

if [[ "$(whoami)" != "macro" ]]; then
  echo "Warning: expected user macro (got $(whoami)). Continuing with $HOME anyway."
fi

mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"
touch "$AUTH_KEYS"
chmod 600 "$AUTH_KEYS"

if grep -qF "$MARKER" "$AUTH_KEYS" 2>/dev/null; then
  echo "Mac pubkey already present in $AUTH_KEYS"
else
  echo "$PUBKEY_LINE" >> "$AUTH_KEYS"
  echo "Appended Mac pubkey to $AUTH_KEYS"
fi

# Permissions that OpenSSH on Ubuntu expects
chmod 700 "$SSH_DIR"
chmod 600 "$AUTH_KEYS"

echo "Fingerprint expected on Mac after success:"
echo "  ssh-keygen -lf ~/.ssh/id_ed25519.pub"
echo "  → SHA256:rjGrgQqG9620go7YNeg/DDzqpYWoOyjDnohk8yoPEos"
echo ""
echo "From Mac, test:"
echo "  ssh goliathsystem hostname"
echo "  ssh goliathsystem 'lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,MODEL'"
