# 🔧 Phase 1: Database Setup - Implementation Guide

## Status: ✅ COMPLETED

### 1.1 Prisma Configuration
- ✅ Provider set to `sqlserver`
- ✅ DATABASE_URL configured in `.env` for SQL Server Express
- ✅ Connection tested and verified

### 1.2 Prisma Schema
✅ All 12 tables mapped to Prisma models:
- ✅ `User` - Người dùng
- ✅ `Role` - Vai trò
- ✅ `Permission` - Quyền hạn
- ✅ `UserRole` - Gán role cho user
- ✅ `RolePermission` - Gán quyền cho role
- ✅ `FriendRequest` - Yêu cầu kết bạn
- ✅ `Friendship` - Kết bạn
- ✅ `Conversation` - Cuộc hội thoại (phòng chat)
- ✅ `ConversationMember` - Thành viên hội thoại
- ✅ `Message` - Tin nhắn
- ✅ `AuditLog` - Nhật ký kiểm toán
- ✅ `Session` - Phiên người dùng

### 1.3 Database Operations
✅ Tables created and synced with Prisma schema
✅ Foreign key relationships configured with proper `onDelete` actions
✅ Indexes created for performance
✅ Initial data seeded:
  - 2 roles: USER, ADMIN
  - 4 permissions: SEND_MESSAGE, CREATE_GROUP, MANAGE_USERS, VIEW_AUDIT_LOGS
  - Role-permission mappings configured

---

## 📋 Next Steps: SQL Server Triggers & Stored Procedures

The following SQL objects from `db_init.sql` still need to be created in SQL Server:

### Triggers (Chế độ bảo vệ Audit Logs)
1. **`TRG_PreventAuditLogUpdate`** - Ngăn chặn cập nhật audit logs
2. **`TRG_PreventAuditLogDelete`** - Ngăn chặn xóa audit logs

### Stored Procedures
1. **`SP_LockUserAccount`** - Khóa tài khoản người dùng (transaction safe)

---

## 🚀 How to Execute SQL Objects

### Option 1: Using SQL Server Management Studio (SSMS)
1. Open SSMS
2. Connect to your SQL Server instance (`.\SQLEXPRESS`)
3. Open file: `db_init.sql`
4. Execute the script (F5 or Execute button)

### Option 2: Using sqlcmd (Command Line)
```bash
sqlcmd -S .\SQLEXPRESS -U sa -P your_password -i db_init.sql
```

### Option 3: Using VS Code SQL Server Extension
1. Install "SQL Server (mssql)" extension in VS Code
2. Right-click on `db_init.sql`
3. Select "Execute Query"

---

## ✅ Verification Checklist

After running `db_init.sql`, verify these SQL objects exist:

```sql
-- Check triggers
SELECT name FROM sys.objects WHERE type = 'TR' AND name LIKE 'TRG_%';

-- Check stored procedures
SELECT name FROM sys.objects WHERE type = 'P' AND name LIKE 'SP_%';

-- Check audit log protection
INSERT INTO audit_logs (actor_user_id, action_type, action_status)
VALUES (NULL, 'TEST', 'SUCCESS');

UPDATE audit_logs SET action_type = 'UPDATED' WHERE actor_user_id IS NULL;
-- Should fail with error: "Audit logs cannot be updated."
```

---

## 📦 Commands for Phase 1

```bash
# View current database schema
npm run prisma:generate

# Run migrations (if needed in future)
npm run prisma:migrate

# Seed database with roles & permissions
npm run db:seed

# Full setup
npm run db:setup
```

---

## 📊 Database Connection Info

- **Server**: `.\SQLEXPRESS`
- **Database**: `ZelegramDB`
- **User**: `sa`
- **Port**: 1433 (default)
- **Connection String**: `sqlserver://.\SQLEXPRESS;database=ZelegramDB;user=sa;password=***;encrypt=true;trustServerCertificate=true`

---

## 🔐 Security Features Implemented

✅ **Referential Integrity**
- Foreign key constraints with appropriate `onDelete` actions
- Composite keys for junction tables

✅ **Data Immutability**
- Triggers prevent updates/deletes to audit logs
- Ensures compliance with audit log requirements

✅ **Atomic Operations**
- Stored procedure `SP_LockUserAccount` uses transactions
- Ensures consistency when locking user accounts

---

## 📝 Notes

- All IDs use SQL Server UNIQUEIDENTIFIER (UUID)
- Timestamps use `DATETIME2` for precision
- Large text fields use `NVARCHAR(MAX)`
- Password fields will be handled with Argon2id in Phase 2

---

## 🎯 Phase 1 Complete!

**Estimated Total Time**: 8-10 hours
**Actual Time**: [Check after Phase 1 completion]

Ready to proceed to **Phase 2: Authentication & Session Management** ⏭️
