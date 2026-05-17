/*
  Warnings:

  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Message` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Room` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RoomMember` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- DropForeignKey
ALTER TABLE [dbo].[AuditLog] DROP CONSTRAINT [AuditLog_actorId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[Message] DROP CONSTRAINT [Message_roomId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[Message] DROP CONSTRAINT [Message_senderId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[RoomMember] DROP CONSTRAINT [RoomMember_roomId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[RoomMember] DROP CONSTRAINT [RoomMember_userId_fkey];

-- DropForeignKey
ALTER TABLE [dbo].[Session] DROP CONSTRAINT [Session_userId_fkey];

-- DropTable
DROP TABLE [dbo].[AuditLog];

-- DropTable
DROP TABLE [dbo].[Message];

-- DropTable
DROP TABLE [dbo].[Room];

-- DropTable
DROP TABLE [dbo].[RoomMember];

-- DropTable
DROP TABLE [dbo].[Session];

-- DropTable
DROP TABLE [dbo].[User];

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] NVARCHAR(1000) NOT NULL,
    [username] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [password_hash] NVARCHAR(1000) NOT NULL,
    [display_name] NVARCHAR(1000) NOT NULL,
    [avatar_url] NVARCHAR(1000),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [users_status_df] DEFAULT 'ACTIVE',
    [bio] NVARCHAR(500),
    [phone] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [users_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_username_key] UNIQUE NONCLUSTERED ([username]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email]),
    CONSTRAINT [users_phone_key] UNIQUE NONCLUSTERED ([phone])
);

-- CreateTable
CREATE TABLE [dbo].[roles] (
    [id] NVARCHAR(1000) NOT NULL,
    [role_name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    CONSTRAINT [roles_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [roles_role_name_key] UNIQUE NONCLUSTERED ([role_name])
);

-- CreateTable
CREATE TABLE [dbo].[permissions] (
    [id] NVARCHAR(1000) NOT NULL,
    [permission_name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    CONSTRAINT [permissions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [permissions_permission_name_key] UNIQUE NONCLUSTERED ([permission_name])
);

-- CreateTable
CREATE TABLE [dbo].[user_roles] (
    [userId] NVARCHAR(1000) NOT NULL,
    [roleId] NVARCHAR(1000) NOT NULL,
    [assigned_at] DATETIME2 NOT NULL CONSTRAINT [user_roles_assigned_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [user_roles_pkey] PRIMARY KEY CLUSTERED ([userId],[roleId])
);

-- CreateTable
CREATE TABLE [dbo].[role_permissions] (
    [roleId] NVARCHAR(1000) NOT NULL,
    [permissionId] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [role_permissions_pkey] PRIMARY KEY CLUSTERED ([roleId],[permissionId])
);

-- CreateTable
CREATE TABLE [dbo].[friend_requests] (
    [id] NVARCHAR(1000) NOT NULL,
    [sender_id] NVARCHAR(1000) NOT NULL,
    [receiver_id] NVARCHAR(1000) NOT NULL,
    [message] NVARCHAR(500),
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [friend_requests_status_df] DEFAULT 'PENDING',
    [created_at] DATETIME2 NOT NULL CONSTRAINT [friend_requests_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [responded_at] DATETIME2,
    CONSTRAINT [friend_requests_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [friend_requests_sender_id_receiver_id_key] UNIQUE NONCLUSTERED ([sender_id],[receiver_id])
);

-- CreateTable
CREATE TABLE [dbo].[friendships] (
    [id] NVARCHAR(1000) NOT NULL,
    [user1_id] NVARCHAR(1000) NOT NULL,
    [user2_id] NVARCHAR(1000) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [friendships_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [friendships_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [friendships_user1_id_user2_id_key] UNIQUE NONCLUSTERED ([user1_id],[user2_id])
);

-- CreateTable
CREATE TABLE [dbo].[conversations] (
    [id] NVARCHAR(1000) NOT NULL,
    [conversation_type] NVARCHAR(1000) NOT NULL,
    [conversation_name] NVARCHAR(1000),
    [created_by] NVARCHAR(1000) NOT NULL,
    [direct_message_key] NVARCHAR(1000),
    [last_message_id] NVARCHAR(1000),
    [last_message_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [conversations_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [conversations_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [conversations_direct_message_key_key] UNIQUE NONCLUSTERED ([direct_message_key])
);

-- CreateTable
CREATE TABLE [dbo].[conversation_members] (
    [conversation_id] NVARCHAR(1000) NOT NULL,
    [user_id] NVARCHAR(1000) NOT NULL,
    [member_role] NVARCHAR(1000) NOT NULL CONSTRAINT [conversation_members_member_role_df] DEFAULT 'MEMBER',
    [last_read_at] DATETIME2,
    [unread_count] INT NOT NULL CONSTRAINT [conversation_members_unread_count_df] DEFAULT 0,
    [joined_at] DATETIME2 NOT NULL CONSTRAINT [conversation_members_joined_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [conversation_members_pkey] PRIMARY KEY CLUSTERED ([conversation_id],[user_id])
);

-- CreateTable
CREATE TABLE [dbo].[messages] (
    [id] NVARCHAR(1000) NOT NULL,
    [conversation_id] NVARCHAR(1000) NOT NULL,
    [sender_id] NVARCHAR(1000) NOT NULL,
    [message_content] NVARCHAR(max),
    [image_url] NVARCHAR(1000),
    [is_deleted] BIT NOT NULL CONSTRAINT [messages_is_deleted_df] DEFAULT 0,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [messages_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [messages_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[audit_logs] (
    [id] NVARCHAR(1000) NOT NULL,
    [actor_user_id] NVARCHAR(1000),
    [action_type] NVARCHAR(1000) NOT NULL,
    [target_table] NVARCHAR(1000),
    [target_id] NVARCHAR(1000),
    [action_status] NVARCHAR(1000) NOT NULL,
    [ip_address] NVARCHAR(1000),
    [description] NVARCHAR(max),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [audit_logs_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [audit_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[sessions] (
    [id] NVARCHAR(1000) NOT NULL,
    [sid] NVARCHAR(1000) NOT NULL,
    [data] NVARCHAR(max) NOT NULL,
    [expires_at] DATETIME2 NOT NULL,
    [userId] NVARCHAR(1000),
    [created_at] DATETIME2 NOT NULL CONSTRAINT [sessions_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [sessions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [sessions_sid_key] UNIQUE NONCLUSTERED ([sid])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [friend_requests_sender_id_idx] ON [dbo].[friend_requests]([sender_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [friend_requests_receiver_id_idx] ON [dbo].[friend_requests]([receiver_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [friendships_user1_id_idx] ON [dbo].[friendships]([user1_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [friendships_user2_id_idx] ON [dbo].[friendships]([user2_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [conversations_conversation_type_updated_at_idx] ON [dbo].[conversations]([conversation_type], [updated_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [conversations_created_by_idx] ON [dbo].[conversations]([created_by]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [conversations_last_message_at_idx] ON [dbo].[conversations]([last_message_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [conversation_members_user_id_joined_at_idx] ON [dbo].[conversation_members]([user_id], [joined_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [messages_conversation_id_created_at_idx] ON [dbo].[messages]([conversation_id], [created_at]);

-- AddForeignKey
ALTER TABLE [dbo].[user_roles] ADD CONSTRAINT [user_roles_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[user_roles] ADD CONSTRAINT [user_roles_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[roles]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[role_permissions] ADD CONSTRAINT [role_permissions_roleId_fkey] FOREIGN KEY ([roleId]) REFERENCES [dbo].[roles]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[role_permissions] ADD CONSTRAINT [role_permissions_permissionId_fkey] FOREIGN KEY ([permissionId]) REFERENCES [dbo].[permissions]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[friend_requests] ADD CONSTRAINT [friend_requests_sender_id_fkey] FOREIGN KEY ([sender_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[friend_requests] ADD CONSTRAINT [friend_requests_receiver_id_fkey] FOREIGN KEY ([receiver_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[friendships] ADD CONSTRAINT [friendships_user1_id_fkey] FOREIGN KEY ([user1_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[friendships] ADD CONSTRAINT [friendships_user2_id_fkey] FOREIGN KEY ([user2_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[conversations] ADD CONSTRAINT [conversations_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[conversations] ADD CONSTRAINT [conversations_last_message_id_fkey] FOREIGN KEY ([last_message_id]) REFERENCES [dbo].[messages]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[conversation_members] ADD CONSTRAINT [conversation_members_conversation_id_fkey] FOREIGN KEY ([conversation_id]) REFERENCES [dbo].[conversations]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[conversation_members] ADD CONSTRAINT [conversation_members_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[messages] ADD CONSTRAINT [messages_conversation_id_fkey] FOREIGN KEY ([conversation_id]) REFERENCES [dbo].[conversations]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[messages] ADD CONSTRAINT [messages_sender_id_fkey] FOREIGN KEY ([sender_id]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[audit_logs] ADD CONSTRAINT [audit_logs_actor_user_id_fkey] FOREIGN KEY ([actor_user_id]) REFERENCES [dbo].[users]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[sessions] ADD CONSTRAINT [sessions_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
