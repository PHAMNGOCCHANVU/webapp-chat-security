/*
    ============================================================
    ZALEGRAM - DATABASE INITIALIZATION SCRIPT (FIXED)
    ============================================================

    Mục tiêu file này:
    - Khởi tạo CSDL ZalegramDB cho webapp nhắn tin realtime.
    - Thiết kế lại phần Admin/RBAC/Audit Log cho rõ ràng, dễ code backend.
    - Dùng thống nhất tên bảng/cột dạng snake_case.
    - Hỗ trợ quản lý user, role, permission, conversation/group và audit log.

    Tài khoản mẫu sau khi chạy script:
    - Admin: username = Admin, password = Admin@123
    - User mẫu: username = user_demo, password = User@123

    Lưu ý:
    - Script này có phần DROP TABLE để reset database khi phát triển.
    - Không dùng cho production nếu chưa bỏ phần cleanup.
    ============================================================
*/

USE master;
GO

IF DB_ID(N'ZalegramDB') IS NULL
BEGIN
    CREATE DATABASE ZalegramDB;
END
GO

USE ZalegramDB;
GO

/*
    ============================================================
    SECURITY SETUP - COLUMN LEVEL ENCRYPTION
    ============================================================
*/
IF NOT EXISTS (SELECT * FROM sys.symmetric_keys WHERE name = 'MsgEncryptKey')
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.symmetric_keys WHERE name = '##MS_DatabaseMasterKey##')
    BEGIN
        CREATE MASTER KEY ENCRYPTION BY PASSWORD = 'MasterKeyPassword@123';
    END

    IF NOT EXISTS (SELECT * FROM sys.certificates WHERE name = 'MsgEncryptCert')
    BEGIN
        CREATE CERTIFICATE MsgEncryptCert WITH SUBJECT = 'Message Encryption';
    END

    CREATE SYMMETRIC KEY MsgEncryptKey
      WITH ALGORITHM = AES_256
      ENCRYPTION BY CERTIFICATE MsgEncryptCert;
END
GO

/*
    ============================================================
    CLEANUP FOR DEVELOPMENT
    ============================================================
*/

IF OBJECT_ID(N'dbo.SP_UnlockUserAccount', N'P') IS NOT NULL DROP PROCEDURE dbo.SP_UnlockUserAccount;
IF OBJECT_ID(N'dbo.SP_LockUserAccount', N'P') IS NOT NULL DROP PROCEDURE dbo.SP_LockUserAccount;
IF OBJECT_ID(N'dbo.SP_WriteAuditLog', N'P') IS NOT NULL DROP PROCEDURE dbo.SP_WriteAuditLog;
GO

IF OBJECT_ID(N'dbo.message_reactions', N'U') IS NOT NULL DROP TABLE dbo.message_reactions;
IF OBJECT_ID(N'dbo.audit_logs', N'U') IS NOT NULL DROP TABLE dbo.audit_logs;
IF OBJECT_ID(N'dbo.messages', N'U') IS NOT NULL DROP TABLE dbo.messages;
IF OBJECT_ID(N'dbo.conversation_members', N'U') IS NOT NULL DROP TABLE dbo.conversation_members;
IF OBJECT_ID(N'dbo.conversations', N'U') IS NOT NULL DROP TABLE dbo.conversations;
IF OBJECT_ID(N'dbo.friendships', N'U') IS NOT NULL DROP TABLE dbo.friendships;
IF OBJECT_ID(N'dbo.friend_requests', N'U') IS NOT NULL DROP TABLE dbo.friend_requests;
IF OBJECT_ID(N'dbo.role_permissions', N'U') IS NOT NULL DROP TABLE dbo.role_permissions;
IF OBJECT_ID(N'dbo.user_roles', N'U') IS NOT NULL DROP TABLE dbo.user_roles;
IF OBJECT_ID(N'dbo.permissions', N'U') IS NOT NULL DROP TABLE dbo.permissions;
IF OBJECT_ID(N'dbo.roles', N'U') IS NOT NULL DROP TABLE dbo.roles;
IF OBJECT_ID(N'dbo.users', N'U') IS NOT NULL DROP TABLE dbo.users;
GO

/*
    ============================================================
    USERS
    ============================================================
*/

