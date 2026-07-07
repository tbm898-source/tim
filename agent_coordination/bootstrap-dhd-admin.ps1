#Requires -Version 5.1
<#
.SYNOPSIS
  One-shot DHD-Admin bootstrap for Codex — run after git pull.
  Tim: double-click or run from elevated PowerShell if OpenSSH install needs admin.
#>
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent
Set-Location $RepoRoot

Write-Host "=== TIM DHD-Admin bootstrap ===" -ForegroundColor Cyan

Write-Host "`n[1/6] git pull origin main"
git pull origin main

Write-Host "`n[2/6] Tailnet recovery (if needed)"
$tailnetScript = Join-Path $RepoRoot 'agent\fix-windows-tailnet.ps1'
if (Test-Path $tailnetScript) {
  powershell -ExecutionPolicy Bypass -File $tailnetScript
}

Write-Host "`n[3/6] SSH keys (Mac <-> DHD-Admin)"
$sshScript = Join-Path $PSScriptRoot 'ssh\install-on-dhd-admin.ps1'
powershell -ExecutionPolicy Bypass -File $sshScript

Write-Host "`n[4/6] Coord check-in"
npm run coord:check-in -- --agent codex

Write-Host "`n[5/6] Agent health"
npm run agent:health
if ($LASTEXITCODE -ne 0) {
  Write-Warning "Agent health failed — check agent/.env and Base44 secrets."
}

Write-Host "`n[6/6] Commit Codex SSH pub if generated"
$codexPub = Join-Path $PSScriptRoot 'ssh\keys\codex-dhd-admin.pub'
if ((Test-Path $codexPub) -and -not (Select-String -Path $codexPub -Pattern 'Placeholder' -Quiet)) {
  git add agent_coordination/ssh/keys/codex-dhd-admin.pub
  $status = git status --porcelain agent_coordination/ssh/keys/codex-dhd-admin.pub
  if ($status) {
    git commit -m "coord: add codex SSH public key"
    git push origin main
    Write-Host "Pushed codex-dhd-admin.pub"
  }
}

Write-Host "`n=== Ack Cursor in INBOX.md + STATE.json, then start agent ===" -ForegroundColor Green
Write-Host "  powershell -ExecutionPolicy Bypass -File agent\run-dhd-admin.ps1"
Write-Host "  Or scheduled task: agent\install-dhd-admin-autostart.ps1"
