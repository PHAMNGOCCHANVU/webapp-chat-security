# Ghi chú thư mục middlewares

Mục tiêu:

- Chặn truy cập trái phép theo RBAC.
- Kiểm tra access token của REST API trước khi vào controller.
- Ghi log request nhạy cảm phục vụ audit.
- Đồng bộ thông tin người dùng vào session để RBAC và audit dùng lại.

Hiện trạng:

- `auth.middleware.ts`: verify JWT từ header `Authorization: Bearer ...`, kiểm tra trạng thái tài khoản và đồng bộ `req.session.userId`.
- `role.middleware.ts`: kiểm tra role/permission dựa trên session đã có `userId`.
- `audit.middleware.ts`: ghi hành động nhạy cảm của request phục vụ audit log.
- Xác thực `Socket.IO` không đi qua thư mục này mà dùng session cookie `connect.sid` trong `sockets/`.
