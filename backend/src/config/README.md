# Ghi chú thư mục config

Mục tiêu:

- Khai báo và validate biến môi trường.
- Cấp cấu hình cho JWT access token, refresh token và session.
- Tạo cấu hình kết nối Prisma/SQL Server.
- Cấu hình session server-side với PrismaSessionStore.

Hiện trạng:

- `env.ts` đang validate `PORT`, `NODE_ENV`, `DATABASE_URL`, `ENCRYPTION_KEY`, `SESSION_SECRET`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ALLOWED_ORIGINS`.
- `session.ts` đang tạo `express-session` với `PrismaSessionStore`, cookie `connect.sid` có `HttpOnly`, `SameSite=Strict` và `maxAge=24h`.
- Logic ký/verify JWT hiện nằm trong `auth.controller.ts` và `auth.middleware.ts`, chưa tách thành `jwt.ts` riêng.
