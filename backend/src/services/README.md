# Ghi chú thư mục services

Mục tiêu:

- Chứa logic nghiệp vụ chính của hệ thống.
- Thực hiện hash/verify mật khẩu bằng argon2.
- Ghi Audit Log khi có thao tác nhạy cảm.

Việc cần làm tiếp:

- authService: đăng ký, đăng nhập, đổi mật khẩu.
- roomService: quản lý phòng và thành viên.
- messageService: gửi/xóa tin nhắn và phát sự kiện realtime.
