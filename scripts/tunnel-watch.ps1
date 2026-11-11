# Watchdog: keeps the Node server and the Cloudflare quick tunnel alive.
# Run:  powershell -NoProfile -ExecutionPolicy Bypass -File scripts\tunnel-watch.ps1
# Current public URL is written to logs\public-url.txt

$ErrorActionPreference = 'SilentlyContinue'

$Root    = Split-Path -Parent $PSScriptRoot
$LogDir  = Join-Path $Root 'logs'
$LogFile = Join-Path $LogDir 'tunnel-watch.log'
$UrlFile = Join-Path $LogDir 'public-url.txt'
$CfExe   = Join-Path $Root 'cloudflared.exe'
$CfLog   = Join-Path $LogDir 'cloudflared.log'
$Port    = 3001

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-Log([string]$msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

function Test-Port([int]$p) {
  return [bool](Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)
}

Write-Log '=== watchdog started ==='

while ($true) {
  if (-not (Test-Port $Port)) {
    Write-Log 'server down - restarting'
    Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory $Root -WindowStyle Hidden
    Start-Sleep -Seconds 6
    if (Test-Port $Port) { Write-Log 'server is back up OK' } else { Write-Log 'server still down FAILED' }
  }

  if (-not (Get-Process cloudflared -ErrorAction SilentlyContinue)) {
    Write-Log 'cloudflared down - starting new tunnel'
    if (Test-Path $CfExe) {
      Start-Process -FilePath $CfExe -ArgumentList 'tunnel','--no-autoupdate','--url',("http://127.0.0.1:{0}" -f $Port) -WorkingDirectory $Root -WindowStyle Hidden -RedirectStandardOutput $CfLog
      Start-Sleep -Seconds 12
      $url = Select-String -Path $CfLog -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches |
             ForEach-Object { $_.Matches.Value } | Select-Object -First 1
      if ($url) {
        Set-Content -Path $UrlFile -Value $url -Encoding UTF8
        Write-Log ("new tunnel url: " + $url)
      } else {
        Write-Log 'could not read tunnel url - check logs\cloudflared.log'
      }
    } else {
      Write-Log ("cloudflared.exe not found at " + $CfExe)
    }
  }

  Start-Sleep -Seconds 20
}
