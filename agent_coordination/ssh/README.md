# SSH trust: Mac ↔ DHD-ADMIN ↔ GoliathSystem

Machine-to-machine SSH over Tailscale so Cursor (Mac), Codex (DHD-Admin), and Goliath can run remote checks without Tim typing passwords each time.

**Private keys never go in git.** Only `.pub` files live here.

## Current status (2026-07-14)

| Path | Status |
|------|--------|
| Mac → DHD-Admin | Working (`ssh dhd-admin`) |
| Mac → GoliathSystem | Working (`ssh goliathsystem` as **`macro`**) |
| DHD-Admin → Goliath TCP 22 | Reachable |
| Tailscale | `goliathsystem` online |

Mac key fingerprint (ed25519): `SHA256:rjGrgQqG9620go7YNeg/DDzqpYWoOyjDnohk8yoPEos`

## Keys in this folder

| File | Agent | Install on |
|------|-------|------------|
| `keys/cursor-macbook-air.pub` | Cursor (Mac) | DHD-Admin `administrators_authorized_keys`; Goliath `~macro/.ssh/authorized_keys` |
| `keys/codex-dhd-admin.pub` | Codex (optional) | Mac `~/.ssh/authorized_keys` for reverse Windows → Mac |

---

## Mac ↔ DHD-ADMIN

### Problem

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

### Optional reverse (Windows → Mac)

After Codex generates a key and commits `keys/codex-dhd-admin.pub`, run `install-on-mac.sh` on the Mac (it appends that pubkey when present).

---

## Mac ↔ GoliathSystem

Login user is **`macro`** (not `timmi`). Passwordless SSH should already work after the one-time key install.

```bash
bash agent_coordination/ssh/install-on-mac.sh
ssh goliathsystem hostname
npm run goliath:health
```

If keys are missing, one password login:

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub macro@100.113.126.122
```

Or run `install-on-goliath.sh` on the server console.

## Files

| File | Purpose |
|------|---------|
| `keys/cursor-macbook-air.pub` | Mac public key |
| `keys/codex-dhd-admin.pub` | Codex public key (optional reverse) |
| `ssh-config.snippet` | DHD-Admin (+ optional Mac) host blocks |
| `ssh-config-goliath.snippet` | Goliath host block |
| `install-on-mac.sh` | Appends host blocks; optional Codex key install |
| `install-on-dhd-admin.ps1` | Windows admin authorized_keys + ACLs |
| `install-on-goliath.sh` | Appends Mac pubkey on Goliath |

## Tailscale SSH (alternative)

If OpenSSH on Windows is painful, enable **Tailscale SSH** in the admin console for `dhd-admin` and use `tailscale ssh Tim Milkewicz@dhd-admin`. Still prefer plain `ssh` + keys for Dropbox/git scripts.

## Safety

- Never commit or paste **private** keys.
- Do not rotate/overwrite existing private keys by inference.
- Fingerprints and hostnames are fine in coordination notes.
