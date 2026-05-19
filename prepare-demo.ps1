$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $repoRoot "backend"
$frontendDir = Join-Path $repoRoot "frontend"
$backendEnvPath = Join-Path $backendDir ".env"

function Invoke-Step {
  param(
    [string]$Title,
    [scriptblock]$Action
  )

  Write-Host ""
  Write-Host "==> $Title" -ForegroundColor Cyan
  & $Action
}

if (-not (Test-Path $backendEnvPath)) {
  throw "Missing backend/.env. Create backend/.env before preparing the demo build."
}

Get-Command npm.cmd -ErrorAction Stop | Out-Null

Invoke-Step "Checking backend dependencies" {
  if (-not (Test-Path (Join-Path $backendDir "node_modules"))) {
    npm.cmd install --prefix $backendDir
  } else {
    Write-Host "backend/node_modules already exists. Skipping install."
  }
}

Invoke-Step "Repairing database schema for the current backend" {
  npm.cmd run db:repair --prefix $backendDir
}

Invoke-Step "Checking frontend dependencies" {
  if (-not (Test-Path (Join-Path $frontendDir "node_modules"))) {
    npm.cmd install --prefix $frontendDir
  } else {
    Write-Host "frontend/node_modules already exists. Skipping install."
  }
}

Invoke-Step "Building frontend" {
  npm.cmd run build --prefix $frontendDir
}

Invoke-Step "Building backend" {
  npm.cmd run build --prefix $backendDir
}

Write-Host ""
Write-Host "Demo build is ready." -ForegroundColor Green
Write-Host "Next step: run .\\start-demo.bat" -ForegroundColor Green
