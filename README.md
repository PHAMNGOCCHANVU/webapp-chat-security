# 🛡️ ZALEGRAM - Secure Realtime Chat & Governance Web Application

**Zalegram** là một ứng dụng web nhắn tin thời gian thực cao cấp, kết hợp giao diện hiện đại và hệ thống bảo mật chuyên sâu. Dự án được phát triển dựa trên mô hình pair-programming nghiêm ngặt với các tiêu chuẩn an toàn thông tin hàng đầu như mã hóa mật khẩu Argon2id, cơ chế xác thực Dual-Token (Access/Refresh Token) qua HTTP-Only Cookie, phân quyền truy cập theo vai trò (RBAC) động và lưu vết nhật ký an ninh hệ thống (Audit Logging) toàn diện.

Đây là tài liệu hướng dẫn kỹ thuật phục vụ bàn giao Phase 1 và sẵn sàng triển khai tiếp tục cho Phase 2.

---

## 🚀 Công Nghệ Sử Dụng (Tech Stack)

### 1. Frontend (Client-side)
* **Core:** React 19 + TypeScript + Vite (Được nâng cấp từ giao diện tĩnh thuần túy sang Single Page Application hiệu năng cao).
* **State Management:** Zustand (Đồng bộ mượt mà trạng thái đăng nhập, danh sách tin nhắn, và realtime socket).
* **Realtime:** Socket.io-client (Quản lý kết nối, sự kiện nhắn tin, trạng thái online/offline, và chỉ báo đang nhập - typing indicators).
* **Styling (CSS):** Tailwind CSS + Radix UI (Shadcn components) mang lại giao diện Glassmorphism cao cấp, hỗ trợ Light/Dark Mode thông minh.
* **HTTP Client:** Axios (Tích hợp interceptor tự động bắt mã lỗi 401 để refresh token ngầm không làm gián đoạn trải nghiệm người dùng).

### 2. Backend (Server-side)
* **Runtime:** Node.js + Express.js.
* **Database & ORM:** Microsoft SQL Server + Prisma ORM (Hỗ trợ di chuyển dữ liệu đồng bộ qua Prisma Migrations).
* **Realtime Server:** Socket.io (Hỗ trợ kết nối đồng thời và quản lý các phòng chat nhóm).

---

## 🔒 Tính Năng Bảo Mật & Quản Trị Hệ Thống (Phase 1)

### 1. Luồng Xác Thực Dual-Token An Toàn
* Mật khẩu người dùng được mã hóa một chiều bằng thuật toán mạnh mẽ **Argon2id** (Chống tấn công vét cạn và tấn công bảng cầu vồng).
* Sau khi đăng nhập thành công:
  * **Access Token (JWT):** Có thời hạn ngắn (3 phút) được lưu trực tiếp trong bộ nhớ RAM của Client (Không lưu LocalStorage/SessionStorage tránh tấn công XSS).
  * **Refresh Token:** Có thời hạn dài (7 ngày) được lưu trữ an toàn trong **HTTP-Only, Secure, SameSite Cookie** của trình duyệt, ngăn chặn hoàn toàn việc đọc token bằng mã script độc hại.

### 2. Phân Quyền Vai Trò Động (Role-Based Access Control - RBAC)
* Hệ thống được trang bị các Role mặc định: `OWNER`, `ADMIN`, `USER`.
* Admin có thể **tạo mới Role tùy chỉnh** và **gán tập hợp quyền hạn (Permissions)** chi tiết cho từng Module hoạt động:
  * `AUTH`: Quản lý xác thực.
  * `USER`: Quản lý hồ sơ cá nhân, đổi mật khẩu, trạng thái tài khoản.
  * `ROLE`: Phân quyền và cập nhật RBAC catalog.
  * `CONVERSATION` & `MEMBER`: Tạo phòng chat nhóm, cấu hình vòng đời nhóm, quản lý thành viên.
  * `MESSAGE` & `FRIEND`: Nhắn tin và gửi yêu cầu kết bạn.
  * `SYSTEM` & `SOCKET`: Giám sát kết nối hệ thống.

### 3. Lưu Vết Nhật Ký Bảo Mật (Audit Logging)
* Mọi hành động nhạy cảm của người dùng hoặc quản trị viên (Đăng nhập sai mật khẩu, đổi Role, khóa tài khoản, truy cập trái phép) đều được tự động lưu vết vào bảng `AuditLog` trong SQL Server.
* Mỗi bản ghi lưu trữ đầy đủ thông tin: **Thời gian (Timestamp), Người thực hiện (Actor), Thao tác (Action), Đối tượng bị tác động (Target), Module, Địa chỉ IP (IP Address), Trình duyệt thiết bị (User Agent) và Trạng thái thao tác (SUCCESS/FAILED)**.

### 4. Admin Dashboard Việt Hóa Cao Cấp
* Trang quản trị giao diện cao cấp đã được **Việt hóa 100% chuyên nghiệp**, đồng thời giữ lại nguyên vẹn các thuật ngữ bảo mật chuyên ngành chuẩn hóa quốc tế như **Audit Log**, **RBAC**, **ADMIN**, **IP Address**, **User Agent** giúp vận hành dễ dàng.
* Cho phép Quản trị viên:
  * Thống kê trực quan số lượng người dùng, phòng chat hoạt động, lịch sử đăng nhập lỗi.
  * Thao tác khóa (LOCK), vô hiệu hóa (DISABLE) hoặc xóa mềm (SOFT-DELETE) tài khoản mà không làm hỏng lịch sử tin nhắn.
  * Thêm/Xóa thành viên ra khỏi phòng chat nhóm thông qua Metadata (Không can thiệp vào nội dung tin nhắn riêng tư để đảm bảo quyền riêng tư).
  * Tra cứu, tìm kiếm và lọc Audit Log theo IP, actor, module, hoặc mốc thời gian một cách nhanh chóng.

