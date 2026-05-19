# ZALEGRAM

ZALEGRAM là hệ thống nhắn tin thời gian thực có tích hợp quản trị người dùng, phân quyền theo vai trò và ghi nhận nhật ký an ninh. Dự án sử dụng React cho frontend, Express cho backend, Prisma ORM, SQL Server và Socket.IO.

## Tổng quan

Các thành phần chính của hệ thống:

- Nhắn tin 1-1 và nhóm theo thời gian thực
- Trang quản trị với RBAC
- Audit log cho các thao tác quan trọng
- Cơ chế xác thực lai:
  - REST API dùng JWT access token
  - refresh token lưu trong cookie `HttpOnly`
  - server-side session được dùng để quản lý phiên và xác thực Socket.IO

## Cấu trúc thư mục

```text
webapp-chat-security/
|-- backend/              # Express, Prisma, Socket.IO
|-- frontend/             # React, Vite
|-- database/             # SQL scripts hỗ trợ
|-- .env.example          # Mẫu cấu hình cho backend/.env
|-- prepare-demo.bat      # Build nhanh cho chế độ demo
|-- start-demo.bat        # Chạy bản demo
|-- stop-demo.bat         # Tắt bản demo
```

## Yêu cầu môi trường

Trước khi chạy dự án, máy cần có:

1. Node.js 18 trở lên
2. Microsoft SQL Server đang hoạt động
3. Tài khoản SQL Server có quyền truy cập database đích

Gợi ý:

- Nếu dùng SQL Server Express và gặp lỗi kết nối TCP/IP, có thể tham khảo `Enable-SQL-TCP.ps1`.

## Thiết lập file môi trường

Tạo file `backend/.env` từ file mẫu ở thư mục gốc:

```powershell
Copy-Item .env.example .\backend\.env
```

Sau đó mở `backend/.env` và cập nhật các giá trị cho đúng với máy đang chạy.

Mẫu cấu hình tối thiểu:

```env
PORT=4000
NODE_ENV=development
DATABASE_URL="sqlserver://localhost:1433;database=ZalegramDB;user=sa;password=YourPassword123;trustServerCertificate=true"
ENCRYPTION_KEY="64_hex_characters_here"
SESSION_SECRET="your_long_random_session_secret_here"
JWT_SECRET="your_long_random_jwt_secret_here"
JWT_REFRESH_SECRET="your_long_random_refresh_secret_here"
ALLOWED_ORIGINS="http://localhost:5173,http://127.0.0.1:5173,http://localhost:4000,http://127.0.0.1:4000"
```

Lưu ý:

- `ENCRYPTION_KEY` phải là chuỗi hex dài đúng 64 ký tự.
- `SESSION_SECRET`, `JWT_SECRET`, `JWT_REFRESH_SECRET` nên là chuỗi ngẫu nhiên dài ít nhất 32 ký tự.
- `JWT_SECRET` và `JWT_REFRESH_SECRET` không được trùng nhau.

Cách tạo nhanh chuỗi ngẫu nhiên:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Cách chạy nhanh nhất

Đây là cách nên dùng khi demo, thuyết trình hoặc bàn giao.

### Bước 1. Chuẩn bị bản build demo

```powershell
.\prepare-demo.bat
```

Script này sẽ:

- kiểm tra và cài dependency nếu cần
- chạy `db:repair` để áp migration và sửa schema cũ
- build frontend
- build backend

### Bước 2. Khởi động hệ thống

```powershell
.\start-demo.bat
```

Sau khi chạy thành công, mở:

- `http://127.0.0.1:4000/`

### Bước 3. Tắt hệ thống

```powershell
.\stop-demo.bat
```

## Cách chạy ở chế độ phát triển

### Backend

```powershell
cd backend
npm.cmd install
npm.cmd run db:repair
npm.cmd run dev
```

Backend mặc định chạy tại:

- `http://localhost:4000`

### Frontend

Mở terminal khác:

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Frontend mặc định chạy tại:

- `http://localhost:5173`

## Tài khoản mặc định

Nếu database đã được seed, có thể đăng nhập bằng:

- Admin: `Admin` / `Admin@123`
- Demo user: `user_demo` / `User@123`

Nếu các tài khoản trên chưa tồn tại:

```powershell
cd backend
npm.cmd run db:seed
```

## Các lệnh hữu ích

### Backend

```powershell
cd backend
npm.cmd run dev
npm.cmd run build
npm.cmd run start
npm.cmd run db:repair
npm.cmd run db:seed
```

### Frontend

```powershell
cd frontend
npm.cmd run dev
npm.cmd run build
```

## Ghi chú về xác thực

Code hiện tại không phải mô hình session-only thuần túy.

Cơ chế đang dùng trong dự án:

- REST API xác thực bằng JWT access token
- refresh token được lưu trong cookie `HttpOnly`
- `express-session` vẫn được dùng cho quản lý phiên server-side
- Socket.IO xác thực bằng session cookie

Nếu cần viết báo cáo hoặc tài liệu bàn giao, nên mô tả đây là cơ chế xác thực lai, trừ khi về sau nhóm refactor lại theo hướng khác.

## Các lỗi thường gặp

### 1. Lỗi thiếu cột trong Prisma hoặc SQL Server

Chạy:

```powershell
cd backend
npm.cmd run db:repair
```

### 2. Trang quản trị trắng xóa

Build lại frontend rồi khởi động lại demo:

```powershell
cd frontend
npm.cmd run build
```

### 3. PowerShell chặn `npm`

Nếu gặp lỗi liên quan `npm.ps1`, dùng `npm.cmd` thay cho `npm`.

Ví dụ:

```powershell
npm.cmd run build
```

### 4. Bị chặn đăng nhập do quá nhiều lần thử

Trong chế độ demo, `start-demo.bat` đã bật `DEMO_MODE` để nới rate limit đăng nhập.

## Quy trình chạy ngắn gọn cho người chấm

Nếu cần một quy trình ngắn nhất để người khác mở máy và chạy hệ thống:

> [!IMPORTANT]
> **Lưu ý tiên quyết trước khi bắt đầu:**
> 1. **SQL Server đang chạy:** Đảm bảo dịch vụ SQL Server (SQLEXPRESS hoặc phiên bản khác) trên máy tính đang ở trạng thái **Running** (Hoạt động).
> 2. **Cập nhật DATABASE_URL:** Đừng quên mở file `backend/.env` mới tạo ở bước 1 và chỉnh sửa thông tin tài khoản, mật khẩu SQL Server ở biến `DATABASE_URL` cho khớp hoàn toàn với thông số cấu hình máy tính đang chạy trước khi thực hiện bước 3.

1. Tạo `backend/.env` từ `.env.example`
2. Điền đúng `DATABASE_URL` và các secret
3. Chạy `.\prepare-demo.bat`
4. Chạy `.\start-demo.bat`
5. Mở `http://127.0.0.1:4000/`
6. Đăng nhập bằng `Admin / Admin@123`

Đây là quy trình ngắn nhất và ổn định nhất hiện tại để chạy dự án trên Windows.
