#Requires -Version 5.1
<#
.SYNOPSIS
  Install Cursor Mac SSH public key on DHD-Admin for agent coordination.
  Run on DHD-Admin after: git pull origin main
#>
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$PubKeyPath = Join-Path $PSScriptRoot 'keys\cursor-macbook-air.pub'

if (-not (Test-Path $PubKeyPath)) {
  Write-Error "Missing $PubKeyPath — git pull origin main first."
}

$pubKey = (Get-Content $PubKeyPath -Raw).Trim()
if ($pubKey -match 'Placeholder') {
  Write-Error "cursor-macbook-air.pub is still a placeholder."
}

$sshDir = Join-Path $env:USERPROFILE '.ssh'
$authKeys = Join-Path $sshDir 'authorized_keys'
New-Item -ItemType Directory -Force -Path $sshDir | Out-Null

$existing = @()
if (Test-Path $authKeys) {
  $existing = Get-Content $authKeys
}

if ($existing -contains $pubKey) {
  Write-Host "Key already in authorized_keys."
} else {
  Add-Content -Path $authKeys -Value $pubKey -Encoding utf8
  Write-Host "Added Cursor key to $authKeys"
}

# Ensure OpenSSH Server is available (admin may be required)
$cap = Get-WindowsCapability -Online | Where-Object { $_.Name -like 'OpenSSH.Server*' }
if ($cap -and $cap.State -ne 'Installed') {
  Write-Host "Installing OpenSSH Server (may prompt for admin)..."
  Add-WindowsCapability -Online -Name $cap.Name
}

$svc = Get-Service -Name sshd -ErrorAction SilentlyContinue
if ($svc) {
  Set-Service -Name sshd -StartupType Automatic
  if ($svc.Status -ne 'Running') {
    Start-Service sshd
  }
  Write-Host "sshd status: $((Get-Service sshd).Status)"
} else {
  Write-Warning "sshd service not found — enable OpenSSH Server in Windows Optional Features."
}

# Generate Codex agent key if missing (pub committed separately by Codex)
$codexKey = Join-Path $sshDir 'id_ed25519_tim_agent'
if (-not (Test-Path $codexKey)) {
  Write-Host "Generating Codex agent key at $codexKey ..."
  ssh-keygen -t ed25519 -f $codexKey -C 'tim-agent-codex@dhd-admin' -N '""' | Out-Null
  $outPub = Join-Path $RepoRoot 'agent_coordination\ssh\keys\codex-dhd-admin.pub'
  Copy-Item "$codexKey.pub" $outPub -Force
  Write-Host "Wrote $outPub — commit and push so Mac can install reverse access."
}

Write-Host ""
Write-Host "Done. Mac should run: ssh $env:USERNAME@dhd-admin hostname"
Write-Host "Or add ssh-config.snippet on Mac and use: ssh dhd-admin hostname"
