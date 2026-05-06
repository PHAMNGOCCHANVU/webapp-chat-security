BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] NVARCHAR(1000) NOT NULL,
    [username] NVARCHAR(1000) NOT NULL,
    [displayName] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [passwordHash] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'USER',
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [User_status_df] DEFAULT 'ACTIVE',
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_username_key] UNIQUE NONCLUSTERED ([username]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Session] (
    [id] NVARCHAR(1000) NOT NULL,
    [sid] NVARCHAR(1000) NOT NULL,
    [data] NVARCHAR(max) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [userId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Session_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Session_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Session_sid_key] UNIQUE NONCLUSTERED ([sid])
);

-- CreateTable
CREATE TABLE [dbo].[Room] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [isPrivate] BIT NOT NULL CONSTRAINT [Room_isPrivate_df] DEFAULT 0,
    [isDirect] BIT NOT NULL CONSTRAINT [Room_isDirect_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Room_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Room_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[RoomMember] (
    [id] NVARCHAR(1000) NOT NULL,
    [roomId] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [isOwner] BIT NOT NULL CONSTRAINT [RoomMember_isOwner_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RoomMember_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [RoomMember_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RoomMember_roomId_userId_key] UNIQUE NONCLUSTERED ([roomId],[userId])
);

-- CreateTable
CREATE TABLE [dbo].[Message] (
    [id] NVARCHAR(1000) NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [roomId] NVARCHAR(1000) NOT NULL,
    [senderId] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Message_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Message_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [id] NVARCHAR(1000) NOT NULL,
    [actorId] NVARCHAR(1000),
    [action] NVARCHAR(1000) NOT NULL,
    [targetType] NVARCHAR(1000),
    [targetId] NVARCHAR(1000),
    [description] NVARCHAR(max),
    [metadata] NVARCHAR(max),
    [ipAddress] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- AddForeignKey
ALTER TABLE [dbo].[Session] ADD CONSTRAINT [Session_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RoomMember] ADD CONSTRAINT [RoomMember_roomId_fkey] FOREIGN KEY ([roomId]) REFERENCES [dbo].[Room]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[RoomMember] ADD CONSTRAINT [RoomMember_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Message] ADD CONSTRAINT [Message_roomId_fkey] FOREIGN KEY ([roomId]) REFERENCES [dbo].[Room]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Message] ADD CONSTRAINT [Message_senderId_fkey] FOREIGN KEY ([senderId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_actorId_fkey] FOREIGN KEY ([actorId]) REFERENCES [dbo].[User]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
