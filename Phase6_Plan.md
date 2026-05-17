# 📋 PHASE 6: BẢO MẬT NÂNG CAO — KẾ HOẠCH CHI TIẾT

> **Dự án:** Webapp Chat Nội Bộ Bảo Mật (Secure Internal Chat)
> **Thời lượng ước tính:** 10–12 giờ
> **Phụ thuộc:** Phase 1–5 ✅
> **Ngày lập:** 17/05/2026

---

## 1. MỤC TIÊU PHASE 6

Theo `detail-plan.txt`, Phase 6 cần hoàn thành:

| # | Yêu cầu | Mô tả |
|---|---------|-------|
| 1 | Helmet.js: CSP, X-Frame-Options, HSTS | Cấu hình HTTP security headers đầy đủ |
| 2 | CORS whitelist | Kiểm soát nghiêm ngặt danh sách origin được phép |
| 3 | Rate limiting nâng cao | auth (5/15m), register (3/h), **messages (10/m)** |
| 4 | Input sanitization, prevent XSS | Làm sạch đầu vào trước khi xử lý |
| 5 | Response compression | Nén response để tối ưu hiệu năng |

---

## 2. PHÂN TÍCH HIỆN TRẠNG (GAP ANALYSIS)

### 2.1. Bảo mật đã có (Phase 1–5)

| Thành phần | Trạng thái | Ghi chú |
|------------|-----------|---------|
| `helmet()` mặc định | ✅ Có | `app.use(helmet())` — chưa cấu hình CSP tùy chỉnh |
| CORS whitelist | ✅ Cơ bản | 4 origin hardcode trong `app.ts`, chưa load từ env |
| Rate limit login | ✅ Có | 5 lần / 15 phút per IP |
| Rate limit register | ✅ Có | 3 lần / 1 giờ per IP |
| Argon2id + HttpOnly cookie | ✅ Có | Phase 2 |
| RBAC middleware | ✅ Có | Phase 3 |
| Audit logging | ✅ Có | Phase 5 |
| Zod validation | ✅ Có | Tất cả input đầu vào |

### 2.2. Thiếu / Cần nâng cấp

| Gap | Mức độ | Chi tiết |
|-----|--------|---------|
| **Helmet CSP tùy chỉnh** | 🔴 Chưa cấu hình | `helmet()` dùng default — chưa có CSP phù hợp với Socket.IO và Swagger |
| **Rate limit messages (Socket.IO)** | 🔴 Chưa có | `send-message` không giới hạn — nguy cơ spam |
| **Rate limit admin API** | 🟡 Chưa có | Admin endpoints không được bảo vệ khỏi request flood |
| **Global rate limit** | 🟡 Chưa có | Không có giới hạn toàn cục để chống DDoS cơ bản |
| **Input sanitization** | 🟡 Thiếu | Zod validate format nhưng không strip HTML/script tags |
| **Response compression** | 🔴 Chưa có | Không dùng `compression` — lãng phí bandwidth |
| **CORS từ env** | 🟡 Hardcode | `allowedOrigins` hardcode trong `app.ts` và `server.ts` |
| **Request payload size** | 🔴 Chưa giới hạn | `express.json()` không giới hạn payload size |
| **`.env.example`** | 🔴 Chưa có | Thiếu file hướng dẫn cấu hình môi trường |

---

## 3. DANH SÁCH TASK CHI TIẾT

### Task 6.1 — Cài đặt package mới (0.5h)

```bash
npm install compression
npm install --save-dev @types/compression
```

> `helmet`, `express-rate-limit`, `cors` đã có sẵn trong `package.json`.

---

### Task 6.2 — Nâng cấp Helmet.js với CSP đầy đủ (2–2.5h)

> **Mục tiêu:** Thay `helmet()` mặc định bằng cấu hình tường minh, phù hợp với Socket.IO và Swagger UI.

#### [MODIFY] `src/app.ts`

Thay:
```typescript
app.use(helmet());
```

Bằng:
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
      styleSrc:  ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
      imgSrc:    ["'self'", "data:", "validator.swagger.io"],
      connectSrc: [
        "'self'",
        "ws://localhost:3000",
        "wss://localhost:3000",
      ],
      fontSrc:   ["'self'", "data:"],
      objectSrc: ["'none'"],
      frameSrc:  ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false, // Tắt để tránh conflict với Swagger UI
  hsts: {
    maxAge: 31536000,       // 1 năm
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  xFrameOptions: { action: "deny" },
}));
```

**Lưu ý:** Nếu Swagger UI bị lỗi CSP, điều chỉnh `scriptSrc`/`styleSrc`.

---

### Task 6.3 — CORS nâng cấp (load từ env) (1–1.5h)

> **Mục tiêu:** Tập trung CORS config vào 1 file, load origins từ env, dùng chung cho Express và Socket.IO.

#### [MODIFY] `src/config/env.ts`

Thêm biến:
```typescript
ALLOWED_ORIGINS: z.string().default(
  "http://127.0.0.1:5500,http://localhost:5500"
),
```

#### [NEW] `src/config/cors.ts`

```typescript
import { env } from "./env";