CREATE TABLE dbo.users
(
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),

    username NVARCHAR(50) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,

    display_name NVARCHAR(100) NOT NULL,
    avatar_url NVARCHAR(1000) NULL,
    avatar_id NVARCHAR(255) NULL,
    bio NVARCHAR(500) NULL,
    phone NVARCHAR(20) NULL,
    date_of_birth DATE NULL,

    status NVARCHAR(20) NOT NULL DEFAULT N'ACTIVE'
        CONSTRAINT CK_users_status CHECK (status IN (N'ACTIVE', N'LOCKED', N'DISABLED', N'DELETED')),

    is_email_verified BIT NOT NULL DEFAULT 0,
    failed_login_count INT NOT NULL DEFAULT 0,
    locked_until DATETIME2 NULL,
    last_login_at DATETIME2 NULL,
    deleted_at DATETIME2 NULL,

    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT UQ_users_username UNIQUE (username),
    CONSTRAINT UQ_users_email UNIQUE (email)
);
GO

/*
    ============================================================
    ROLES
    ============================================================
*/

CREATE TABLE dbo.roles
(
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),

    role_code NVARCHAR(50) NOT NULL,
    role_name NVARCHAR(100) NOT NULL,
    description NVARCHAR(255) NULL,
    is_system BIT NOT NULL DEFAULT 0,

    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT UQ_roles_role_code UNIQUE (role_code),
    CONSTRAINT UQ_roles_role_name UNIQUE (role_name)
);
GO

/*
    ============================================================
    PERMISSIONS
    ============================================================
*/

CREATE TABLE dbo.permissions
(
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),

    permission_code NVARCHAR(100) NOT NULL,
    permission_name NVARCHAR(150) NOT NULL,
    module NVARCHAR(50) NOT NULL,
    description NVARCHAR(255) NULL,

    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT UQ_permissions_permission_code UNIQUE (permission_code),
    CONSTRAINT UQ_permissions_permission_name UNIQUE (permission_name)
);
GO

/*
    ============================================================
    USER ROLES
    ============================================================
*/

CREATE TABLE dbo.user_roles
(
    user_id UNIQUEIDENTIFIER NOT NULL,
    role_id UNIQUEIDENTIFIER NOT NULL,
    assigned_by UNIQUEIDENTIFIER NULL,
    assigned_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT PK_user_roles PRIMARY KEY (user_id, role_id),

    CONSTRAINT FK_user_roles_user
        FOREIGN KEY (user_id)
        REFERENCES dbo.users(id)
        ON DELETE CASCADE,

    CONSTRAINT FK_user_roles_role
        FOREIGN KEY (role_id)
        REFERENCES dbo.roles(id)
        ON DELETE CASCADE,

    CONSTRAINT FK_user_roles_assigned_by
        FOREIGN KEY (assigned_by)
        REFERENCES dbo.users(id)
);
GO

/*
    ============================================================
    ROLE PERMISSIONS
    ============================================================
*/

CREATE TABLE dbo.role_permissions
(
    role_id UNIQUEIDENTIFIER NOT NULL,
    permission_id UNIQUEIDENTIFIER NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT PK_role_permissions PRIMARY KEY (role_id, permission_id),

    CONSTRAINT FK_role_permissions_role
        FOREIGN KEY (role_id)
        REFERENCES dbo.roles(id)
        ON DELETE CASCADE,

    CONSTRAINT FK_role_permissions_permission
        FOREIGN KEY (permission_id)
        REFERENCES dbo.permissions(id)
        ON DELETE CASCADE
);
GO

/*
    ============================================================
    FRIEND REQUESTS
    ============================================================
*/

CREATE TABLE dbo.friend_requests
(
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),

    sender_id UNIQUEIDENTIFIER NOT NULL,
    receiver_id UNIQUEIDENTIFIER NOT NULL,
    request_message NVARCHAR(255) NULL,

    status NVARCHAR(20) NOT NULL DEFAULT N'PENDING'
        CONSTRAINT CK_friend_requests_status CHECK (status IN (N'PENDING', N'ACCEPTED', N'DECLINED', N'CANCELLED')),

    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    responded_at DATETIME2 NULL,

    CONSTRAINT FK_friend_requests_sender
        FOREIGN KEY (sender_id)
        REFERENCES dbo.users(id),

    CONSTRAINT FK_friend_requests_receiver
        FOREIGN KEY (receiver_id)
        REFERENCES dbo.users(id),

    CONSTRAINT CK_friend_requests_no_self
        CHECK (sender_id <> receiver_id)
);
GO