---

## 📂 Cấu Trúc Thư Mục Dự Án (Directory Structure)

```text
webapp-chat-security/
├── backend/                  # Mã nguồn phía máy chủ (NodeJS + Prisma)
│   ├── prisma/               # Cấu hình database schema và tệp tin migrations
│   │   ├── migrations/       # Nhật ký lịch sử di cư cơ sở dữ liệu
│   │   └── seed.ts           # Tệp khởi tạo tài khoản mặc định (Admin, user_demo)
│   ├── src/
│   │   ├── controllers/      # Hàm xử lý nghiệp vụ API (Auth, Admin, Room, Friend, Message)
│   │   ├── middlewares/      # Bộ lọc bảo mật (Xác thực JWT, Kiểm tra quyền RBAC)
│   │   ├── routes/           # Định tuyến API
│   │   ├── services/         # Tương tác trực tiếp DB thông qua Prisma
│   │   ├── sockets/          # Xử lý sự kiện tin nhắn thời gian thực
│   │   └── utils/            # Thư viện tiện ích (Argon2id hashing helper)
│   └── package.json
│
├── frontend/                 # Giao diện người dùng (React 19 + Vite + Zustand)
│   ├── src/
│   │   ├── components/       # Các Component dùng chung (UI, Layout, Chat, Friends)
│   │   │   └── admin/        # Component con của Trang Quản trị (Roles, Conversations)
│   │   ├── pages/            # Các trang giao diện chính (ChatAppPage, SignInPage, AdminDashboardPage)
│   │   ├── services/         # Khai báo các cổng API Client (adminService, authService)
│   │   ├── stores/           # Zustand state stores (Auth, Chat, Friend, Theme)
│   │   └── types/            # Định nghĩa kiểu dữ liệu TypeScript tĩnh
│   └── package.json
│
└── database/                 # Các kịch bản SQL Server dự phòng và hỗ trợ di trú
```

---

## 🛠️ Hướng Dẫn Cài Đặt và Khởi Chạy (Installation & Startup)

### 📋 Yêu cầu hệ thống trước khi cài đặt:
1. Đã cài đặt **Node.js** (Phiên bản v18 trở lên).
2. Đã khởi chạy **Microsoft SQL Server** local. 
3. *Mẹo:* Đối với SQL Server Express, chạy tệp lệnh PowerShell `Enable-SQL-TCP.ps1` ở thư mục gốc để tự động cấu hình truy cập mạng TCP/IP trên cổng mặc định `1433`.

### Bước 1: Thiết lập cấu hình môi trường (.env)
Tạo file `.env` tại thư mục `backend/` với chuỗi kết nối SQL Server của bạn:
```env
DATABASE_URL="sqlserver://localhost:1433;database=ZalegramDB;user=sa;password=YourPassword123;encrypt=true;trustServerCertificate=true;"
JWT_SECRET="zalegram_super_secure_jwt_secret_key_2026"
PORT=4000
```

### Bước 2: Cài đặt và di trú cơ sở dữ liệu (Database Migration)
Mở terminal tại thư mục `backend/` và thực thi:
```bash
# 1. Cài đặt các thư viện phụ thuộc của Backend
npm install

# 2. Tạo schema và đồng bộ cấu trúc bảng vào SQL Server
npx prisma migrate dev --name init

# 3. Tải lại thư viện client tự động của Prisma
npx prisma generate

# 4. Gieo dữ liệu tài khoản quản trị và người dùng thử nghiệm mặc định
npx prisma db seed
```
> [!NOTE]
> Kịch bản seed sẽ tự động tạo sẵn 2 tài khoản mặc định được băm mật khẩu Argon2id tương thích:
> * **Tài khoản Admin:** Tên đăng nhập `Admin` / Mật khẩu `Admin@123` (Vai trò `ADMIN`).
> * **Tài khoản Demo User:** Tên đăng nhập `user_demo` / Mật khẩu `User@123` (Vai trò `USER`).

### Bước 3: Khởi chạy máy chủ Backend
Chạy lệnh sau tại thư mục `backend/`:
```bash
npm run dev
```
Hệ thống Backend sẽ lắng nghe kết nối tại địa chỉ `http://localhost:4000`.

### Bước 4: Khởi chạy máy chủ Frontend
Mở một cửa sổ Terminal mới, chuyển đến thư mục `frontend/` và thực thi:
```bash
# 1. Cài đặt thư viện Frontend
npm install

# 2. Khởi chạy máy chủ phát triển
npm run dev
```
Giao diện Zalegram sẽ hiển thị tại địa chỉ `http://localhost:5173` hoặc cổng được cấp phát (ví dụ: `http://localhost:4173`). Đăng nhập bằng tài khoản `Admin` phía trên để vào thẳng trang Quản trị tối cao!

---

## 🎯 Định Hướng Phát Triển Phase 2
1. **Mã hóa tin nhắn đầu-cuối (E2EE):** Thiết lập cơ chế trao đổi khóa DH để mã hóa tin nhắn tại máy khách trước khi gửi qua Socket.
2. **Quản lý Media:** Tích hợp bộ lưu trữ tập tin/hình ảnh mã hóa bảo mật.
3. **Mở rộng các chỉ báo Realtime:** Trạng thái tin nhắn đã gửi (Sent), đã nhận (Delivered), đã đọc (Read).
