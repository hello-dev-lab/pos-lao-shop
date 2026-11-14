# Watchdog: keeps the Node server, our cloudflared tunnel, and the stable
# GitHub Pages entry link (hello-dev-lab.github.io/pos-lao-shop) in sync.
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts\tunnel-watch.ps1

$ErrorActionPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root      = Split-Path -Parent $PSScriptRoot
$LogDir    = Join-Path $Root 'logs'
$LogFile   = Join-Path $LogDir 'tunnel-watch.log'
$UrlFile   = Join-Path $LogDir 'public-url.txt'
$PidFile   = Join-Path $LogDir 'cloudflared.pid'
$CfExe     = Join-Path $Root 'cloudflared.exe'
$CfLog     = Join-Path $LogDir 'cloudflared.log'
$CfErr     = Join-Path $LogDir 'cloudflared.err.log'
$Port      = 3001
$FailLimit = 3

$GhRepo    = 'hello-dev-lab/pos-lao-shop'
$PagesUrl  = 'https://hello-dev-lab.github.io/pos-lao-shop/'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-Log([string]$msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Add-Content -Path $LogFile -Value $line -Encoding UTF8
}

function Test-Port([int]$p) {
  return [bool](Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)
}

function Get-OurPid {
  if (-not (Test-Path $PidFile)) { return 0 }
  $v = (Get-Content $PidFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  $n = 0
  if ([int]::TryParse(($v -as [string]).Trim(), [ref]$n)) { return $n }
  return 0
}

function Get-SavedUrl {
  if (-not (Test-Path $UrlFile)) { return '' }
  $v = (Get-Content $UrlFile -ErrorAction SilentlyContinue | Select-Object -First 1)
  if (-not $v) { return '' }
  return $v.Trim()
}

function Test-Tunnel {
  $u = Get-SavedUrl
  if (-not $u) { return $false }
  try {
    $r = Invoke-WebRequest -Uri ("{0}/api/meta" -f $u) -UseBasicParsing -TimeoutSec 20
    return ($r.StatusCode -eq 200)
  } catch {
    return $false
  }
}

function Get-GitHubHeaders {
  Push-Location $Root
  $inp = "protocol=https`nhost=github.com`n`n"
  $out = $inp | git credential fill 2>$null
  Pop-Location
  $map = @{}
  foreach ($line in $out) { if ($line -match '^(.*?)=(.*)$') { $map[$matches[1]] = $matches[2] } }
  if (-not $map['password']) { return $null }
  $b64 = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes(("{0}:{1}" -f $map['username'], $map['password'])))
  return @{ Authorization = "Basic $b64"; 'User-Agent' = 'pos-lao-shop'; Accept = 'application/vnd.github+json' }
}

function Update-Pages([string]$url) {
  try {
    $H = Get-GitHubHeaders
    if (-not $H) { Write-Log 'pages: no github credential'; return }

    $raw = Invoke-RestMethod -Uri ("https://api.github.com/repos/{0}/contents/index.html?ref=gh-pages" -f $GhRepo) -Headers $H -TimeoutSec 40
    $clean = ([string]$raw.content) -replace '\s', ''
    $bytes = [Convert]::FromBase64String($clean)
    $html = [Text.Encoding]::UTF8.GetString($bytes)

    $newHtml = [regex]::Replace($html, 'var BASE = "https://[^"]*";', ('var BASE = "' + $url + '";'))
    if ($newHtml -eq $html) { Write-Log 'pages: already up to date'; return }

    $blobBody = @{ content = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($newHtml)); encoding = 'base64' } | ConvertTo-Json -Compress
    $blob = Invoke-RestMethod -Uri ("https://api.github.com/repos/{0}/git/blobs" -f $GhRepo) -Method Post -Headers $H -Body $blobBody -ContentType 'application/json' -TimeoutSec 40

    $treeBody = @{ tree = @(@{ path = 'index.html'; mode = '100644'; type = 'blob'; sha = $blob.sha }) } | ConvertTo-Json -Compress -Depth 5
    $tree = Invoke-RestMethod -Uri ("https://api.github.com/repos/{0}/git/trees" -f $GhRepo) -Method Post -Headers $H -Body $treeBody -ContentType 'application/json' -TimeoutSec 40

    $head = Invoke-RestMethod -Uri ("https://api.github.com/repos/{0}/git/ref/heads/gh-pages" -f $GhRepo) -Headers $H -TimeoutSec 30
    $commitBody = @{ message = 'chore: point entry page at current tunnel'; tree = $tree.sha; parents = @($head.object.sha) } | ConvertTo-Json -Compress -Depth 5
    $commit = Invoke-RestMethod -Uri ("https://api.github.com/repos/{0}/git/commits" -f $GhRepo) -Method Post -Headers $H -Body $commitBody -ContentType 'application/json' -TimeoutSec 40

    $upd = @{ sha = $commit.sha; force = $true } | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri ("https://api.github.com/repos/{0}/git/refs/heads/gh-pages" -f $GhRepo) -Method Patch -Headers $H -Body $upd -ContentType 'application/json' -TimeoutSec 40 | Out-Null

    Write-Log ('pages updated -> ' + $url)
  } catch {
    Write-Log ('pages update failed: ' + $_.Exception.Message)
  }
}

