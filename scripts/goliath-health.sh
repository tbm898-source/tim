#!/usr/bin/env bash
# scripts/goliath-health.sh — quick Goliath health from Mac (SSH as macro).
set -euo pipefail

HOST="${GOLIATH_SSH_HOST:-goliathsystem}"

ssh -o BatchMode=yes -o ConnectTimeout=10 "$HOST" 'bash -s' <<'REMOTE'
set -euo pipefail
echo "== host =="
hostname
uptime -p 2>/dev/null || uptime
echo
echo "== zpool =="
zpool status "Main Pool"
echo
echo "== zfs datasets =="
zfs list -o name,used,avail,refer,mountpoint -r "Main Pool"
echo
echo "== disk =="
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,MODEL | grep -E 'NAME|sd|ubuntu|Main' || lsblk -o NAME,SIZE,TYPE,MOUNTPOINT,MODEL
echo
echo "== root / data free =="
df -hT / "/Main Pool" 2>/dev/null || df -hT /
echo
echo "== canonical tree =="
ls -la "/Main Pool/canonical" 2>/dev/null || echo "(missing)"
REMOTE
