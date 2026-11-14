# Bootstrap: run by Windows Task Scheduler at logon.
# Starts the watchdog once (no duplicates).

$ErrorActionPreference = 'SilentlyContinue'
$Root = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $Root 'logs'
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$BootLog = Join-Path $LogDir 'bootstrap.log'

function Write-BootLog([string]$m) {
  Add-Content -Path $BootLog -Value ("[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $m) -Encoding UTF8
}

$running = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
           Where-Object { $_.CommandLine -like '*tunnel-watch.ps1*' }

if ($running) {
  Write-BootLog 'watchdog already running - skip'
  exit 0
}

Write-BootLog 'starting watchdog'
Start-Process -FilePath 'powershell.exe' `
  -ArgumentList '-NoProfile','-WindowStyle','Hidden','-ExecutionPolicy','Bypass','-File',(Join-Path $PSScriptRoot 'tunnel-watch.ps1') `
  -WorkingDirectory $Root -WindowStyle Hidden
