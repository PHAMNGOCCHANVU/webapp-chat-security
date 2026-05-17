# 📋 PHASE 7: TESTING & DOCUMENTATION — KẾ HOẠCH CHI TIẾT

> **Dự án:** Webapp Chat Nội Bộ Bảo Mật
> **Thời lượng ước tính:** 12–15 giờ
> **Phụ thuộc:** Phase 1–6 ✅ hoàn thành
> **Ngày lập:** 17/05/2026

---

## 1. MỤC TIÊU PHASE 7

Theo `detail-plan.txt`:

| # | Yêu cầu | Mô tả |
|---|---------|-------|
| 1 | E2E tests: auth flow, messaging, admin ops | Kiểm thử luồng nghiệp vụ đầu cuối |
| 2 | Security tests: CORS, rate limiting, SQL injection | Kiểm thử bảo mật các lớp Phase 6 |
| 3 | API documentation | Hoàn thiện Swagger và tài liệu tham khảo |
| 4 | Environment setup guide | Hướng dẫn cài đặt và triển khai |

---

## 2. PHẠM VI KIỂM THỬ — TẤT CẢ 18 ENDPOINTS + SOCKET

### REST API Endpoints

| Nhóm | Endpoint | Phương thức | Auth |
|------|----------|------------|------|
| **Auth** | `/api/v1/auth/register` | POST | Public |
| | `/api/v1/auth/login` | POST | Public |
| | `/api/v1/auth/logout` | POST | Session |
| | `/api/v1/auth/profile` | GET | Session |
| | `/api/v1/auth/profile` | PUT | Session |
| | `/api/v1/auth/change-password` | POST | Session |
| **Rooms** | `/api/v1/rooms` | GET | Session |
| | `/api/v1/rooms` | POST | Session |
| | `/api/v1/rooms/:id` | GET | Session |
| | `/api/v1/rooms/:id/messages` | GET | Session |
| | `/api/v1/rooms/:id/members` | POST | Session |
| | `/api/v1/rooms/:id/members/:uid` | DELETE | Session |
| **Admin** | `/api/v1/admin/users` | GET | ADMIN |
| | `/api/v1/admin/users/:id/status` | PATCH | ADMIN |
| | `/api/v1/admin/users/:id/role` | PATCH | ADMIN |
| | `/api/v1/admin/users/:id` | DELETE | ADMIN |
| | `/api/v1/admin/audit-logs` | GET | ADMIN |
| | `/api/v1/admin/stats` | GET | ADMIN |
| **Other** | `/health` | GET | Public |
| | `/api-docs` | GET | Public |

### Socket.IO Events

| Event (Client → Server) | Event (Server → Client) |
|--------------------------|------------------------|
| `join-room` | `room-joined`, `user-joined` |
| `leave-room` | `room-left`, `user-left` |
| `send-message` | `new-message` |
| `typing` | `user-typing` |
| `get-message-history` | `message-history` |
| `get-active-users` | `active-users` |

---

## 3. TASK CHI TIẾT

### Task 7.1 — Chuẩn bị môi trường test (1h)

**Mục tiêu:** Tạo file test script chạy được trên PowerShell (Windows).

#### [NEW] `tests/` directory structure

```
backend/tests/
├── scripts/
│   ├── test-auth.ps1         # E2E auth flow
│   ├── test-rooms.ps1        # E2E room & messaging
│   ├── test-admin.ps1        # E2E admin operations
│   ├── test-security.ps1     # Security tests
│   └── test-all.ps1          # Chạy tất cả
├── seed-test-data.ts          # Tạo dữ liệu test
└── README.md                  # Hướng dẫn chạy test
```

#### Biến dùng chung trong tất cả scripts

```powershell
$BASE_URL = "http://localhost:3000/api/v1"
$COOKIE_FILE = "$env:TEMP\test_session.txt"

function Invoke-API {
    param($Method, $Url, $Body, $Session)
    # Helper dùng Invoke-RestMethod với cookie handling
}
```

---

### Task 7.2 — E2E Test: Auth Flow (2–2.5h)

#### [NEW] `tests/scripts/test-auth.ps1`

**Test cases cần cover:**

**TC-AUTH-01: Đăng ký thành công**
```
POST /auth/register
Body: { email, username, password, displayName }
Expected: 201, trả về { user.id, user.username }
```

