# 🚀 SETUP GUIDE — Secure Internal Chat Backend

> Thời gian cài đặt: < 15 phút

---

## 📋 Yêu cầu hệ thống

| Yêu cầu | Phiên bản |
|---------|----------|
| Node.js | >= 18.0 |
| npm | >= 9.0 |
| SQL Server | Express 2019+ hoặc Azure SQL |
| OS | Windows / Linux / macOS |

---

## ⚡ Cài đặt nhanh

### 1. Clone và cài dependencies

```bash
git clone <repo-url>
cd webapp-chat-security/backend
npm install
```

### 2. Cấu hình môi trường

```bash
# Copy file env mẫu
cp .env.example .env
```

Chỉnh sửa `.env`:

```env
PORT=3000
NODE_ENV=development

# SQL Server connection string
DATABASE_URL=sqlserver://localhost:1433;database=ZelegramDB;user=sa;password=<YourPassword>;trustServerCertificate=true

# Session secret — tạo bằng lệnh:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=<random-32-char-string>

# Origins được phép (phân cách bởi dấu phẩy)
ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500,http://localhost:5173
```

### 3. Khởi tạo database

```bash
# Tạo tables từ Prisma schema
npx prisma migrate dev --name init

# (Optional) Tạo dữ liệu mẫu
npx prisma db seed
```

### 4. Kích hoạt SQL Triggers bảo vệ Audit Logs

Chạy file SQL sau trong SQL Server Management Studio (SSMS):

```
backend/prisma/protect_audit_logs.sql
```

### 5. Khởi động server

```bash
# Development (hot-reload)
npm run dev

# Production
npm run build && npm start
```

---

## 🔗 Các endpoints quan trọng

| Endpoint | Mô tả |
|---------|-------|
| `http://localhost:3000/health` | Health check |
| `http://localhost:3000/api-docs` | Swagger UI |
| `http://localhost:3000/api/v1/auth/register` | Đăng ký |
| `http://localhost:3000/api/v1/auth/login` | Đăng nhập |
| `http://localhost:3000/api/v1/rooms` | Quản lý phòng chat |
| `http://localhost:3000/api/v1/admin` | Admin panel (ADMIN role) |

---

## 🧪 Chạy Tests

### Yêu cầu trước khi test

1. Server đang chạy (`npm run dev`)
2. DB đã được migrate
3. Có tài khoản admin trong DB (username: `admin`, password: `Admin@1234`)

### Cài đặt test mode

Thêm vào `.env`:
```env
NODE_ENV=test
```

> ⚠️ Trong test mode, rate limits được nâng cao để không cản trở automated tests.

### Chạy tests

```powershell
# Chạy tất cả test suites
powershell -ExecutionPolicy Bypass -File "tests/scripts/test-all.ps1"

# Chạy từng suite riêng lẻ
powershell -ExecutionPolicy Bypass -File "tests/scripts/test-auth.ps1"
powershell -ExecutionPolicy Bypass -File "tests/scripts/test-rooms.ps1"
powershell -ExecutionPolicy Bypass -File "tests/scripts/test-admin.ps1"
powershell -ExecutionPolicy Bypass -File "tests/scripts/test-security.ps1"
```

---

## 🏗️ Cấu trúc thư mục

```
backend/
├── src/
│   ├── app.ts              # Express app (middleware pipeline)
│   ├── server.ts           # HTTP server + Socket.IO
│   ├── config/             # Cấu hình tập trung
│   │   ├── cors.ts         # CORS từ env ALLOWED_ORIGINS
│   │   ├── env.ts          # Zod env validation
│   │   ├── rate-limit.ts   # Rate limiters
│   │   ├── session.ts      # Session với PrismaStore
│   │   └── swagger.ts      # Swagger UI setup
│   ├── controllers/        # Request handlers
│   ├── middlewares/        # auth, role, audit
│   ├── routes/             # Route definitions
│   ├── services/           # Business logic
│   ├── sockets/            # Socket.IO event handlers
│   └── utils/              # Helpers: sanitize, rate-limiter
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── protect_audit_logs.sql  # SQL triggers (immutable audit logs)
│   └── migrations/
├── tests/
│   └── scripts/            # PowerShell E2E + Security tests
├── .env.example            # Environment template
└── package.json
```

---

## 🔐 Tính năng bảo mật

| Layer | Cơ chế |
|-------|--------|
| **Authentication** | express-session + Argon2id password hash |
| **Authorization** | RBAC: USER / ADMIN roles |
| **Session** | PrismaSessionStore (SQL Server), HttpOnly + SameSite=Strict |
| **CSP** | Helmet custom CSP cho Socket.IO và Swagger |
| **CORS** | Whitelist từ env, shared Express + Socket.IO |
| **Rate Limiting** | Global 300/15m, Login 5/15m, Register 3/h, Admin 100/15m |
| **Socket Rate Limit** | 10 messages/min/user (in-memory) |
| **Input Sanitization** | Strip HTML, encode entities, URL validation |
| **Payload Limit** | 10KB max per request |
| **Audit Logging** | Immutable audit log với SQL triggers |
| **Response Compression** | gzip level 6, threshold 1KB |

---

## 🐛 Xử lý lỗi thường gặp

### ❌ `Database connection failed`
- Kiểm tra SQL Server đang chạy
- Verify `DATABASE_URL` trong `.env`
- Kiểm tra firewall không block port 1433

### ❌ `SESSION_SECRET` validation failed  
- `SESSION_SECRET` phải >= 10 ký tự
- Tạo key mạnh: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### ❌ CORS error từ frontend
- Thêm origin của frontend vào `ALLOWED_ORIGINS` trong `.env`
- Ví dụ: `ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173`

### ❌ `Too many requests (429)` khi test
- Set `NODE_ENV=test` trong `.env` để nâng rate limits
- Hoặc restart server để reset in-memory rate limit counters