/*
    Chặn một người gửi nhiều request PENDING đến cùng một người.
*/
CREATE UNIQUE INDEX UX_friend_requests_pending_pair
ON dbo.friend_requests(sender_id, receiver_id)
WHERE status = N'PENDING';
GO

/*
    ============================================================
    FRIENDSHIPS
    ============================================================
*/

CREATE TABLE dbo.friendships
(
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),

    user_a_id UNIQUEIDENTIFIER NOT NULL,
    user_b_id UNIQUEIDENTIFIER NOT NULL,

    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT FK_friendships_user_a
        FOREIGN KEY (user_a_id)
        REFERENCES dbo.users(id),

    CONSTRAINT FK_friendships_user_b
        FOREIGN KEY (user_b_id)
        REFERENCES dbo.users(id),

    CONSTRAINT CK_friendships_no_self
        CHECK (user_a_id <> user_b_id),

    CONSTRAINT UQ_friendships_pair
        UNIQUE (user_a_id, user_b_id)
);
GO

/*
    ============================================================
    CONVERSATIONS
    ============================================================
*/

CREATE TABLE dbo.conversations
(
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),

    conversation_type NVARCHAR(20) NOT NULL
        CONSTRAINT CK_conversations_type CHECK (conversation_type IN (N'DIRECT', N'GROUP')),

    conversation_name NVARCHAR(100) NULL,
    created_by UNIQUEIDENTIFIER NOT NULL,

    status NVARCHAR(20) NOT NULL DEFAULT N'ACTIVE'
        CONSTRAINT CK_conversations_status CHECK (status IN (N'ACTIVE', N'ARCHIVED', N'DELETED')),

    last_message_id UNIQUEIDENTIFIER NULL,

    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT FK_conversations_created_by
        FOREIGN KEY (created_by)
        REFERENCES dbo.users(id)
);
GO

/*
    ============================================================
    CONVERSATION MEMBERS
    ============================================================
*/

CREATE TABLE dbo.conversation_members
(
    conversation_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,

    member_role NVARCHAR(20) NOT NULL DEFAULT N'MEMBER'
        CONSTRAINT CK_conversation_members_role CHECK (member_role IN (N'OWNER', N'ADMIN', N'MEMBER')),

    unread_count INT NOT NULL DEFAULT 0,
    joined_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    left_at DATETIME2 NULL,

    CONSTRAINT PK_conversation_members PRIMARY KEY (conversation_id, user_id),

    CONSTRAINT FK_conversation_members_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES dbo.conversations(id)
        ON DELETE CASCADE,

    CONSTRAINT FK_conversation_members_user
        FOREIGN KEY (user_id)
        REFERENCES dbo.users(id)
        ON DELETE CASCADE
);
GO

/*
    ============================================================
    MESSAGES
    ============================================================
*/

CREATE TABLE dbo.messages
(
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),

    conversation_id UNIQUEIDENTIFIER NOT NULL,
    sender_id UNIQUEIDENTIFIER NOT NULL,

    message_type NVARCHAR(20) NOT NULL DEFAULT N'TEXT'
        CONSTRAINT CK_messages_type CHECK (message_type IN (N'TEXT', N'IMAGE', N'FILE', N'SYSTEM')),

    encrypted_content VARBINARY(MAX) NULL,
    image_url NVARCHAR(1000) NULL,
    file_url NVARCHAR(1000) NULL,
    file_name NVARCHAR(255) NULL,
    file_size INT NULL,

    is_deleted BIT NOT NULL DEFAULT 0,
    deleted_at DATETIME2 NULL,

    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2 NULL,

    CONSTRAINT FK_messages_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES dbo.conversations(id)
        ON DELETE CASCADE,

    CONSTRAINT FK_messages_sender
        FOREIGN KEY (sender_id)
        REFERENCES dbo.users(id),

    CONSTRAINT CK_messages_has_content
        CHECK (message_content IS NOT NULL OR image_url IS NOT NULL OR file_url IS NOT NULL)
);
GO

/*
    ============================================================
    MESSAGE REACTIONS
    ============================================================
*/