**TC-AUTH-02: Đăng ký trùng email**
```
POST /auth/register (email đã tồn tại)
Expected: 400, { error: "..." }
```

**TC-AUTH-03: Đăng ký — validation sai format**
```
POST /auth/register (password không có số, email sai format)
Expected: 400, { error: "Validation failed", details: [...] }
```

**TC-AUTH-04: Đăng ký — displayName có HTML (XSS test)**
```
POST /auth/register
Body: { displayName: "<script>alert(1)</script>User" }
Expected: 201, displayName đã được sanitize (không còn <script>)
```

**TC-AUTH-05: Đăng nhập thành công**
```
POST /auth/login
Body: { username, password }
Expected: 200, Set-Cookie: connect.sid=...; HttpOnly
```

**TC-AUTH-06: Đăng nhập sai mật khẩu**
```
POST /auth/login (sai password)
Expected: 401, { error: "..." }
```

**TC-AUTH-07: Xem profile (có session)**
```
GET /auth/profile (với cookie hợp lệ)
Expected: 200, { id, username, email, displayName, role }
```

**TC-AUTH-08: Xem profile (không có session)**
```
GET /auth/profile (không có cookie)
Expected: 401
```

**TC-AUTH-09: Đổi mật khẩu thành công**
```
POST /auth/change-password
Body: { oldPassword, newPassword, confirmPassword }
Expected: 200
```

**TC-AUTH-10: Đăng xuất**
```
POST /auth/logout
Expected: 200, cookie bị xóa
```

---

### Task 7.3 — E2E Test: Room & Messaging (2.5–3h)

#### [NEW] `tests/scripts/test-rooms.ps1`

**TC-ROOM-01: Tạo cuộc hội thoại nhóm**
```
POST /rooms
Body: { conversationType: "GROUP", conversationName: "Test Group", memberIds: [...] }
Expected: 201, { id, conversationType, conversationName }
```

**TC-ROOM-02: Tạo cuộc hội thoại private**
```
POST /rooms
Body: { conversationType: "PRIVATE", memberIds: [userId2] }
Expected: 201
```

**TC-ROOM-03: Lấy danh sách phòng của user**
```
GET /rooms
Expected: 200, array of conversations user belongs to
```

**TC-ROOM-04: Lấy chi tiết phòng + members**
```
GET /rooms/:id
Expected: 200, { id, members: [...] }
```

**TC-ROOM-05: Lấy lịch sử tin nhắn có pagination**
```
GET /rooms/:id/messages?page=1&limit=20
Expected: 200, { data: [...], pagination: { page, total, totalPages } }
```

**TC-ROOM-06: Thêm thành viên vào nhóm**
```
POST /rooms/:id/members
Body: { userId: "..." }
Expected: 201
```

**TC-ROOM-07: Xóa thành viên khỏi nhóm**
```
DELETE /rooms/:id/members/:userId
Expected: 200
```

**TC-ROOM-08: Truy cập phòng không phải thành viên**
```
GET /rooms/:id (user không phải thành viên)
Expected: 403
```

---

### Task 7.4 — E2E Test: Admin Operations (2h)

#### [NEW] `tests/scripts/test-admin.ps1`

**TC-ADMIN-01: Lấy danh sách users**
```
GET /admin/users (với ADMIN session)
Expected: 200, array of users
```

**TC-ADMIN-02: Non-admin truy cập admin route**
```
GET /admin/users (với USER session)
Expected: 403
```

**TC-ADMIN-03: Cập nhật trạng thái user**
```
PATCH /admin/users/:id/status
Body: { status: "LOCKED" }
Expected: 200, user.status = "LOCKED"
```

**TC-ADMIN-04: Cập nhật role user**
```
PATCH /admin/users/:id/role
Body: { role: "ADMIN" }
Expected: 200
```

**TC-ADMIN-05: Xem audit logs cơ bản**
```
GET /admin/audit-logs
Expected: 200, { data: [...], pagination: { page, total, totalPages } }
```

**TC-ADMIN-06: Xem audit logs với filters**
```
GET /admin/audit-logs?action=LOGIN&status=FAILED&startDate=2026-05-01&page=1&limit=10
Expected: 200, data chỉ chứa LOGIN FAILED
```

