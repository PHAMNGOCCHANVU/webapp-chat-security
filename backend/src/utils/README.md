# Ghi chú thư mục utils

Mục tiêu:

- Chứa hàm dùng chung, không phụ thuộc tầng khác.
- Đóng gói helper hash password, validate input.

Việc cần làm tiếp:

- password.ts: hashPassword và verifyPassword bằng argon2.
- validator.ts: schema zod cho auth, room, message.
