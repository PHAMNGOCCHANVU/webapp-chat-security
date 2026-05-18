# ============================================================
# test-rooms.ps1 - E2E Room & Messaging Tests (TC-ROOM-01..08)
# ============================================================
. "$PSScriptRoot\test-helpers.ps1"

$TS = ([System.DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() % 100000000)
$U1_NAME  = "room_u1_$TS"
$U2_NAME  = "room_u2_$TS"
$PASSWORD = "Test@1234"

# Tạo 2 user để test
function New-TestUser($username, $email) {
    $r = Invoke-API -Method POST -Path "/auth/register" -Body @{
        email = $email; username = $username; password = $PASSWORD; displayName = $username
    }
    if ($r.Status -eq 201) { return $r.Body.user.id } else { return $null }
}

Write-Host "`n💬 ROOM & MESSAGING TESTS" -ForegroundColor Magenta
Write-Section "Setup: Creating test users"

$U1_ID = New-TestUser $U1_NAME "u1_$TS@test.com"
$U2_ID = New-TestUser $U2_NAME "u2_$TS@test.com"

if (-not $U1_ID -or -not $U2_ID) { Write-Fail "Could not create test users"; exit 1 }
Write-Pass "Users created: $U1_NAME ($U1_ID), $U2_NAME ($U2_ID)"

$C1 = Get-SessionCookie $U1_NAME $PASSWORD
$C2 = Get-SessionCookie $U2_NAME $PASSWORD
if (-not ($C1 -match "connect.sid")) { Write-Fail "User1 login failed"; exit 1 }
Write-Pass "User sessions established"

$script:ROOM_ID = $null
$script:PRIV_ID = $null

# ── TC-ROOM-01: Tạo cuộc hội thoại nhóm ─────────────────────────────────────
Write-Section "TC-ROOM-01: Create GROUP conversation"
$r = Invoke-API -Method POST -Path "/rooms" -Cookie $C1 -Body @{
    name = "Test Group $TS"; isPrivate = $false
}
if ($r.Status -eq 201 -and $r.Body.id) {
    $script:ROOM_ID = $r.Body.id
    Write-Pass "Group created - id=$($script:ROOM_ID)"
} else { Write-Fail "Expected 201, got $($r.Status). Body: $($r.Raw)" }

# ── TC-ROOM-02: Tạo cuộc hội thoại PRIVATE ───────────────────────────────────
Write-Section "TC-ROOM-02: Create PRIVATE conversation"
$r = Invoke-API -Method POST -Path "/rooms" -Cookie $C1 -Body @{
    name = "Private $TS"; isPrivate = $true
}
if ($r.Status -eq 201 -and $r.Body.id) {
    $script:PRIV_ID = $r.Body.id
    Write-Pass "Private conversation created - id=$($script:PRIV_ID)"
} else { Write-Fail "Expected 201, got $($r.Status). Body: $($r.Raw)" }

# ── TC-ROOM-03: Lấy danh sách phòng ─────────────────────────────────────────
Write-Section "TC-ROOM-03: Get room list"
$r = Invoke-API -Method GET -Path "/rooms" -Cookie $C1
if ($r.Status -eq 200 -and $r.Body -is [array]) {
    Write-Pass "Room list OK - count=$($r.Body.Count)"
} elseif ($r.Status -eq 200) {
    Write-Pass "Room list OK"
} else { Write-Fail "Expected 200, got $($r.Status)" }

# ── TC-ROOM-04: Chi tiết phòng + members ─────────────────────────────────────
Write-Section "TC-ROOM-04: Get room detail"
if ($script:ROOM_ID) {
    $r = Invoke-API -Method GET -Path "/rooms/$($script:ROOM_ID)" -Cookie $C1
    if ($r.Status -eq 200) { Write-Pass "Room detail OK" }
    else { Write-Fail "Expected 200, got $($r.Status)" }
} else { Write-Skip "No room ID available" }

# ── TC-ROOM-05: Lịch sử tin nhắn với pagination ──────────────────────────────
Write-Section "TC-ROOM-05: Message history with pagination"
if ($script:ROOM_ID) {
    $r = Invoke-API -Method GET -Path "/rooms/$($script:ROOM_ID)/messages?page=1&limit=20" -Cookie $C1
    if ($r.Status -eq 200) { Write-Pass "Message history OK" }
    else { Write-Fail "Expected 200, got $($r.Status)" }
} else { Write-Skip "No room ID available" }

# ── TC-ROOM-06: Thêm thành viên ──────────────────────────────────────────────
Write-Section "TC-ROOM-06: Add member to group"
if ($script:ROOM_ID) {
    # Tạo user thứ 3
    $U3_NAME = "room_u3_$TS"
    $U3_ID = New-TestUser $U3_NAME "u3_$TS@test.com"
    if ($U3_ID) {
        $r = Invoke-API -Method POST -Path "/rooms/$($script:ROOM_ID)/members" -Cookie $C1 -Body @{ userId = $U3_ID }
        if ($r.Status -eq 201) { Write-Pass "Member added - userId=$U3_ID" }
        else { Write-Fail "Expected 201, got $($r.Status). Body: $($r.Body | ConvertTo-Json)" }

        # ── TC-ROOM-07: Xóa thành viên ───────────────────────────────────────
        Write-Section "TC-ROOM-07: Remove member from group"
        $r = Invoke-API -Method DELETE -Path "/rooms/$($script:ROOM_ID)/members/$U3_ID" -Cookie $C1
        if ($r.Status -eq 200) { Write-Pass "Member removed" }
        else { Write-Fail "Expected 200, got $($r.Status)" }
    } else { Write-Skip "Could not create user3" }
} else { Write-Skip "No room ID" }

# ── TC-ROOM-08: Truy cập phòng không phải thành viên ─────────────────────────
Write-Section "TC-ROOM-08: Access room as non-member"
# Tạo user mới không phải thành viên
$U4_NAME = "room_u4_$TS"
$U4_ID   = New-TestUser $U4_NAME "u4_$TS@test.com"
if ($U4_ID -and $script:ROOM_ID) {
    $C4 = Get-SessionCookie $U4_NAME $PASSWORD
    $r = Invoke-API -Method GET -Path "/rooms/$($script:ROOM_ID)/messages" -Cookie $C4
    if ($r.Status -eq 403) { Write-Pass "Non-member blocked - HTTP 403" }
    else { Write-Fail "Expected 403, got $($r.Status)" }
} else { Write-Skip "Setup failed" }

Print-Summary