CREATE TABLE dbo.message_reactions
(
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),

    message_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,

    reaction_type NVARCHAR(20) NOT NULL
        CONSTRAINT CK_message_reactions_type CHECK (reaction_type IN (N'LIKE', N'LOVE', N'HAHA', N'SAD', N'ANGRY')),

    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT FK_message_reactions_message
        FOREIGN KEY (message_id)
        REFERENCES dbo.messages(id)
        ON DELETE CASCADE,

    CONSTRAINT FK_message_reactions_user
        FOREIGN KEY (user_id)
        REFERENCES dbo.users(id)
        ON DELETE CASCADE,

    CONSTRAINT UQ_message_reactions_user_message
        UNIQUE (message_id, user_id)
);
GO

/*
    ============================================================
    AUDIT LOGS
    ============================================================
*/

CREATE TABLE dbo.audit_logs
(
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),

    actor_user_id UNIQUEIDENTIFIER NULL,

    action_type NVARCHAR(100) NOT NULL,
    module NVARCHAR(50) NOT NULL,

    target_table NVARCHAR(100) NULL,
    target_id NVARCHAR(100) NULL,

    action_status NVARCHAR(20) NOT NULL
        CONSTRAINT CK_audit_logs_status CHECK (action_status IN (N'SUCCESS', N'FAILED', N'DENIED')),

    ip_address NVARCHAR(50) NULL,
    user_agent NVARCHAR(500) NULL,

    old_value NVARCHAR(MAX) NULL,
    new_value NVARCHAR(MAX) NULL,
    description NVARCHAR(MAX) NULL,

    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),

    CONSTRAINT FK_audit_logs_actor
        FOREIGN KEY (actor_user_id)
        REFERENCES dbo.users(id)
);
GO

/*
    ============================================================
    INDEXES
    ============================================================
*/

CREATE INDEX IX_users_status ON dbo.users(status);
CREATE INDEX IX_users_email ON dbo.users(email);
CREATE INDEX IX_users_username ON dbo.users(username);

CREATE INDEX IX_user_roles_user_id ON dbo.user_roles(user_id);
CREATE INDEX IX_user_roles_role_id ON dbo.user_roles(role_id);

CREATE INDEX IX_role_permissions_role_id ON dbo.role_permissions(role_id);
CREATE INDEX IX_role_permissions_permission_id ON dbo.role_permissions(permission_id);

CREATE INDEX IX_friend_requests_sender ON dbo.friend_requests(sender_id);
CREATE INDEX IX_friend_requests_receiver ON dbo.friend_requests(receiver_id);
CREATE INDEX IX_friendships_user_a ON dbo.friendships(user_a_id);
CREATE INDEX IX_friendships_user_b ON dbo.friendships(user_b_id);

CREATE INDEX IX_conversations_type ON dbo.conversations(conversation_type);
CREATE INDEX IX_conversations_status ON dbo.conversations(status);
CREATE INDEX IX_conversation_members_user ON dbo.conversation_members(user_id);

CREATE INDEX IX_messages_conversation_created_at ON dbo.messages(conversation_id, created_at DESC);
CREATE INDEX IX_messages_sender ON dbo.messages(sender_id);
CREATE INDEX IX_messages_is_deleted ON dbo.messages(is_deleted);

CREATE INDEX IX_message_reactions_message ON dbo.message_reactions(message_id);
CREATE INDEX IX_message_reactions_user ON dbo.message_reactions(user_id);

CREATE INDEX IX_audit_logs_actor ON dbo.audit_logs(actor_user_id);
CREATE INDEX IX_audit_logs_created_at ON dbo.audit_logs(created_at DESC);
CREATE INDEX IX_audit_logs_action_type ON dbo.audit_logs(action_type);
CREATE INDEX IX_audit_logs_module ON dbo.audit_logs(module);
CREATE INDEX IX_audit_logs_status ON dbo.audit_logs(action_status);
GO

/*
    ============================================================
    TRIGGERS: PROTECT AUDIT LOGS
    ============================================================
*/

CREATE TRIGGER dbo.TRG_PreventAuditLogUpdate
ON dbo.audit_logs
INSTEAD OF UPDATE
AS
BEGIN
    RAISERROR (N'Audit logs cannot be updated.', 16, 1);
    ROLLBACK TRANSACTION;
END;
GO

CREATE TRIGGER dbo.TRG_PreventAuditLogDelete
ON dbo.audit_logs
INSTEAD OF DELETE
AS
BEGIN
    RAISERROR (N'Audit logs cannot be deleted.', 16, 1);
    ROLLBACK TRANSACTION;
END;
GO

/*
    ============================================================
    STORED PROCEDURE: WRITE AUDIT LOG
    ============================================================
*/

