$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $repoRoot "backend"
$runtimeDir = Join-Path $repoRoot ".demo-runtime"
$backendBuildPath = Join-Path $backendDir "dist\\server.js"
$frontendBuildPath = Join-Path $repoRoot "frontend\\dist\\index.html"
$pidPath = Join-Path $runtimeDir "backend.pid"
$stdoutPath = Join-Path $runtimeDir "backend.stdout.log"
$stderrPath = Join-Path $runtimeDir "backend.stderr.log"
$healthUrl = "http://127.0.0.1:4000/health"
$appUrl = "http://127.0.0.1:4000/"

function Test-Health {
  try {
    $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

if (-not (Test-Path $backendBuildPath) -or -not (Test-Path $frontendBuildPath)) {
  throw "Missing build artifacts. Run .\\prepare-demo.bat first."
}

if (Test-Health) {
  Write-Host "Demo server is already running at $appUrl" -ForegroundColor Yellow
  Start-Process $appUrl
  exit 0
}

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
Remove-Item $stdoutPath, $stderrPath -ErrorAction SilentlyContinue

$previousServeFrontend = $env:SERVE_FRONTEND
$previousDemoMode = $env:DEMO_MODE
$env:SERVE_FRONTEND = "true"
$env:DEMO_MODE = "true"

try {
  $process = Start-Process `
    -FilePath "node.exe" `
    -ArgumentList @("dist/server.js") `
    -WorkingDirectory $backendDir `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutPath `
    -RedirectStandardError $stderrPath `
    -PassThru
} finally {
  if ($null -eq $previousServeFrontend) {
    Remove-Item Env:SERVE_FRONTEND -ErrorAction SilentlyContinue
  } else {
    $env:SERVE_FRONTEND = $previousServeFrontend
  }

  if ($null -eq $previousDemoMode) {
    Remove-Item Env:DEMO_MODE -ErrorAction SilentlyContinue
  } else {
    $env:DEMO_MODE = $previousDemoMode
  }
}

Set-Content -Path $pidPath -Value $process.Id

for ($attempt = 0; $attempt -lt 30; $attempt++) {
  Start-Sleep -Seconds 1

  if (Test-Health) {
    Write-Host "Demo server is running at $appUrl" -ForegroundColor Green
    Start-Process $appUrl
    exit 0
  }

  if ($process.HasExited) {
    break
  }
}

if (-not $process.HasExited) {
  Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
}

Remove-Item $pidPath -ErrorAction SilentlyContinue

$stderr = if (Test-Path $stderrPath) { (Get-Content $stderrPath -Raw).Trim() } else { "" }
$stdout = if (Test-Path $stdoutPath) { (Get-Content $stdoutPath -Raw).Trim() } else { "" }

if ($stderr) {
  throw "Demo server failed to start.`n$stderr"
}

if ($stdout) {
  throw "Demo server failed to start.`n$stdout"
}

throw "Demo server failed to start. Check .demo-runtime logs for details."