export const allowedOrigins: string[] = env.ALLOWED_ORIGINS
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
  maxAge: 86400, // preflight cache 24h
};
```

#### [MODIFY] `src/app.ts`
- Import `corsOptions` từ `src/config/cors.ts`
- Xóa `allowedOrigins` hardcode

#### [MODIFY] `src/server.ts`
- Import `allowedOrigins` từ `src/config/cors.ts`
- Thay thế array hardcode trong Socket.IO CORS config

---

### Task 6.4 — Rate Limiting Nâng Cao (2.5–3h)

> **Mục tiêu:** Tập trung tất cả rate limit vào 1 file, thêm global/admin/socket limits.

#### [NEW] `src/config/rate-limit.ts`

```typescript
import rateLimit from "express-rate-limit";

// 1. Global (DDoS protection cơ bản)
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 phút
  max: 300,                   // 300 req/15min/IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});

// 2. Register: 3 lần / 1 giờ
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts." },
});

// 3. Login: 5 lần / 15 phút
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts." },
});

// 4. Change password: 3 lần / 1 giờ
export const changePasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password change attempts." },
});

// 5. Admin API: 100 req / 15 phút
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin requests." },
});
```

#### [NEW] `src/utils/socket-rate-limiter.ts`

```typescript
// In-memory rate limiter cho Socket.IO (không dùng được Express middleware)
export class SocketRateLimiter {
  private limits = new Map<string, { count: number; resetAt: number }>();

  isAllowed(userId: string, maxCount = 10, windowMs = 60_000): boolean {
    const now = Date.now();
    const entry = this.limits.get(userId);

    if (!entry || now > entry.resetAt) {
      this.limits.set(userId, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= maxCount) return false;
    entry.count++;
    return true;
  }

  // Cleanup định kỳ để tránh memory leak
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetAt) this.limits.delete(key);
    }
  }
}
```

#### Các file cần sửa:
- **`src/routes/auth.routes.ts`**: Xóa local limiter, import từ `rate-limit.ts`; thêm `changePasswordLimiter`
- **`src/routes/admin.routes.ts`**: Thêm `adminLimiter` trước `requireAuth`
- **`src/app.ts`**: Đăng ký `globalLimiter` trước tất cả routes
- **`src/sockets/chat.handler.ts`**: Khởi tạo `SocketRateLimiter`, kiểm tra trong `send-message`; cleanup mỗi 5 phút

---

### Task 6.5 — Input Sanitization & XSS Prevention (2–2.5h)

> **Mục tiêu:** Strip HTML/script tags khỏi input để ngăn XSS stored.

#### [NEW] `src/utils/sanitize.ts`

```typescript
/**
 * Strip HTML tags và encode các ký tự đặc biệt
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")           // Xóa HTML tags
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\x00/g, "")              // Xóa null bytes
    .trim();
}

/**
 * Validate URL — chỉ cho phép http/https
 */
export function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Sanitize nội dung tin nhắn — strip HTML, giới hạn độ dài
 */
export function sanitizeMessageContent(content: string): string {
  return sanitizeText(content).slice(0, 2000);
}
```

#### [MODIFY] `src/services/validators.ts`

- `RegisterSchema.displayName`: thêm `.transform(sanitizeText)`
- `UpdateProfileSchema.displayName`: thêm `.transform(sanitizeText)`
- `UpdateProfileSchema.avatarUrl`: thêm `.refine(isSafeUrl, "URL không hợp lệ")`
- **Thêm mới** `MessageContentSchema`:
  ```typescript
  export const MessageContentSchema = z.object({
    content: z.string().min(1).max(2000).transform(sanitizeMessageContent),
    conversationId: z.string().uuid(),
  });
  ```

#### [MODIFY] `src/sockets/chat.handler.ts`

Trong event `send-message`:
- Parse bằng `MessageContentSchema.safeParse(data)`
- Nếu parse thất bại → emit error, return
- Nếu sau sanitize content rỗng → emit error, return
- Dùng `parsed.data.content` để lưu vào DB

#### [MODIFY] `src/app.ts`

Giới hạn request payload size:
```typescript
// Thay:
app.use(express.json());
// Bằng:
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
```

---

### Task 6.6 — Response Compression (1h)

> **Mục tiêu:** Nén HTTP response để giảm bandwidth cho audit logs, user lists, message history.

#### [MODIFY] `src/app.ts`

```typescript
import compression from "compression";

// Đặt ngay sau helmet, trước tất cả routes
app.use(compression({
  filter: (req, res) => {
    if (req.headers["x-no-compression"]) return false;
    return compression.filter(req, res);
  },
  level: 6,        // Cân bằng tốc độ vs tỉ lệ nén
  threshold: 1024, // Chỉ nén response > 1KB
}));
```

---

### Task 6.7 — Hardening bổ sung & .env.example (1h)

#### [MODIFY] `src/app.ts`
```typescript
app.disable("x-powered-by"); // Ẩn "X-Powered-By: Express" header
```

#### [NEW] `.env.example` (tại root `backend/`)
```env
# ── Server ──────────────────────────────────
PORT=3000
NODE_ENV=development

