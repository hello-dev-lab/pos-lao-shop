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

# only count real "-File ... tunnel-watch.ps1" invocations (ignore shells whose text mentions it)
$running = Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
           Where-Object { $_.CommandLine -like '*-File*tunnel-watch.ps1*' -and $_.CommandLine -notlike '*-Command*' }

if ($running) {
  $ids = ($running | ForEach-Object { $_.ProcessId }) -join ','
  Write-BootLog ("watchdog already running - skip (pids: $ids)")
  exit 0
}

$Watch = Join-Path $PSScriptRoot 'tunnel-watch.ps1'
$args = '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "{0}"' -f $Watch

Write-BootLog 'starting watchdog'
Start-Process -FilePath 'powershell.exe' -ArgumentList $args -WorkingDirectory $Root -WindowStyle Hidden
