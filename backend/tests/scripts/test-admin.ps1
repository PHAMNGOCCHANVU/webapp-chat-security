# ============================================================
# test-admin.ps1 â€” E2E Admin Operations Tests (TC-ADMIN-01..09)
# YÃªu cáº§u: CÃ³ ADMIN account trong DB (username: admin, password: Admin@1234)
# ============================================================
. "$PSScriptRoot\test-helpers.ps1"

$TS = ([System.DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() % 100000000)
$ADMIN_USER = "admin"
$ADMIN_PASS = "Admin@1234"
$TEST_USER  = "adm_target_$TS"
$PASSWORD   = "Test@1234"

Write-Host "`nðŸ‘‘ ADMIN OPERATIONS TESTS" -ForegroundColor Magenta

# Setup: Táº¡o user thÆ°á»ng Ä‘á»ƒ test thao tÃ¡c admin
Write-Section "Setup: Creating target user"
$r = Invoke-API -Method POST -Path "/auth/register" -Body @{
    email = "${TEST_USER}@test.com"; username = $TEST_USER; password = $PASSWORD; displayName = "Admin Target"
}
if ($r.Status -eq 201) {
    $TARGET_ID = $r.Body.user.id
    Write-Pass "Target user created â€” id=$TARGET_ID"
} else {
    Write-Fail "Could not create target user â€” HTTP $($r.Status)"
    Print-Summary; exit
}

# Láº¥y session cho user thÆ°á»ng
$USER_COOKIE  = Get-SessionCookie $TEST_USER $PASSWORD
$ADMIN_COOKIE = Get-SessionCookie $ADMIN_USER $ADMIN_PASS

if (-not ($ADMIN_COOKIE -match "connect.sid")) {
    Write-Fail "ADMIN login failed. Ensure admin account exists (username: $ADMIN_USER, pass: $ADMIN_PASS)"
    Write-Host "  ðŸ’¡ Run: npx ts-node prisma/seed.ts to seed admin account" -ForegroundColor Yellow
    Print-Summary; exit
}
Write-Pass "Admin session established"

# â”€â”€ TC-ADMIN-01: Láº¥y danh sÃ¡ch users â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-ADMIN-01: List users (Admin)"
$r = Invoke-API -Method GET -Path "/admin/users" -Cookie $ADMIN_COOKIE
if ($r.Status -eq 200) { Write-Pass "User list OK â€” count=$($r.Body.Count)" }
else { Write-Fail "Expected 200, got $($r.Status)" }

# â”€â”€ TC-ADMIN-02: Non-admin truy cáº­p admin route â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-ADMIN-02: Non-admin access admin route"
$r = Invoke-API -Method GET -Path "/admin/users" -Cookie $USER_COOKIE
if ($r.Status -eq 403) { Write-Pass "Non-admin blocked â€” HTTP 403" }
else { Write-Fail "Expected 403, got $($r.Status)" }

# â”€â”€ TC-ADMIN-03: Cáº­p nháº­t tráº¡ng thÃ¡i user â†’ LOCKED â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-ADMIN-03: Update user status to LOCKED"
$r = Invoke-API -Method PATCH -Path "/admin/users/$TARGET_ID/status" -Cookie $ADMIN_COOKIE -Body @{ status = "LOCKED" }
if ($r.Status -eq 200) {
    Write-Pass "Status updated to LOCKED"
    # Verify locked user cannot login
    $lc = Get-SessionCookie $TEST_USER $PASSWORD
    if (-not ($lc -match "connect.sid")) { Write-Pass "Locked user cannot login âœ“" }
    else { Write-Fail "Locked user can still login!" }
} else { Write-Fail "Expected 200, got $($r.Status). Body: $($r.Body | ConvertTo-Json)" }

# Restore: ACTIVE láº¡i Ä‘á»ƒ test tiáº¿p
Invoke-API -Method PATCH -Path "/admin/users/$TARGET_ID/status" -Cookie $ADMIN_COOKIE -Body @{ status = "ACTIVE" } | Out-Null

# â”€â”€ TC-ADMIN-04: Cáº­p nháº­t role user â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-ADMIN-04: Update user role"
$r = Invoke-API -Method PATCH -Path "/admin/users/$TARGET_ID/role" -Cookie $ADMIN_COOKIE -Body @{ role = "ADMIN" }
if ($r.Status -eq 200) { Write-Pass "Role updated to ADMIN" }
else { Write-Fail "Expected 200, got $($r.Status). Body: $($r.Body | ConvertTo-Json)" }
# Restore
Invoke-API -Method PATCH -Path "/admin/users/$TARGET_ID/role" -Cookie $ADMIN_COOKIE -Body @{ role = "USER" } | Out-Null

# â”€â”€ TC-ADMIN-05: Xem audit logs cÆ¡ báº£n â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-ADMIN-05: Get audit logs (basic)"
$r = Invoke-API -Method GET -Path "/admin/audit-logs" -Cookie $ADMIN_COOKIE
if ($r.Status -eq 200 -and $r.Body.data -and $r.Body.pagination) {
    Write-Pass "Audit logs OK â€” total=$($r.Body.pagination.total)"
} else { Write-Fail "Expected 200 with {data, pagination}, got $($r.Status)" }

# â”€â”€ TC-ADMIN-06: Audit logs vá»›i filters â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-ADMIN-06: Audit logs with filters"
$today = (Get-Date).ToString("yyyy-MM-dd")
$r = Invoke-API -Method GET -Path "/admin/audit-logs?action=LOGIN&status=FAILED&startDate=2026-01-01&endDate=$today&page=1&limit=10" -Cookie $ADMIN_COOKIE
if ($r.Status -eq 200 -and $r.Body.pagination) {
    Write-Pass "Filtered audit logs OK â€” page=$($r.Body.pagination.page) limit=$($r.Body.pagination.limit)"
} else { Write-Fail "Expected 200, got $($r.Status)" }

# â”€â”€ TC-ADMIN-07: Thá»‘ng kÃª há»‡ thá»‘ng â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-ADMIN-07: System stats"
$r = Invoke-API -Method GET -Path "/admin/stats" -Cookie $ADMIN_COOKIE
if ($r.Status -eq 200) { Write-Pass "Stats OK â€” $($r.Body | ConvertTo-Json -Compress)" }
else { Write-Fail "Expected 200, got $($r.Status)" }

# â”€â”€ TC-ADMIN-08: Admin tá»± xÃ³a chÃ­nh mÃ¬nh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-ADMIN-08: Admin cannot delete own account"
# Láº¥y admin's own ID
$prof = Invoke-API -Method GET -Path "/auth/profile" -Cookie $ADMIN_COOKIE
if ($prof.Status -eq 200) {
    $ADMIN_ID = $prof.Body.id
    $r = Invoke-API -Method DELETE -Path "/admin/users/$ADMIN_ID" -Cookie $ADMIN_COOKIE
    if ($r.Status -eq 400) { Write-Pass "Self-delete blocked â€” HTTP 400" }
    else { Write-Fail "Expected 400, got $($r.Status)" }
} else { Write-Skip "Could not get admin profile" }

# â”€â”€ TC-ADMIN-09: XÃ³a user + kiá»ƒm tra audit log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-ADMIN-09: Delete user + verify audit log"
$r = Invoke-API -Method DELETE -Path "/admin/users/$TARGET_ID" -Cookie $ADMIN_COOKIE
if ($r.Status -eq 200) {
    Write-Pass "User deleted"
    # Kiá»ƒm tra audit log cÃ³ báº£n ghi DELETE_USER
    Start-Sleep -Milliseconds 500
    $logs = Invoke-API -Method GET -Path "/admin/audit-logs?action=DELETE_USER&limit=5" -Cookie $ADMIN_COOKIE
    if ($logs.Status -eq 200 -and $logs.Body.data.Count -gt 0) {
        Write-Pass "DELETE_USER audit log found â€” count=$($logs.Body.data.Count)"
    } else { Write-Fail "DELETE_USER audit log not found" }
} else { Write-Fail "Delete user failed â€” HTTP $($r.Status)" }

Print-Summary
