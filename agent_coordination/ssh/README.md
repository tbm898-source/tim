# Agent SSH keys

Machine-to-machine SSH over Tailscale so Cursor (Mac) and Codex (DHD-Admin) can run remote checks without Tim.

**Private keys never go in git.** Only `.pub` files live here.

## Keys in this folder

| File | Agent | Install on |
|------|-------|------------|
| `keys/cursor-macbook-air.pub` | Cursor | DHD-Admin `authorized_keys` |
| `keys/codex-dhd-admin.pub` | Codex | Mac `~/.ssh/authorized_keys` (optional reverse) |

## One-time setup

### Codex on DHD-Admin (required for Mac → Windows)

```powershell
cd "C:\Users\Tim Milkewicz\Dropbox\CANONICAL\30_CODE\tim"
git pull origin main
powershell -ExecutionPolicy Bypass -File agent_coordination\ssh\install-on-dhd-admin.ps1
```

Then from Mac:

```bash
ssh dhd-admin "hostname"
```

### Cursor on Mac (optional reverse: Windows → Mac)

After Codex generates a key and commits `keys/codex-dhd-admin.pub`:

```powershell
# On DHD-Admin — generate once, commit pub only
ssh-keygen -t ed25519 -f $env:USERPROFILE\.ssh\id_ed25519_tim_agent -C "tim-agent-codex@dhd-admin" -N '""'
Get-Content $env:USERPROFILE\.ssh\id_ed25519_tim_agent.pub
# Paste into agent_coordination/ssh/keys/codex-dhd-admin.pub, commit, push
```

```bash
# On Mac
bash agent_coordination/ssh/install-on-mac.sh
ssh macbook-air "hostname"   # from Windows, after config
```

## Mac `~/.ssh/config` snippet

Merge `ssh-config.snippet` into `~/.ssh/config` (or run `install-on-mac.sh` which appends if missing).

## Tailscale SSH (alternative)

If OpenSSH on Windows is painful, enable **Tailscale SSH** in the admin console for `dhd-admin` and use `tailscale ssh Tim Milkewicz@dhd-admin`. Still add keys for plain `ssh` if you want Dropbox/git scripts to work the same way.

## Verify

```bash
tailscale ping dhd-admin
ssh -o BatchMode=yes dhd-admin "whoami && cd /d C:\\Users\\Tim Milkewicz\\Dropbox\\CANONICAL\\30_CODE\\tim && git rev-parse --short HEAD"
```
