# Ghi chú thư mục middlewares

Mục tiêu:

- Chặn truy cập trái phép theo RBAC.
- Kiểm tra JWT trước khi vào controller.
- Ghi log request nhạy cảm phục vụ audit.

Việc cần làm tiếp:

- auth.middleware.ts: verify JWT.
- role.middleware.ts: cho phép theo vai trò USER/ADMIN/OWNER.
- audit.middleware.ts: ghi hành động POST/PUT/DELETE.
