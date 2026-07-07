$ErrorActionPreference = 'Stop'
$agentRoot = $PSScriptRoot
$repoRoot = Split-Path $agentRoot -Parent
$profilePath = Join-Path $agentRoot '.env.dhd-admin'
$envPath = Join-Path $agentRoot '.env'

if (-not (Test-Path $profilePath)) {
  Write-Error "Missing $profilePath. Wait for Dropbox sync, then retry."
}

Copy-Item $profilePath $envPath -Force
Set-Location $repoRoot

Write-Host "Starting TIM edge agent as dhd-admin..."
npm run agent:run
