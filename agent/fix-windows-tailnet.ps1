#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Recover general internet on Windows when Tailscale exit node or DNS is broken.

.DESCRIPTION
  Common failure: Windows is set to use exit node "goliathsystem" while that node is
  offline. All traffic routes to a dead gateway — browsers, npm, Base44, etc. fail.

  Run locally on each affected Windows PC (DHD-Admin, DESKTOP-HN4P1BS, etc.).
  Does NOT change Tailscale login or keys.
#>
$ErrorActionPreference = 'Continue'

function Test-Endpoint {
  param([string]$Name, [string]$Host, [int]$Port = 443)
  $result = Test-NetConnection -ComputerName $Host -Port $Port -WarningAction SilentlyContinue
  [PSCustomObject]@{
    Name = $Name
    Host = $Host
    Port = $Port
    Ok   = [bool]$result.TcpTestSucceeded
  }
}

Write-Host ""
Write-Host "=== TIM Windows Tailnet / Internet Recovery ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "Before:" -ForegroundColor Yellow
tailscale status
Write-Host ""

Write-Host "Step 1: Clear exit node (fixes black-hole when goliathsystem is offline)..." -ForegroundColor Green
tailscale set --exit-node= --exit-node-allow-lan-access=false
if ($LASTEXITCODE -ne 0) {
  Write-Warning "tailscale set failed. Is Tailscale installed and logged in?"
}

Write-Host "Step 2: Use system DNS instead of Tailscale DNS (fixes many app lookups)..." -ForegroundColor Green
tailscale set --accept-dns=false

Write-Host "Step 3: Restart Tailscale service..." -ForegroundColor Green
Restart-Service Tailscale -Force
Start-Sleep -Seconds 4

Write-Host ""
Write-Host "Connectivity tests:" -ForegroundColor Yellow
Test-Endpoint -Name "Cloudflare DNS" -Host "1.1.1.1" | Format-Table -AutoSize
Test-Endpoint -Name "Google HTTPS" -Host "google.com" | Format-Table -AutoSize
Test-Endpoint -Name "Tailscale control" -Host "controlplane.tailscale.com" | Format-Table -AutoSize
Test-Endpoint -Name "Base44" -Host "base44.app" | Format-Table -AutoSize

Write-Host ""
Write-Host "After:" -ForegroundColor Yellow
tailscale status
Write-Host ""
Write-Host "If Cloudflare/Google show Ok=True, general internet is back." -ForegroundColor Cyan
Write-Host "Re-enable Tailscale DNS later only if you need MagicDNS:" -ForegroundColor Cyan
Write-Host "  tailscale set --accept-dns=true" -ForegroundColor Gray
Write-Host ""
Write-Host "Do NOT re-select exit node goliathsystem unless it is online in tailscale status." -ForegroundColor Yellow
Write-Host ""