function Start-Tunnel {
  $old = Get-OurPid
  if ($old -gt 0) { Stop-Process -Id $old -Force -ErrorAction SilentlyContinue }
  Remove-Item $CfLog -ErrorAction SilentlyContinue
  Remove-Item $CfErr -ErrorAction SilentlyContinue

  $p = Start-Process -FilePath $CfExe `
    -ArgumentList 'tunnel','--no-autoupdate','--protocol','http2','--url',("http://127.0.0.1:{0}" -f $Port) `
    -WorkingDirectory $Root -WindowStyle Hidden `
    -RedirectStandardOutput $CfLog -RedirectStandardError $CfErr -PassThru
  Set-Content -Path $PidFile -Value $p.Id -Encoding UTF8
  Write-Log ("cloudflared started pid=" + $p.Id)

  for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 2
    $url = $null
    foreach ($f in @($CfErr, $CfLog)) {
      if (-not (Test-Path $f)) { continue }
      $m = Select-String -Path $f -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -AllMatches -ErrorAction SilentlyContinue |
           ForEach-Object { $_.Matches.Value } | Select-Object -First 1
      if ($m) { $url = $m; break }
    }
    if ($url) {
      Set-Content -Path $UrlFile -Value $url -Encoding UTF8
      Write-Log ("new url: " + $url)
      Update-Pages $url
      return
    }
  }
  Write-Log 'could not read tunnel url'
}

Write-Log '=== watchdog started ==='
$fails = 0

# keep the stable link pointing at whatever tunnel we last saved
$saved = Get-SavedUrl
if ($saved) { Update-Pages $saved }

while ($true) {
  if (-not (Test-Port $Port)) {
    Write-Log 'server down - restarting'
    Start-Process -FilePath 'node' -ArgumentList 'server.js' -WorkingDirectory $Root -WindowStyle Hidden
    Start-Sleep -Seconds 6
    if (Test-Port $Port) { Write-Log 'server back up' } else { Write-Log 'server still down' }
  }

  $cfPid = Get-OurPid
  $alive = $false
  if ($cfPid -gt 0) {
    $alive = [bool](Get-Process -Id $cfPid -ErrorAction SilentlyContinue)
  }

  if (-not $alive) {
    Write-Log 'our cloudflared is gone - starting a new tunnel'
    Start-Tunnel
    $fails = 0
  } elseif (-not (Test-Tunnel)) {
    $fails++
    Write-Log ("tunnel health check failed {0}/{1}" -f $fails, $FailLimit)
    if ($fails -ge $FailLimit) {
      Write-Log 'tunnel unhealthy - restarting'
      Start-Tunnel
      $fails = 0
    }
  } else {
    if ($fails -gt 0) { Write-Log 'tunnel healthy again' }
    $fails = 0
  }

  Start-Sleep -Seconds 30
}
