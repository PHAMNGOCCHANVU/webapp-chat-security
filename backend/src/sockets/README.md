# Ghi chú thư mục sockets

Mục tiêu:

- Tách riêng xử lý sự kiện Socket.io.
- Quản lý join room, send message, receive message.
- Xác thực kết nối realtime bằng session server-side.

Hiện trạng:

- Xác thực socket đang dựa trên `express-session` và cookie `connect.sid`, không dùng `Authorization: Bearer ...` như REST API.
- Session của socket được đối chiếu lại với bảng `sessions` trong SQL Server trước khi cho phép kết nối.
- Kiểm tra quyền tham gia phòng được thực hiện trước khi user join room.