**TC-ADMIN-07: Xem thống kê hệ thống**
```
GET /admin/stats
Expected: 200, { totalUsers, activeUsers, totalConversations, totalMessages }
```

**TC-ADMIN-08: Admin tự xóa chính mình**
```
DELETE /admin/users/:ownId
Expected: 400, { error: "Cannot delete your own account" }
```

**TC-ADMIN-09: Xóa user hợp lệ + kiểm tra audit log**
```
DELETE /admin/users/:id
Expected: 200
GET /admin/audit-logs?action=DELETE_USER → phải có bản ghi mới
```

---

### Task 7.5 — Security Tests (3h)

#### [NEW] `tests/scripts/test-security.ps1`

**CORS Tests:**

**TC-SEC-01: Origin không được phép**
```powershell
Invoke-WebRequest -Uri "$BASE_URL/auth/profile" `
  -Headers @{ Origin = "http://evil.com" }
Expected: Không có header Access-Control-Allow-Origin (hoặc CORS error)
```

**TC-SEC-02: Origin được phép**
```powershell
Invoke-WebRequest -Uri "$BASE_URL/auth/profile" `
  -Headers @{ Origin = "http://localhost:5500" }
Expected: Access-Control-Allow-Origin: http://localhost:5500
```

**Rate Limiting Tests:**

**TC-SEC-03: Login rate limit (5 lần / 15 phút)**
```powershell
# Gửi 6 POST /auth/login sai → lần 6 phải 429
for ($i = 1; $i -le 6; $i++) {
    $resp = Invoke-WebRequest -Method POST -Uri "$BASE_URL/auth/login" ...
    Write-Host "Attempt $i`: $($resp.StatusCode)"
}
# Expected: 401 × 5, 429 × 1
```

**TC-SEC-04: Register rate limit (3 lần / 1 giờ)**
```
4 lần đăng ký từ cùng IP → lần 4 phải nhận HTTP 429
```

**TC-SEC-05: Global rate limit**
```
Gửi 301 requests liên tiếp → request 301 phải nhận 429
```

**TC-SEC-06: Admin rate limit (100 / 15 phút)**
```
101 GET /admin/users → request 101 nhận 429
```

**Input Validation & Sanitization Tests:**

**TC-SEC-07: XSS trong displayName**
```
POST /auth/register
displayName: "<img src=x onerror=alert(1)>Admin"
Expected: 201, displayName KHÔNG chứa HTML tags
```

**TC-SEC-08: Request body vượt 10KB**
```
POST /auth/login với body 11KB
Expected: 413 Payload Too Large
```

**TC-SEC-09: SQL Injection qua username**
```
POST /auth/login
username: "' OR '1'='1'; DROP TABLE users; --"
Expected: 401 (Prisma parameterized query — không bị inject)
```

**TC-SEC-10: avatarUrl với javascript: protocol**
```
PUT /auth/profile
avatarUrl: "javascript:alert(1)"
Expected: 400, validation error
```

**Security Headers Tests:**

**TC-SEC-11: Kiểm tra HTTP security headers**
```powershell
$resp = Invoke-WebRequest -Uri "http://localhost:3000/health"
$headers = $resp.Headers

Assert $headers["X-Frame-Options"] -eq "DENY"
Assert $headers["X-Content-Type-Options"] -eq "nosniff"
Assert $headers["Content-Security-Policy"] -ne $null
Assert $headers["X-Powered-By"] -eq $null  # Phải bị ẩn
```

**TC-SEC-12: Không có X-Powered-By header**
```
Response headers KHÔNG được có: X-Powered-By: Express
```

**TC-SEC-13: Response compression**
```powershell
$resp = Invoke-WebRequest -Uri "$BASE_URL/admin/audit-logs" `
  -Headers @{ "Accept-Encoding" = "gzip" }
Assert $resp.Headers["Content-Encoding"] -eq "gzip"
```

**Session Tests:**

**TC-SEC-14: Cookie flags**
```
Sau login, cookie connect.sid phải có: HttpOnly, SameSite=Strict
```

**TC-SEC-15: Sử dụng session sau logout**
```
Login → ghi cookie → Logout → dùng lại cookie cũ
Expected: 401
```

---

### Task 7.6 — Socket.IO Tests (1.5h)

#### [NEW] `tests/scripts/test-socket.ps1` (hoặc dùng Node script)

Vì PowerShell khó test WebSocket, tạo script Node.js riêng:

