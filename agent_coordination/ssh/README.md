# SSH trust: Mac ↔ DHD-ADMIN ↔ GoliathSystem

## Current status (2026-07-11)

| Path | Status |
|------|--------|
| Mac → DHD-Admin | Working (`ssh dhd-admin`) |
| Mac → GoliathSystem | **Blocked until key install** — login user is **`macro`** (not `timmi`); sshd up; Mac pubkey not yet authorized |
| DHD-Admin → Goliath TCP 22 | Reachable |
| Tailscale | `goliathsystem` online, offers exit node |

Mac key fingerprint (ed25519): `SHA256:rjGrgQqG9620go7YNeg/DDzqpYWoOyjDnohk8yoPEos`

## Goal

Passwordless `ssh goliathsystem` from the Mac so we can inventory disks and finish the RAID plan (`01_OPS/REMINDERS/GOLIATH_RAID_PLAN.md`).

---

## Mac ↔ DHD-ADMIN (already done)

### Problem (Codex diagnosis)

DHD-ADMIN uses a **Windows administrator** account (`Tim Milkewicz`). OpenSSH routes admin logins to:

```
C:\ProgramData\ssh\administrators_authorized_keys
```

Keys in `%USERPROFILE%\.ssh\authorized_keys` are **ignored** for administrators.

### Setup

**On DHD-ADMIN (elevated PowerShell):**

```powershell
cd "C:\Users\Tim Milkewicz\Dropbox\CANONICAL\30_CODE\tim\agent_coordination\ssh"
powershell -ExecutionPolicy Bypass -File .\install-on-dhd-admin.ps1
```

**On Mac:**

```bash
bash agent_coordination/ssh/install-on-mac.sh
ssh dhd-admin hostname
```

---

## Mac ↔ GoliathSystem (do this next)

Goliath only accepts keys already in `~timmi/.ssh/authorized_keys`. Install the Mac key **once**, then passwordless SSH works.

### Option A — one password login from Mac (easiest)

Goliath account: **`macro`**. Do **not** paste the password into chat — type it only at the Terminal prompt.

```bash
cd /Users/timmi/Library/CloudStorage/Dropbox/CANONICAL/30_CODE/tim
bash agent_coordination/ssh/install-on-mac.sh
ssh-copy-id -i ~/.ssh/id_ed25519.pub macro@100.113.126.122
# enter macro's password once when prompted
ssh goliathsystem hostname
```

### Option B — physical console / iLO on the ProLiant

1. Log in as `macro` on the server.
2. Copy `agent_coordination/ssh/install-on-goliath.sh` onto the box (USB, Taildrop, or paste).
3. Run:

```bash
bash install-on-goliath.sh
```

### Verify + RAID inventory

```bash
ssh goliathsystem hostname
ssh goliathsystem 'lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT,MODEL'
```

Paste that `lsblk` output back into Cursor to finish the RAID plan (no disks mutated until you approve).

## Files

| File | Purpose |
|------|---------|
| `keys/cursor-macbook-air.pub` | Mac public key |
| `ssh-config.snippet` | DHD-Admin host block |
| `ssh-config-goliath.snippet` | Goliath host block |
| `install-on-mac.sh` | Appends both host blocks to `~/.ssh/config` |
| `install-on-dhd-admin.ps1` | Windows admin authorized_keys + ACLs |
| `install-on-goliath.sh` | Appends Mac pubkey on Goliath |

## Safety

- Never commit or paste **private** keys.
- Do not rotate/overwrite existing private keys by inference.
- Fingerprints and hostnames are fine in coordination notes.
