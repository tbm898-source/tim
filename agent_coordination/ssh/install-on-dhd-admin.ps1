#Requires -RunAsAdministrator
<#
.SYNOPSIS
  Install Mac SSH public key for DHD-Admin administrator login.

.DESCRIPTION
  DHD-Admin logs in as an account in the Windows Administrators group.
  OpenSSH ignores %USERPROFILE%\.ssh\authorized_keys for those accounts.

  Codex diagnosis (recorded on coordination board):
  - sshd_config Match Group administrators is active
  - Keys must live in C:\ProgramData\ssh\administrators_authorized_keys
  - That file was missing; ACLs must be SYSTEM + Administrators only

  Run elevated on DHD-ADMIN (local console or RDP). Do not run from Mac over SSH.

.PARAMETER PublicKeyPath
  Path to the Mac public key file. Defaults to cursor-macbook-air.pub beside this script.

.PARAMETER SkipCodexKey
  Skip generating the optional Codex agent key pair for reverse SSH.
#>
param(
  [string]$PublicKeyPath = (Join-Path $PSScriptRoot 'keys\cursor-macbook-air.pub'),
  [switch]$SkipCodexKey
)

$ErrorActionPreference = 'Stop'

$AdminKeysPath = Join-Path $env:ProgramData 'ssh\administrators_authorized_keys'
$SshDir = Join-Path $env:ProgramData 'ssh'
$SshdConfigPath = Join-Path $SshDir 'sshd_config'
$RepoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$WindowsSshUser = 'Tim Milkewicz'

function Set-OpenSshAdminAuthorizedKeysAcl {
  param(
    [Parameter(Mandatory)]
    [string]$Path
  )

  if (-not (Test-Path $Path)) {
    throw "ACL target missing: $Path"
  }

  # Microsoft Learn + Win32-OpenSSH wiki: only SYSTEM and Administrators may access this file.
  $acl = New-Object System.Security.AccessControl.FileSecurity
  $acl.SetAccessRuleProtection($true, $false)

  $systemSid = New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')
  $adminSid = New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544')
  $systemAccount = $systemSid.Translate([System.Security.Principal.NTAccount]).Value
  $adminAccount = $adminSid.Translate([System.Security.Principal.NTAccount]).Value

  $systemRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    $systemAccount,
    [System.Security.AccessControl.FileSystemRights]::FullControl,
    [System.Security.AccessControl.AccessControlType]::Allow
  )
  $adminRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
    $adminAccount,
    [System.Security.AccessControl.FileSystemRights]::FullControl,
    [System.Security.AccessControl.AccessControlType]::Allow
  )

  $acl.AddAccessRule($systemRule)
  $acl.AddAccessRule($adminRule)
  Set-Acl -LiteralPath $Path -AclObject $acl

  # icacls fallback for hosts where Set-Acl leaves inherited noise
  & icacls.exe $Path /inheritance:r | Out-Null
  & icacls.exe $Path /grant ('{0}:(F)' -f $systemAccount) | Out-Null
  & icacls.exe $Path /grant ('{0}:(F)' -f $adminAccount) | Out-Null

  foreach ($principal in @(
      'Everyone',
      'NT AUTHORITY\Authenticated Users',
      'BUILTIN\Users',
      'CREATOR OWNER',
      'NT AUTHORITY\INTERACTIVE'
    )) {
    & icacls.exe $Path /remove $principal 2>$null | Out-Null
  }
}

function Test-OpenSshAdminAuthorizedKeysAcl {
  param(
    [Parameter(Mandatory)]
    [string]$Path
  )

  $raw = & icacls.exe $Path 2>&1 | Out-String
  $hasSystem = $raw -match 'NT AUTHORITY\\SYSTEM:\(F\)'
  $hasAdmins = $raw -match 'BUILTIN\\Administrators:\(F\)'
  return [bool]($hasSystem -and $hasAdmins)
}

