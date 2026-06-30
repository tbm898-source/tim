$ErrorActionPreference = 'Stop'
$agentRoot = $PSScriptRoot
$repoRoot = Split-Path $agentRoot -Parent
$runner = Join-Path $agentRoot 'run-dhd-admin.ps1'
$taskName = 'TIM-Edge-Agent-dhd-admin'

if (-not (Test-Path $runner)) {
  Write-Error "Missing $runner"
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null
Write-Host "Registered scheduled task: $taskName"
Write-Host "It will start the dhd-admin agent at next logon, or run now with:"
Write-Host "  Start-ScheduledTask -TaskName '$taskName'"
