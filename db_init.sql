/*
    ============================================================
    REALTIME CHAT WEBAPP
    ============================================================

    Included Core Entities:
    - users
    - roles
    - permissions
    - user_roles
    - role_permissions
    - friend_requests
    - friendships
    - conversations
    - conversation_members
    - messages
    - audit_logs

    Security-Oriented Design:
    - RBAC support
    - Friendship-based access control
    - Audit logging
    - Soft delete support
    - Referential integrity
    ============================================================
*/

USE master;
GO

IF DB_ID('ZelegramDB') IS NULL
BEGIN
    CREATE DATABASE ZelegramDB;
END
GO

USE ZelegramDB;
GO

/*
    ============================================================
    CLEANUP (OPTIONAL FOR DEVELOPMENT)
    ============================================================
*/

-- Drop child tables first
IF OBJECT_ID('dbo.audit_logs', 'U') IS NOT NULL DROP TABLE dbo.audit_logs;
IF OBJECT_ID('dbo.messages', 'U') IS NOT NULL DROP TABLE dbo.messages;
IF OBJECT_ID('dbo.conversation_members', 'U') IS NOT NULL DROP TABLE dbo.conversation_members;
IF OBJECT_ID('dbo.conversations', 'U') IS NOT NULL DROP TABLE dbo.conversations;
IF OBJECT_ID('dbo.friendships', 'U') IS NOT NULL DROP TABLE dbo.friendships;
IF OBJECT_ID('dbo.friend_requests', 'U') IS NOT NULL DROP TABLE dbo.friend_requests;
IF OBJECT_ID('dbo.role_permissions', 'U') IS NOT NULL DROP TABLE dbo.role_permissions;
IF OBJECT_ID('dbo.user_roles', 'U') IS NOT NULL DROP TABLE dbo.user_roles;
IF OBJECT_ID('dbo.permissions', 'U') IS NOT NULL DROP TABLE dbo.permissions;
IF OBJECT_ID('dbo.roles', 'U') IS NOT NULL DROP TABLE dbo.roles;
IF OBJECT_ID('dbo.users', 'U') IS NOT NULL DROP TABLE dbo.users;
GO

/*
    ============================================================
    USERS
    ============================================================
*/

CREATE TABLE users
(
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

    username NVARCHAR(50) NOT NULL UNIQUE,
    email NVARCHAR(255) NOT NULL UNIQUE,

    password_hash NVARCHAR(255) NOT NULL,

    display_name NVARCHAR(100) NOT NULL,

    avatar_url NVARCHAR(500) NULL,

    status NVARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'LOCKED', 'BANNED')),

    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETDATE()
);
GO

/*
    ============================================================
    ROLES
    ============================================================
*/

CREATE TABLE roles
(
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

    role_name NVARCHAR(50) NOT NULL UNIQUE,

    description NVARCHAR(255) NULL
);
GO

/*
    ============================================================
    PERMISSIONS
    ============================================================
*/

CREATE TABLE permissions
(
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

    permission_name NVARCHAR(100) NOT NULL UNIQUE,

    description NVARCHAR(255) NULL
);
GO

/*
    ============================================================
    USER ROLES
    ============================================================
*/

CREATE TABLE user_roles
(
    user_id UNIQUEIDENTIFIER NOT NULL,
    role_id UNIQUEIDENTIFIER NOT NULL,

    assigned_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    PRIMARY KEY (user_id, role_id),

    CONSTRAINT FK_user_roles_users
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT FK_user_roles_roles
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE CASCADE
);
GO

/*
    ============================================================
    ROLE PERMISSIONS
    ============================================================
*/

CREATE TABLE role_permissions
(
    role_id UNIQUEIDENTIFIER NOT NULL,
    permission_id UNIQUEIDENTIFIER NOT NULL,

    PRIMARY KEY (role_id, permission_id),

    CONSTRAINT FK_role_permissions_roles
        FOREIGN KEY (role_id)
        REFERENCES roles(id)
        ON DELETE CASCADE,

    CONSTRAINT FK_role_permissions_permissions
        FOREIGN KEY (permission_id)
        REFERENCES permissions(id)
        ON DELETE CASCADE
);
GO

/*
    ============================================================
    FRIEND REQUESTS
    ============================================================
*/

CREATE TABLE friend_requests
(
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

    sender_id UNIQUEIDENTIFIER NOT NULL,
    receiver_id UNIQUEIDENTIFIER NOT NULL,

    status NVARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),

    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    responded_at DATETIME2 NULL,

    CONSTRAINT FK_friend_requests_sender
        FOREIGN KEY (sender_id)
        REFERENCES users(id),

    CONSTRAINT FK_friend_requests_receiver
        FOREIGN KEY (receiver_id)
        REFERENCES users(id),

    CONSTRAINT CHK_no_self_friend_request
        CHECK (sender_id <> receiver_id)
);
GO

/*
    ============================================================
    FRIENDSHIPS
    ============================================================
*/

CREATE TABLE friendships
(
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

    user1_id UNIQUEIDENTIFIER NOT NULL,
    user2_id UNIQUEIDENTIFIER NOT NULL,

    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_friendships_user1
        FOREIGN KEY (user1_id)
        REFERENCES users(id),

    CONSTRAINT FK_friendships_user2
        FOREIGN KEY (user2_id)
        REFERENCES users(id),

    CONSTRAINT CHK_no_self_friendship
        CHECK (user1_id <> user2_id)
);
GO

