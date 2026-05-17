# ============================================================
# test-all.ps1 — Chạy toàn bộ test suites
# Usage: pwsh tests/scripts/test-all.ps1
# ============================================================

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PASS = 0; $FAIL = 0

function Run-Suite($name, $script) {
    Write-Host "`n" + ("=" * 60) -ForegroundColor White
    Write-Host "  SUITE: $name" -ForegroundColor White
    Write-Host ("=" * 60) -ForegroundColor White

    $result = & pwsh -File "$scriptDir\$script" 2>&1
    $result | ForEach-Object { Write-Host $_ }

    # Count results
    $p = ($result | Select-String "✅ PASS").Count
    $f = ($result | Select-String "❌ FAIL").Count
    $script:PASS += $p
    $script:FAIL += $f
}

# Check server is running
Write-Host "`n🔍 Checking server health..." -ForegroundColor Cyan
try {
    $h = Invoke-WebRequest -Uri "http://localhost:3000/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "  ✅ Server running — $($h.Content)" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Server not responding at http://localhost:3000" -ForegroundColor Red
    Write-Host "  💡 Run: npm run dev (in backend/)" -ForegroundColor Yellow
    exit 1
}

Run-Suite "Auth Flow (TC-AUTH-01..10)"      "test-auth.ps1"
Run-Suite "Room & Messaging (TC-ROOM-01..08)" "test-rooms.ps1"
Run-Suite "Security (TC-SEC-01..15)"         "test-security.ps1"

Write-Host "`n"
Write-Host ("═" * 60) -ForegroundColor White
Write-Host "  FINAL RESULTS: PASS=$PASS  FAIL=$FAIL" -ForegroundColor White
Write-Host ("═" * 60) -ForegroundColor White

if ($FAIL -gt 0) {
    Write-Host "`n❌ Some tests failed. Review output above." -ForegroundColor Red
    exit 1
} else {
    Write-Host "`n✅ All tests passed!" -ForegroundColor Green
    exit 0
}