function Assert-SshdAdminKeyPathConfigured {
  if (-not (Test-Path $SshdConfigPath)) {
    Write-Warning "sshd_config not found at $SshdConfigPath"
    return
  }

  $lines = Get-Content $SshdConfigPath
  $inAdminMatch = $false
  $foundAdminKeys = $false

  foreach ($line in $lines) {
    if ($line -match '^\s*Match\s+Group\s+administrators') {
      $inAdminMatch = $true
      continue
    }
    if ($inAdminMatch -and $line -match '^\s*Match\b') {
      break
    }
    if ($inAdminMatch -and $line -match '^\s*AuthorizedKeysFile\s+__PROGRAMDATA__/ssh/administrators_authorized_keys') {
      $foundAdminKeys = $true
      break
    }
  }

  if (-not $foundAdminKeys) {
    Write-Warning @"
sshd_config may not route administrator keys to administrators_authorized_keys.
Confirm this line is active under "Match Group administrators":
  AuthorizedKeysFile __PROGRAMDATA__/ssh/administrators_authorized_keys
"@
  } else {
    Write-Host 'sshd_config: administrator AuthorizedKeysFile directive is active.'
  }
}

if (-not (Test-Path $PublicKeyPath)) {
  throw "Public key not found: $PublicKeyPath"
}

$pubKey = (Get-Content -Raw $PublicKeyPath).Trim()
if ($pubKey -match 'Placeholder') {
  throw "Public key file is still a placeholder: $PublicKeyPath"
}
if ($pubKey -notmatch '^(ssh-(ed25519|rsa|ecdsa)|ecdsa-sha2-nistp256) ') {
  throw "File does not look like an SSH public key: $PublicKeyPath"
}

Write-Host "Installing key from $PublicKeyPath"
Write-Host "Target (admin account path): $AdminKeysPath"
Write-Host "Windows SSH user: $WindowsSshUser"

if (-not (Test-Path $SshDir)) {
  New-Item -ItemType Directory -Path $SshDir -Force | Out-Null
}

Assert-SshdAdminKeyPathConfigured

$existing = @()
if (Test-Path $AdminKeysPath) {
  $existing = Get-Content $AdminKeysPath | Where-Object { $_.Trim() -ne '' }
}

if ($existing -contains $pubKey) {
  Write-Host 'Key already present in administrators_authorized_keys.'
} else {
  $lines = @($existing + $pubKey)
  [System.IO.File]::WriteAllLines($AdminKeysPath, $lines)
  Write-Host 'Appended public key.'
}

Set-OpenSshAdminAuthorizedKeysAcl -Path $AdminKeysPath

if (-not (Test-OpenSshAdminAuthorizedKeysAcl -Path $AdminKeysPath)) {
  throw "ACL verification failed for $AdminKeysPath. OpenSSH will ignore this file until only SYSTEM and Administrators have Full Control."
}

Write-Host 'ACL verified (SYSTEM + Administrators only):'
& icacls.exe $AdminKeysPath

$cap = Get-WindowsCapability -Online | Where-Object { $_.Name -like 'OpenSSH.Server*' }
if ($cap -and $cap.State -ne 'Installed') {
  Write-Host 'Installing OpenSSH Server...'
  Add-WindowsCapability -Online -Name $cap.Name | Out-Null
}

$service = Get-Service sshd -ErrorAction SilentlyContinue
if ($service) {
  Set-Service sshd -StartupType Automatic
  Restart-Service sshd
  Write-Host "sshd restarted; status: $((Get-Service sshd).Status)"
} else {
  Write-Warning 'sshd service not found. Install OpenSSH Server via Windows Optional Features.'
}

if (-not $SkipCodexKey) {
  $userSshDir = Join-Path $env:USERPROFILE '.ssh'
  $codexKey = Join-Path $userSshDir 'id_ed25519_tim_agent'
  New-Item -ItemType Directory -Force -Path $userSshDir | Out-Null

  if (-not (Test-Path $codexKey)) {
    Write-Host ('Generating Codex agent key at ' + $codexKey + ' ...')
    & ssh-keygen.exe -t ed25519 -f $codexKey -C 'tim-agent-codex@dhd-admin' -N '' | Out-Null
    $outPub = Join-Path $RepoRoot 'agent_coordination\ssh\keys\codex-dhd-admin.pub'
    Copy-Item ($codexKey + '.pub') $outPub -Force
    Write-Host ('Wrote ' + $outPub + ' - commit and push so Mac can install reverse access.')
  }
}

Write-Host ''
Write-Host 'Next: from the Mac, test with:'
Write-Host ('  ssh ' + $WindowsSshUser + '@100.95.71.54 hostname')
Write-Host '  ssh dhd-admin hostname   (after install-on-mac.sh)'
Write-Host ''
Write-Host 'Public key fingerprint (verify on Mac with ssh-keygen -lf):'
& ssh-keygen.exe -lf $PublicKeyPath
