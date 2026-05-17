# ============================================================
# test-auth.ps1 - E2E Auth Flow Tests (TC-AUTH-01..10)
# ============================================================
. "$PSScriptRoot\test-helpers.ps1"

$TS = ([System.DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() % 100000000)
$EMAIL    = "testuser_$TS@test.com"
$USERNAME = "testuser_$TS"
$PASSWORD = "Test@1234"
$DISPLAY  = "Test User $TS"

Write-Host "`nðŸ” AUTH FLOW TESTS" -ForegroundColor Magenta

# â”€â”€ TC-AUTH-01: ÄÄƒng kÃ½ thÃ nh cÃ´ng â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-AUTH-01: Register"
$r = Invoke-API -Method POST -Path "/auth/register" -Body @{
    email = $EMAIL; username = $USERNAME; password = $PASSWORD; displayName = $DISPLAY
}
if ($r.Status -eq 201) {
    Write-Pass "Register success - user.id=$($r.Body.user.id) username=$($r.Body.user.username)"
    $script:USER_ID = $r.Body.user.id
} else { Write-Fail "Register - Expected 201, got $($r.Status). Body: $($r.Body | ConvertTo-Json)" }

# â”€â”€ TC-AUTH-02: ÄÄƒng kÃ½ trÃ¹ng email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-AUTH-02: Duplicate email"
$r = Invoke-API -Method POST -Path "/auth/register" -Body @{
    email = $EMAIL; username = "${USERNAME}_2"; password = $PASSWORD; displayName = "Dup"
}
if ($r.Status -eq 400) { Write-Pass "Duplicate email rejected - HTTP $($r.Status)" }
else { Write-Fail "Expected 400, got $($r.Status)" }

# â”€â”€ TC-AUTH-03: Validation sai format â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-AUTH-03: Validation"
$r = Invoke-API -Method POST -Path "/auth/register" -Body @{
    email = "not-an-email"; username = "a"; password = "short"; displayName = "X"
}
if ($r.Status -eq 400) { Write-Pass "Validation error caught - HTTP $($r.Status)" }
else { Write-Fail "Expected 400, got $($r.Status)" }

# â”€â”€ TC-AUTH-04: XSS trong displayName â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-AUTH-04: XSS sanitization in displayName"
$XSS_TS = ([System.DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() % 100000000)
$r = Invoke-API -Method POST -Path "/auth/register" -Body @{
    email       = "xss_$XSS_TS@test.com"
    username    = "xssuser_$XSS_TS"
    password    = $PASSWORD
    displayName = "<script>alert(1)</script>SafeUser"
}
if ($r.Status -eq 201) {
    $dn = $r.Body.user.displayName
    if ($dn -notmatch "<script>") { Write-Pass "XSS stripped - displayName='$dn'" }
    else { Write-Fail "XSS NOT stripped - displayName='$dn'" }
} else { Write-Fail "Register XSS test failed - HTTP $($r.Status)" }

# â”€â”€ TC-AUTH-05: ÄÄƒng nháº­p thÃ nh cÃ´ng â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-AUTH-05: Login success"
$cookie = Get-SessionCookie -Username $USERNAME -Password $PASSWORD
if ($cookie -match "connect.sid") {
    Write-Pass "Login OK - session cookie received"
    $script:SESSION_COOKIE = $cookie
} else { Write-Fail "Login failed or no cookie. Cookie='$cookie'" }

# â”€â”€ TC-AUTH-06: ÄÄƒng nháº­p sai máº­t kháº©u â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-AUTH-06: Wrong password"
$r = Invoke-API -Method POST -Path "/auth/login" -Body @{ username = $USERNAME; password = "WrongPass99" }
if ($r.Status -eq 401) { Write-Pass "Wrong password rejected - HTTP 401" }
else { Write-Fail "Expected 401, got $($r.Status)" }

# â”€â”€ TC-AUTH-07: Xem profile (cÃ³ session) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-AUTH-07: Get profile (authenticated)"
$r = Invoke-API -Method GET -Path "/auth/profile" -Cookie $script:SESSION_COOKIE
if ($r.Status -eq 200 -and $r.Body.username -eq $USERNAME) {
    Write-Pass "Get profile OK - role=$($r.Body.role)"
} else { Write-Fail "Expected 200, got $($r.Status)" }

# â”€â”€ TC-AUTH-08: Xem profile (khÃ´ng cÃ³ session) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-AUTH-08: Get profile (unauthenticated)"
$r = Invoke-API -Method GET -Path "/auth/profile"
if ($r.Status -eq 401) { Write-Pass "Unauthenticated rejected - HTTP 401" }
else { Write-Fail "Expected 401, got $($r.Status)" }

# â”€â”€ TC-AUTH-09: Äá»•i máº­t kháº©u â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-AUTH-09: Change password"
$NEW_PASS = "NewPass@5678"
$r = Invoke-API -Method POST -Path "/auth/change-password" -Cookie $script:SESSION_COOKIE -Body @{
    oldPassword = $PASSWORD; newPassword = $NEW_PASS; confirmPassword = $NEW_PASS
}
if ($r.Status -eq 200) {
    Write-Pass "Change password OK"
    # Verify login with new password
    $nc = Get-SessionCookie -Username $USERNAME -Password $NEW_PASS
    if ($nc -match "connect.sid") { Write-Pass "Login with new password OK" }
    else { Write-Fail "Login with new password failed" }
    $script:SESSION_COOKIE = $nc
} else { Write-Fail "Change password failed - HTTP $($r.Status). Body: $($r.Body | ConvertTo-Json)" }

# â”€â”€ TC-AUTH-10: ÄÄƒng xuáº¥t â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
Write-Section "TC-AUTH-10: Logout"
$r = Invoke-API -Method POST -Path "/auth/logout" -Cookie $script:SESSION_COOKIE
if ($r.Status -eq 200) {
    Write-Pass "Logout OK"
    # Verify session invalidated
    $r2 = Invoke-API -Method GET -Path "/auth/profile" -Cookie $script:SESSION_COOKIE
    if ($r2.Status -eq 401) { Write-Pass "Session invalidated after logout" }
    else { Write-Fail "Session still active after logout - HTTP $($r2.Status)" }
} else { Write-Fail "Logout failed - HTTP $($r.Status)" }

# Save test account info for other test scripts
$script:SESSION_COOKIE = Get-SessionCookie -Username $USERNAME -Password $NEW_PASS 2>$null

Print-Summary