#### [NEW] `tests/test-socket.mjs`

```javascript
import { io } from "socket.io-client";
// Cần: npm install socket.io-client (devDependency)

// TC-SOCK-01: Kết nối với session hợp lệ → thành công
// TC-SOCK-02: Kết nối không có session → bị từ chối
// TC-SOCK-03: Join room → nhận event room-joined
// TC-SOCK-04: Gửi 10 messages → thành công, lần 11 → RATE_LIMIT_EXCEEDED
// TC-SOCK-05: Gửi message chứa HTML → nhận lại message đã được sanitize
// TC-SOCK-06: Gửi message vào room không phải thành viên → FORBIDDEN
// TC-SOCK-07: Typing indicator → user khác nhận event user-typing
```

**Test cases:**

| TC | Mô tả | Expected |
|----|-------|---------|
| SOCK-01 | Connect với session hợp lệ | `connect` event thành công |
| SOCK-02 | Connect không có session | `connect_error` |
| SOCK-03 | Join room → user khác nhận thông báo | `user-joined` broadcast |
| SOCK-04 | Gửi 11 messages/phút | Lần 11: `error.code = RATE_LIMIT_EXCEEDED` |
| SOCK-05 | Message có HTML `<b>text</b>` | `new-message.content` không có HTML tags |
| SOCK-06 | Gửi vào room không phải thành viên | `error.code = FORBIDDEN` |
| SOCK-07 | Typing event | `user-typing` broadcast đến user khác |

---

### Task 7.7 — Hoàn thiện Swagger Documentation (1.5–2h)

Swagger UI đã có tại `/api-docs`. Cần bổ sung schema components còn thiếu.

#### [MODIFY] `src/routes/room.routes.ts`

Bổ sung Swagger JSDoc đầy đủ cho tất cả room endpoints:
- `GET /rooms` — response schema với pagination
- `POST /rooms` — request body schema với required fields
- `GET /rooms/:id/messages` — query params: `page`, `limit`

#### [MODIFY] Swagger schemas cần thêm

```yaml
components:
  schemas:
    PaginatedAuditLogs:
      type: object
      properties:
        data:
          type: array
          items: { $ref: '#/components/schemas/AuditLog' }
        pagination:
          $ref: '#/components/schemas/Pagination'

    Pagination:
      type: object
      properties:
        page: { type: integer }
        limit: { type: integer }
        total: { type: integer }
        totalPages: { type: integer }

    ErrorResponse:
      type: object
      properties:
        error: { type: string }
```

---

### Task 7.8 — Environment Setup Guide (1h)

#### [NEW] `SETUP.md` (tại root workspace)

Nội dung cần có:

```markdown
## Yêu cầu hệ thống
- Node.js >= 18
- SQL Server Express 2019+
- npm >= 9

## Cài đặt
1. Clone repository
2. cd backend && npm install
3. Copy .env.example → .env, điền giá trị
4. npx prisma migrate dev
5. npx prisma db seed (optional)
6. npm run dev

## Cấu hình SQL Triggers (bảo vệ audit_logs)
Chạy: backend/prisma/protect_audit_logs.sql trên SQL Server

## Các endpoint quan trọng
- Swagger UI: http://localhost:3000/api-docs
- Health check: http://localhost:3000/health
- API base: http://localhost:3000/api/v1

## Test
cd backend/tests && pwsh test-all.ps1
```

---

## 4. THỨ TỰ THỰC HIỆN

```
Task 7.1 (Chuẩn bị môi trường + cấu trúc thư mục tests/)
    ↓
Task 7.2 (E2E Auth)        ─ Cần user/admin account tồn tại
    ↓
Task 7.3 (E2E Rooms)       ─ Cần authenticated user từ Task 7.2
    ↓
Task 7.4 (E2E Admin)       ─ Cần admin account + dữ liệu từ 7.2, 7.3
    ↓
Task 7.5 (Security Tests)  ─ Độc lập, chạy song song được
Task 7.6 (Socket Tests)    ─ Độc lập, cần server đang chạy
    ↓
Task 7.7 (Swagger docs)    ─ Không cần server chạy
    ↓
Task 7.8 (Setup Guide)     ─ Tổng hợp cuối
```

---

## 5. FILE IMPACT SUMMARY