CREATE PROCEDURE dbo.SP_WriteAuditLog
(
    @ActorUserId UNIQUEIDENTIFIER = NULL,
    @ActionType NVARCHAR(100),
    @Module NVARCHAR(50),
    @TargetTable NVARCHAR(100) = NULL,
    @TargetId NVARCHAR(100) = NULL,
    @ActionStatus NVARCHAR(20),
    @IpAddress NVARCHAR(50) = NULL,
    @UserAgent NVARCHAR(500) = NULL,
    @OldValue NVARCHAR(MAX) = NULL,
    @NewValue NVARCHAR(MAX) = NULL,
    @Description NVARCHAR(MAX) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO dbo.audit_logs
    (
        actor_user_id,
        action_type,
        module,
        target_table,
        target_id,
        action_status,
        ip_address,
        user_agent,
        old_value,
        new_value,
        description
    )
    VALUES
    (
        @ActorUserId,
        @ActionType,
        @Module,
        @TargetTable,
        @TargetId,
        @ActionStatus,
        @IpAddress,
        @UserAgent,
        @OldValue,
        @NewValue,
        @Description
    );
END;
GO

/*
    ============================================================
    STORED PROCEDURE: LOCK USER ACCOUNT
    ============================================================
*/

CREATE PROCEDURE dbo.SP_LockUserAccount
(
    @TargetUserId UNIQUEIDENTIFIER,
    @ActorUserId UNIQUEIDENTIFIER,
    @IpAddress NVARCHAR(50) = NULL,
    @UserAgent NVARCHAR(500) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TargetUserIdText NVARCHAR(100) = CONVERT(NVARCHAR(100), @TargetUserId);

    -- Kiểm tra trước khi mở transaction để log lỗi không bị rollback.
    IF @TargetUserId = @ActorUserId
        BEGIN
            EXEC dbo.SP_WriteAuditLog
                @ActorUserId = @ActorUserId,
                @ActionType = N'LOCK_USER',
                @Module = N'USER_MANAGEMENT',
                @TargetTable = N'users',
                @TargetId = @TargetUserIdText,
                @ActionStatus = N'FAILED',
                @IpAddress = @IpAddress,
                @UserAgent = @UserAgent,
                @Description = N'Admin cannot lock their own account.';

            RAISERROR (N'Admin cannot lock their own account.', 16, 1);
            RETURN;
        END

    IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE id = @TargetUserId AND status <> N'DELETED')
        BEGIN
            EXEC dbo.SP_WriteAuditLog
                @ActorUserId = @ActorUserId,
                @ActionType = N'LOCK_USER',
                @Module = N'USER_MANAGEMENT',
                @TargetTable = N'users',
                @TargetId = @TargetUserIdText,
                @ActionStatus = N'FAILED',
                @IpAddress = @IpAddress,
                @UserAgent = @UserAgent,
                @Description = N'Target user not found.';

            RAISERROR (N'Target user not found.', 16, 1);
            RETURN;
        END

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.users
        SET
            status = N'LOCKED',
            updated_at = SYSDATETIME()
        WHERE id = @TargetUserId;

        EXEC dbo.SP_WriteAuditLog
            @ActorUserId = @ActorUserId,
            @ActionType = N'LOCK_USER',
            @Module = N'USER_MANAGEMENT',
            @TargetTable = N'users',
            @TargetId = @TargetUserIdText,
            @ActionStatus = N'SUCCESS',
            @IpAddress = @IpAddress,
            @UserAgent = @UserAgent,
            @Description = N'Admin locked a user account.';

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

/*
    ============================================================
    STORED PROCEDURE: UNLOCK USER ACCOUNT
    ============================================================
*/

CREATE PROCEDURE dbo.SP_UnlockUserAccount
(
    @TargetUserId UNIQUEIDENTIFIER,
    @ActorUserId UNIQUEIDENTIFIER,
    @IpAddress NVARCHAR(50) = NULL,
    @UserAgent NVARCHAR(500) = NULL
)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @TargetUserIdText NVARCHAR(100) = CONVERT(NVARCHAR(100), @TargetUserId);

    -- Kiểm tra trước khi mở transaction để log lỗi không bị rollback.
    IF NOT EXISTS (SELECT 1 FROM dbo.users WHERE id = @TargetUserId AND status <> N'DELETED')
        BEGIN
            EXEC dbo.SP_WriteAuditLog
                @ActorUserId = @ActorUserId,
                @ActionType = N'UNLOCK_USER',
                @Module = N'USER_MANAGEMENT',
                @TargetTable = N'users',
                @TargetId = @TargetUserIdText,
                @ActionStatus = N'FAILED',
                @IpAddress = @IpAddress,
                @UserAgent = @UserAgent,
                @Description = N'Target user not found.';

            RAISERROR (N'Target user not found.', 16, 1);
            RETURN;
        END

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE dbo.users
        SET
            status = N'ACTIVE',
            failed_login_count = 0,
            locked_until = NULL,
            updated_at = SYSDATETIME()
        WHERE id = @TargetUserId;

        EXEC dbo.SP_WriteAuditLog
            @ActorUserId = @ActorUserId,
            @ActionType = N'UNLOCK_USER',
            @Module = N'USER_MANAGEMENT',
            @TargetTable = N'users',
            @TargetId = @TargetUserIdText,
            @ActionStatus = N'SUCCESS',
            @IpAddress = @IpAddress,
            @UserAgent = @UserAgent,
            @Description = N'Admin unlocked a user account.';

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

/*
    ============================================================
    SEED DATA: ROLES
    ============================================================
*/

INSERT INTO dbo.roles (role_code, role_name, description, is_system)
VALUES
(N'ADMIN', N'Quản trị viên', N'Quản trị toàn bộ hệ thống.', 1),
(N'USER', N'Người dùng', N'Người dùng thông thường của hệ thống.', 1),
(N'OWNER', N'Chủ nhóm', N'Người tạo và quản lý nhóm chat.', 1);
GO

/*
    ============================================================
    SEED DATA: PERMISSIONS
    ============================================================
*/

INSERT INTO dbo.permissions (permission_code, permission_name, module, description)
VALUES
-- User management
(N'USER_VIEW', N'Xem người dùng', N'USER', N'Cho phép xem danh sách và chi tiết người dùng.'),
(N'USER_CREATE', N'Tạo người dùng', N'USER', N'Cho phép tạo tài khoản người dùng.'),
(N'USER_UPDATE', N'Cập nhật người dùng', N'USER', N'Cho phép cập nhật thông tin người dùng.'),
(N'USER_LOCK', N'Khóa hoặc mở khóa người dùng', N'USER', N'Cho phép khóa hoặc mở khóa tài khoản người dùng.'),
(N'USER_DELETE', N'Xóa mềm người dùng', N'USER', N'Cho phép xóa mềm tài khoản người dùng.'),

-- Role and permission management
(N'ROLE_VIEW', N'Xem vai trò', N'ROLE', N'Cho phép xem danh sách vai trò.'),
(N'ROLE_CREATE', N'Tạo vai trò', N'ROLE', N'Cho phép tạo vai trò mới.'),
(N'ROLE_UPDATE', N'Cập nhật vai trò', N'ROLE', N'Cho phép cập nhật vai trò.'),
(N'ROLE_DELETE', N'Xóa vai trò', N'ROLE', N'Cho phép xóa vai trò không phải role hệ thống.'),
(N'ROLE_ASSIGN', N'Gán hoặc thu hồi vai trò', N'ROLE', N'Cho phép gán hoặc thu hồi vai trò của người dùng.'),
(N'PERMISSION_ASSIGN', N'Gán hoặc thu hồi quyền', N'ROLE', N'Cho phép gán hoặc thu hồi quyền của role.'),

-- Conversation management
(N'CONVERSATION_VIEW', N'Xem cuộc trò chuyện', N'CONVERSATION', N'Cho phép xem danh sách cuộc trò chuyện.'),
(N'CONVERSATION_MANAGE', N'Quản lý cuộc trò chuyện', N'CONVERSATION', N'Cho phép tạo, sửa, khóa nhóm chat và quản lý thành viên.'),

-- Chat user permissions
(N'CHAT_VIEW', N'Xem hội thoại của bản thân', N'CHAT', N'Cho phép xem các hội thoại mà người dùng là thành viên.'),
(N'CHAT_SEND_MESSAGE', N'Gửi tin nhắn', N'CHAT', N'Cho phép gửi tin nhắn trong hội thoại hợp lệ.'),
(N'CHAT_REACT_MESSAGE', N'Thả phản ứng tin nhắn', N'CHAT', N'Cho phép thả phản ứng vào tin nhắn.'),
(N'FRIEND_MANAGE', N'Quản lý bạn bè', N'FRIEND', N'Cho phép gửi, chấp nhận, từ chối lời mời kết bạn.'),

-- Audit
(N'AUDIT_VIEW', N'Xem nhật ký hệ thống', N'AUDIT', N'Cho phép xem và lọc audit log.'),
(N'ADMIN_ACCESS', N'Truy cập trang quản trị', N'ADMIN', N'Cho phép truy cập khu vực quản trị hệ thống.');
GO

/*
    ============================================================
    SEED DATA: ROLE PERMISSIONS
    ============================================================
*/

-- ADMIN có toàn bộ quyền.
INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
CROSS JOIN dbo.permissions p
WHERE r.role_code = N'ADMIN';
GO

-- USER có quyền dùng chat cơ bản.
INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
JOIN dbo.permissions p
    ON p.permission_code IN (N'CHAT_VIEW', N'CHAT_SEND_MESSAGE', N'CHAT_REACT_MESSAGE', N'FRIEND_MANAGE')
WHERE r.role_code = N'USER';
GO

-- OWNER có quyền user + quản lý group ở mức ứng dụng.
INSERT INTO dbo.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM dbo.roles r
JOIN dbo.permissions p
    ON p.permission_code IN (N'CHAT_VIEW', N'CHAT_SEND_MESSAGE', N'CHAT_REACT_MESSAGE', N'FRIEND_MANAGE', N'CONVERSATION_VIEW', N'CONVERSATION_MANAGE')
WHERE r.role_code = N'OWNER';
GO

/*
    ============================================================
    SEED DATA: SAMPLE USERS
    ============================================================
*/

DECLARE @AdminId UNIQUEIDENTIFIER = NEWID();
DECLARE @DemoUserId UNIQUEIDENTIFIER = NEWID();
DECLARE @AdminRoleId UNIQUEIDENTIFIER;
DECLARE @UserRoleId UNIQUEIDENTIFIER;

SELECT @AdminRoleId = id FROM dbo.roles WHERE role_code = N'ADMIN';
SELECT @UserRoleId = id FROM dbo.roles WHERE role_code = N'USER';

INSERT INTO dbo.users
(
    id,
    username,
    email,
    password_hash,
    display_name,
    status,
    is_email_verified
)
VALUES
(
    @AdminId,
    N'Admin',
    N'admin@zalegram.local',
    N'$argon2id$v=19$m=65536,t=3,p=4$e4N8Sda2oYEVPoAmaU0nVg$DXRqjjLMgCTtOTwTePUOZ7mo4qTrqvpSD3umF20cd7g',
    N'Administrator',
    N'ACTIVE',
    1
),
(
    @DemoUserId,
    N'user_demo',
    N'user.demo@zalegram.local',
    N'$argon2id$v=19$m=65536,t=3,p=4$c7QQXLeAL+NGUV0FiReVAA$2WRbc43sdO1wMArsqoTX8D+Fnmj31+JQrc7w+RQUjfk',
    N'Người dùng demo',
    N'ACTIVE',
    1
);

INSERT INTO dbo.user_roles (user_id, role_id, assigned_by)
VALUES
(@AdminId, @AdminRoleId, @AdminId),
(@DemoUserId, @UserRoleId, @AdminId);

EXEC dbo.SP_WriteAuditLog
    @ActorUserId = @AdminId,
    @ActionType = N'SEED_DATABASE',
    @Module = N'SYSTEM',
    @TargetTable = N'database',
    @TargetId = N'ZalegramDB',
    @ActionStatus = N'SUCCESS',
    @Description = N'Database initialized with default roles, permissions, admin account and demo user.';
GO

/*
    ============================================================
    QUICK CHECK
    ============================================================
*/

SELECT DB_NAME() AS current_database;

SELECT
    u.username,
    u.email,
    u.display_name,
    u.status,
    r.role_code
FROM dbo.users u
JOIN dbo.user_roles ur ON ur.user_id = u.id
JOIN dbo.roles r ON r.id = ur.role_id
ORDER BY u.username;

SELECT
    r.role_code,
    COUNT(rp.permission_id) AS permission_count
FROM dbo.roles r
LEFT JOIN dbo.role_permissions rp ON rp.role_id = r.id
GROUP BY r.role_code
ORDER BY r.role_code;

SELECT TOP 10
    action_type,
    module,
    action_status,
    description,
    created_at
FROM dbo.audit_logs
ORDER BY created_at DESC;
GO
