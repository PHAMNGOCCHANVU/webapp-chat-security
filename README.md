# Webapp Chat Security

He thong nhan tin noi bo bao mat cho to chuc, tap trung vao 3 yeu to:

- Xac thuc va phan quyen theo vai tro (RBAC).
- Bao ve mat khau bang Argon2id.
- Truy vet hanh dong nhay cam bang Audit Log.

Noi dung nay tong hop tu tai lieu context.md va context-project.md de thanh vien moi clone ve co the bat dau lam viec ngay.

## 1) Muc tieu de tai

- Xay dung webapp chat noi bo cho doanh nghiep vua va nho.
- Ho tro chat 1-1 va chat nhom theo du an/phong ban.
- Kiem soat truy cap trai phep va hien thi 403 khi can.
- Ghi nhat ky thao tac nhay cam de phuc vu trach nhiem giai trinh.

## 2) Kien truc tong quan

- Kieu kien truc: Decoupled Frontend/Backend + Layered Architecture o Backend.
- Backend: Node.js + Express + Prisma + Socket.io + SQL Server.
- Frontend: HTML/CSS/JS thuan, goi API qua Axios, realtime qua Socket.io-client.

Muc dich cua cach chia nay:

- De phat trien song song Frontend va Backend.
- De test bao mat va API bang Postman doc lap voi UI.
- Giam xung dot khi lam viec nhom va merge code.

## 3) Cau truc thu muc

```
/webapp-chat-security
|-- /backend
|   |-- /prisma
|   |   `-- schema.prisma
|   |-- /src
|   |   |-- /config
|   |   |-- /controllers
|   |   |-- /services
|   |   |-- /middlewares
|   |   |-- /routes
|   |   |-- /sockets
|   |   |-- /utils
|   |   |-- app.ts
|   |   `-- server.ts
|   |-- .env
|   |-- package.json
|   `-- tsconfig.json
|-- /frontend
|   |-- /assets
|   |-- /js
|   |   |-- auth.js
|   |   |-- chat.js
|   |   `-- admin.js
|   |-- /pages
|   |   |-- login.html
|   |   |-- chat-room.html
|   |   |-- audit-log.html
|   |   `-- access-denied.html
|   `-- index.html
|-- .gitignore
`-- README.md
```

## 4) Chuc nang uu tien theo vai tro

- User:
  - Dang ky, dang nhap.
  - Chat phong/ca nhan.
- Owner:
  - Quan ly thanh vien trong nhom minh tao.
- Admin:
  - Quan ly nguoi dung, cap quyen.
  - Xem va loc Audit Log.

## 5) Cai dat va chay du an

Yeu cau:

- Node.js LTS.
- SQL Server (Express hoac Azure SQL).

Buoc chay Backend:

1. Mo terminal tai thu muc backend.
2. Cai thu vien:
	- npm install
3. Chinh bien moi truong trong backend/.env (DATABASE_URL, JWT_SECRET).
4. Tao Prisma Client:
	- npm run prisma:generate
5. Chay migration (neu da cau hinh DB san sang):
	- npm run prisma:migrate
6. Chay server dev:
	- npm run dev

Buoc chay Frontend:

1. Mo frontend/index.html bang Live Server hoac static server.
2. Dam bao backend dang chay o cong 4000 (hoac cap nhat URL trong js).

## 6) Nguyen tac lam viec nhom

- Khong hard-code secret vao code.
- Moi API nhay cam phai qua middleware auth + role.
- Moi thao tac thay doi du lieu quan trong phai ghi Audit Log.
- Tuan thu chia lop: route -> controller -> service -> db.

## 7) Cong viec tiep theo (backlog ky thuat)

- Hoan thien middleware JWT, role check, audit logger.
- Hoan thien route v1/auth, v1/rooms, v1/admin.
- Hoan thien service hash/verify mat khau bang Argon2id.
- Them bo test API va test quyen truy cap.
- Nang cap giao dien MH-01 den MH-11 theo tai lieu thiet ke.