| File | Thao tác | Task |
|------|----------|------|
| `tests/scripts/test-auth.ps1` | **[NEW]** | 7.2 |
| `tests/scripts/test-rooms.ps1` | **[NEW]** | 7.3 |
| `tests/scripts/test-admin.ps1` | **[NEW]** | 7.4 |
| `tests/scripts/test-security.ps1` | **[NEW]** | 7.5 |
| `tests/scripts/test-all.ps1` | **[NEW]** | 7.1 |
| `tests/test-socket.mjs` | **[NEW]** | 7.6 |
| `tests/README.md` | **[NEW]** | 7.1 |
| `src/routes/room.routes.ts` | MODIFY | 7.7 |
| `src/config/swagger.ts` | MODIFY | 7.7 |
| `SETUP.md` | **[NEW]** | 7.8 |

---

## 6. CHECKLIST KẾT THÚC PHASE 7

### E2E Tests
- [ ] TC-AUTH-01 đến TC-AUTH-10: Auth flow hoàn chỉnh
- [ ] TC-ROOM-01 đến TC-ROOM-08: Room & Messaging
- [ ] TC-ADMIN-01 đến TC-ADMIN-09: Admin Operations
- [ ] TC-SOCK-01 đến TC-SOCK-07: Socket.IO events

### Security Tests
- [ ] TC-SEC-01, 02: CORS whitelist hoạt động
- [ ] TC-SEC-03, 04, 05, 06: Rate limiting 4 loại
- [ ] TC-SEC-07, 08, 09, 10: Input validation & sanitization
- [ ] TC-SEC-11, 12, 13: Security headers + compression
- [ ] TC-SEC-14, 15: Session cookie flags + session invalidation

### Documentation
- [ ] Swagger UI hiển thị đúng tất cả 18 endpoints
- [ ] Tất cả request/response schema có đủ examples
- [ ] `SETUP.md` đủ thông tin để developer mới cài đặt được

---

## 7. TIMELINE ƯỚC LƯỢNG

| Task | Nội dung | Thời gian | Tích lũy |
|------|----------|-----------|----------|
| 7.1 | Chuẩn bị môi trường + cấu trúc tests/ | 1h | 1h |
| 7.2 | E2E Auth tests (10 TCs) | 2–2.5h | 3.5h |
| 7.3 | E2E Room & Messaging (8 TCs) | 2.5–3h | 6.5h |
| 7.4 | E2E Admin (9 TCs) | 2h | 8.5h |
| 7.5 | Security tests (15 TCs) | 3h | 11.5h |
| 7.6 | Socket.IO tests (7 TCs) | 1.5h | 13h |
| 7.7 | Swagger documentation | 1.5–2h | 15h |
| 7.8 | SETUP.md | 1h | **15h** ✅ |

> **Tổng: 12–15 giờ** — đúng với ước lượng trong `detail-plan.txt`

---

## 8. KẾT QUẢ ĐẦU RA KỲ VỌNG SAU PHASE 7

| Hạng mục | Kết quả kỳ vọng |
|----------|----------------|
| E2E test coverage | 34 test cases qua tất cả |
| Security test coverage | 15 security test cases qua tất cả |
| Socket test coverage | 7 socket event test cases qua tất cả |
| Swagger UI | 100% endpoints có schema và examples |
| SETUP.md | Developer mới cài đặt được trong < 15 phút |
| TypeScript compilation | ✅ 0 errors |

---

## 9. TỔNG KẾT TOÀN BỘ DỰ ÁN (PHASE 1–7)

| Phase | Nội dung | Giờ | Trạng thái |
|-------|----------|-----|-----------|
| 1 | Database Setup (Prisma schema, SQL Server) | 8–10h | ✅ |
| 2 | Authentication (Argon2id, express-session) | 12–15h | ✅ |
| 3 | RBAC Middleware (requireAuth, requireRole) | 5–6h | ✅ |
| 4 | Socket.IO Chat (real-time, presence) | 9–11h | ✅ |
| 5 | Audit Logging Nâng Cao (AuditAction enum, middleware) | 8–10h | ✅ |
| 6 | Bảo Mật Nâng Cao (Helmet CSP, rate limit, sanitization) | 10–12h | ✅ |
| **7** | **Testing & Documentation** | **12–15h** | 🔲 |
| | **Tổng cộng** | **64–79h** | |