# ── Database ─────────────────────────────────
DATABASE_URL=sqlserver://localhost:1433;database=ZelegramDB;user=sa;password=YourPassword;trustServerCertificate=true

# ── Session ──────────────────────────────────
# Phải là chuỗi ngẫu nhiên tối thiểu 32 ký tự
SESSION_SECRET=change-this-to-a-long-random-string-min-32-chars

# ── CORS (phân cách bởi dấu phẩy) ────────────
ALLOWED_ORIGINS=http://localhost:5500,http://127.0.0.1:5500
```

---

## 4. THỨ TỰ THỰC HIỆN

```
Task 6.1 (Cài packages)
    ↓
Task 6.6 (Compression)   — nhanh, ít rủi ro
    ↓
Task 6.3 (CORS từ env)   — refactor trước khi Helmet
    ↓
Task 6.2 (Helmet CSP)    — cần test kỹ với Swagger + Socket.IO
    ↓
Task 6.4 (Rate Limiting) — tập trung vào 1 file
    ↓
Task 6.5 (Sanitization)  — validators + socket handler
    ↓
Task 6.7 (Hardening misc + .env.example)
```

---

## 5. FILE IMPACT SUMMARY

| File | Thao tác | Task |
|------|----------|------|
| `src/utils/sanitize.ts` | **[NEW]** | 6.5 |
| `src/utils/socket-rate-limiter.ts` | **[NEW]** | 6.4 |
| `src/config/cors.ts` | **[NEW]** | 6.3 |
| `src/config/rate-limit.ts` | **[NEW]** | 6.4 |
| `.env.example` | **[NEW]** | 6.7 |
| `src/app.ts` | MODIFY | 6.2, 6.3, 6.4, 6.5, 6.6, 6.7 |
| `src/config/env.ts` | MODIFY | 6.3 |
| `src/services/validators.ts` | MODIFY | 6.5 |
| `src/routes/auth.routes.ts` | MODIFY | 6.4 |
| `src/routes/admin.routes.ts` | MODIFY | 6.4 |
| `src/sockets/chat.handler.ts` | MODIFY | 6.4, 6.5 |
| `src/server.ts` | MODIFY | 6.3 |

---

## 6. KẾ HOẠCH KIỂM THỬ

### 6.1. Helmet CSP
- Kiểm tra response headers trong DevTools → Tab Network
- Swagger UI (`/api-docs`) vẫn tải được sau khi bật CSP

### 6.2. CORS
```bash
# Origin không được phép → bị block (không có CORS header)
curl -H "Origin: http://evil.com" http://localhost:3000/api/v1/auth/profile -v

# Origin được phép → có header Access-Control-Allow-Origin
curl -H "Origin: http://localhost:5500" http://localhost:3000/api/v1/auth/profile -v
```

### 6.3. Rate Limiting
```bash
# Gửi 6 login request liên tục → lần 6 nhận HTTP 429
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST http://localhost:3000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
done
# Expected: 401 401 401 401 401 429
```

### 6.4. Sanitization
- Register với `displayName = "<script>alert(1)</script>"` → phải được strip thành `alert(1)`
- Gửi request body vượt 10KB → HTTP 413 Payload Too Large
- Gửi 11 Socket.IO messages trong 1 phút → lần 11 nhận `error: RATE_LIMIT_EXCEEDED`

### 6.5. Compression
```bash
curl -H "Accept-Encoding: gzip" http://localhost:3000/api/v1/admin/audit-logs \
  --cookie "connect.sid=..." -v 2>&1 | grep "Content-Encoding"
# Expected: Content-Encoding: gzip
```

---

## 7. TIMELINE ƯỚC LƯỢNG

| Task | Nội dung | Thời gian | Tích lũy |
|------|----------|-----------|----------|
| 6.1 | Cài packages | 0.5h | 0.5h |
| 6.6 | Response Compression | 1h | 1.5h |
| 6.3 | CORS từ env | 1–1.5h | 3h |
| 6.2 | Helmet CSP | 2–2.5h | 5.5h |
| 6.4 | Rate Limiting nâng cao | 2.5–3h | 8.5h |
| 6.5 | Input Sanitization | 2–2.5h | 11h |
| 6.7 | Hardening bổ sung + .env | 1h | **12h** |

> **Tổng: 10–12 giờ** — đúng với ước lượng trong `detail-plan.txt`

---

## 8. KẾT QUẢ ĐẦU RA KỲ VỌNG

| Tiêu chí | Trước Phase 6 | Sau Phase 6 |
|----------|--------------|------------|
| HTTP Security Headers | Helmet default | Helmet CSP tùy chỉnh đầy đủ |
| CORS config | Hardcode trong `app.ts` | Load từ env, tập trung `cors.ts` |
| Rate limit coverage | Auth endpoints | **Toàn bộ API + Socket.IO messages** |
| XSS protection | Zod format only | Strip HTML + encode entities |
| Payload size | Không giới hạn | Tối đa 10KB per request |
| Response compression | Không | gzip, threshold 1KB |
| Socket spam | Không giới hạn | 10 msg/phút/user |
| `.env` documentation | Không có | `.env.example` đầy đủ |
