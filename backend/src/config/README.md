# Ghi chú thư mục config

Mục tiêu:

- Khai báo và validate biến môi trường.
- Tạo cấu hình JWT (secret, expiresIn).
- Tạo cấu hình kết nối Prisma/SQL Server.

Việc cần làm tiếp:

- Tạo file env.ts để đọc PORT, DATABASE_URL, JWT_SECRET bằng zod.
- Tạo file jwt.ts để gom logic ký/verify token.
