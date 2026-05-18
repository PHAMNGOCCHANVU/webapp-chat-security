# Ứng Dụng Chat Nội Bộ Bảo Mật

Một ứng dụng trò chuyện nội bộ theo thời gian thực an toàn, được xây dựng bằng Node.js, Express, Socket.IO và SQL Server. Dự án này được thiết kế với trọng tâm cao vào các tiêu chuẩn bảo mật, bao gồm kiểm soát truy cập dựa trên vai trò (RBAC), nhật ký kiểm toán (audit log) bất biến và quản lý phiên (session) mạnh mẽ.

## Cấu Trúc Dự Án

Kho lưu trữ này được chia thành hai phần chính:

- **`frontend/`**: Ứng dụng phía máy khách (giao diện người dùng) sử dụng HTML/CSS/JS.
- **`backend/`**: Máy chủ API và WebSocket được xây dựng bằng Express và Socket.IO, kết nối với cơ sở dữ liệu SQL Server thông qua Prisma ORM.

## Các Tính Năng Nổi Bật

- **Nhắn tin theo thời gian thực**: Trải nghiệm nhắn tin tức thời mượt mà sử dụng Socket.IO.
- **Bảo mật mạnh mẽ**: 
  - Mã hóa mật khẩu an toàn bằng thuật toán Argon2id.
  - Quản lý phiên người dùng đáng tin cậy với PrismaSessionStore.
  - Phân quyền nghiêm ngặt dựa trên vai trò (Quyền User và Admin).
  - Áp dụng các chính sách CORS và Content Security Policy (CSP) chặt chẽ.
  - Giới hạn tốc độ (Rate limiting) ở các endpoint API và WebSockets nhằm chống lại brute-force/spam.
- **Nhật ký kiểm toán**: Tự động ghi nhận các thao tác quan trọng vào audit log thông qua SQL triggers, đảm bảo dữ liệu log không thể bị giả mạo hay xóa bỏ.
- **Cơ sở dữ liệu**: Thiết kế chuẩn hóa cơ sở dữ liệu quan hệ với SQL Server.

## Hướng Dẫn Cài Đặt

Vui lòng xem chi tiết tại file [Hướng dẫn cài đặt (SETUP.md)](SETUP.md) để biết thêm về các bước thiết lập môi trường, cấu hình cơ sở dữ liệu và cách khởi động ứng dụng.

## Tài Liệu và Kiểm Thử

- **Tài liệu API với Swagger UI**: Có sẵn tại `http://localhost:3000/api-docs` ngay sau khi backend được khởi động.
- **Kiểm thử**: Được tích hợp sẵn các kịch bản kiểm thử bảo mật và hệ thống (E2E) thông qua PowerShell.
