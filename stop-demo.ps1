$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$runtimeDir = Join-Path $repoRoot ".demo-runtime"
$pidPath = Join-Path $runtimeDir "backend.pid"

if (-not (Test-Path $pidPath)) {
  Write-Host "No tracked demo server is running." -ForegroundColor Yellow
  exit 0
}

$processId = (Get-Content $pidPath -Raw).Trim()

if (-not $processId) {
  Remove-Item $pidPath -ErrorAction SilentlyContinue
  Write-Host "Demo PID file was empty and has been cleared." -ForegroundColor Yellow
  exit 0
}

$process = Get-Process -Id $processId -ErrorAction SilentlyContinue
if ($process) {
  Stop-Process -Id $processId -Force
  Write-Host "Stopped demo server process $processId." -ForegroundColor Green
} else {
  Write-Host "Demo server process $processId is no longer running." -ForegroundColor Yellow
}

Remove-Item $pidPath -ErrorAction SilentlyContinue