/*
    ============================================================
    CONVERSATIONS
    ============================================================
*/

CREATE TABLE conversations
(
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

    conversation_type NVARCHAR(20) NOT NULL
        CHECK (conversation_type IN ('PRIVATE', 'GROUP')),

    conversation_name NVARCHAR(100) NULL,

    created_by UNIQUEIDENTIFIER NOT NULL,

    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_conversations_created_by
        FOREIGN KEY (created_by)
        REFERENCES users(id)
);
GO

/*
    ============================================================
    CONVERSATION MEMBERS
    ============================================================
*/

CREATE TABLE conversation_members
(
    conversation_id UNIQUEIDENTIFIER NOT NULL,
    user_id UNIQUEIDENTIFIER NOT NULL,

    member_role NVARCHAR(20) NOT NULL DEFAULT 'MEMBER'
        CHECK (member_role IN ('OWNER', 'MEMBER')),

    joined_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    PRIMARY KEY (conversation_id, user_id),

    CONSTRAINT FK_conversation_members_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE,

    CONSTRAINT FK_conversation_members_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
);
GO

/*
    ============================================================
    MESSAGES
    ============================================================
*/

CREATE TABLE messages
(
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

    conversation_id UNIQUEIDENTIFIER NOT NULL,
    sender_id UNIQUEIDENTIFIER NOT NULL,

    message_content NVARCHAR(MAX) NOT NULL,

    is_deleted BIT NOT NULL DEFAULT 0,

    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    updated_at DATETIME2 NULL,

    CONSTRAINT FK_messages_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE,

    CONSTRAINT FK_messages_sender
        FOREIGN KEY (sender_id)
        REFERENCES users(id)
);
GO

/*
    ============================================================
    AUDIT LOGS
    ============================================================
*/

CREATE TABLE audit_logs
(
    id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),

    actor_user_id UNIQUEIDENTIFIER NULL,

    action_type NVARCHAR(100) NOT NULL,

    target_table NVARCHAR(100) NULL,

    target_id NVARCHAR(100) NULL,

    action_status NVARCHAR(20) NOT NULL
        CHECK (action_status IN ('SUCCESS', 'FAILED')),

    ip_address NVARCHAR(50) NULL,

    description NVARCHAR(MAX) NULL,

    created_at DATETIME2 NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_audit_logs_actor
        FOREIGN KEY (actor_user_id)
        REFERENCES users(id)
);
GO

/*
    ============================================================
    INDEXES
    ============================================================
*/

CREATE INDEX IX_users_email
ON users(email);

CREATE INDEX IX_users_username
ON users(username);

CREATE INDEX IX_messages_conversation
ON messages(conversation_id);

CREATE INDEX IX_messages_sender
ON messages(sender_id);

CREATE INDEX IX_friend_requests_sender
ON friend_requests(sender_id);

CREATE INDEX IX_friend_requests_receiver
ON friend_requests(receiver_id);

CREATE INDEX IX_audit_logs_actor
ON audit_logs(actor_user_id);

CREATE INDEX IX_audit_logs_created_at
ON audit_logs(created_at);

GO

/*
    ============================================================
    TRIGGER: PREVENT UPDATE AUDIT LOG
    ============================================================
*/

CREATE TRIGGER TRG_PreventAuditLogUpdate
ON audit_logs
INSTEAD OF UPDATE
AS
BEGIN
    RAISERROR (
        'Audit logs cannot be updated.',
        16,
        1
    );

    ROLLBACK TRANSACTION;
END;
GO

/*
    ============================================================
    TRIGGER: PREVENT DELETE AUDIT LOG
    ============================================================
*/

CREATE TRIGGER TRG_PreventAuditLogDelete
ON audit_logs
INSTEAD OF DELETE
AS
BEGIN
    RAISERROR (
        'Audit logs cannot be deleted.',
        16,
        1
    );

    ROLLBACK TRANSACTION;
END;
GO

/*
    ============================================================
    STORED PROCEDURE:
    LOCK USER ACCOUNT
    ============================================================
*/

CREATE PROCEDURE SP_LockUserAccount
(
    @TargetUserId UNIQUEIDENTIFIER,
    @ActorUserId UNIQUEIDENTIFIER
)
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE users
        SET
            status = 'LOCKED',
            updated_at = GETDATE()
        WHERE id = @TargetUserId;

        INSERT INTO audit_logs
        (
            actor_user_id,
            action_type,
            target_table,
            target_id,
            action_status,
            description
        )
        VALUES
        (
            @ActorUserId,
            'LOCK_USER_ACCOUNT',
            'users',
            CAST(@TargetUserId AS NVARCHAR(100)),
            'SUCCESS',
            'Admin locked a user account.'
        );

        COMMIT TRANSACTION;
    END TRY

    BEGIN CATCH
        ROLLBACK TRANSACTION;

        THROW;
    END CATCH
END;
GO

/*
    ============================================================
    SAMPLE ROLES
    ============================================================
*/

INSERT INTO roles(role_name, description)
VALUES
('USER', 'Normal user'),
('ADMIN', 'System administrator');
GO

/*
    ============================================================
    SAMPLE PERMISSIONS
    ============================================================
*/

INSERT INTO permissions(permission_name, description)
VALUES
('SEND_MESSAGE', 'Send messages'),
('CREATE_GROUP', 'Create group conversations'),
('MANAGE_USERS', 'Manage user accounts'),
('VIEW_AUDIT_LOGS', 'View audit logs');
GO
