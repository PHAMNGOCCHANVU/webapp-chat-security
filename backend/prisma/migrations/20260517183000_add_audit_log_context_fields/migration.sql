IF OBJECT_ID(N'dbo.audit_logs', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[audit_logs] (
        [id] NVARCHAR(1000) NOT NULL,
        [actor_user_id] NVARCHAR(1000) NULL,
        [action_type] NVARCHAR(1000) NOT NULL,
        [module_name] NVARCHAR(1000) NULL,
        [target_table] NVARCHAR(1000) NULL,
        [target_id] NVARCHAR(1000) NULL,
        [action_status] NVARCHAR(1000) NOT NULL,
        [ip_address] NVARCHAR(1000) NULL,
        [user_agent] NVARCHAR(1000) NULL,
        [description] NVARCHAR(max) NULL,
        [created_at] DATETIME2 NOT NULL
            CONSTRAINT [audit_logs_created_at_df_recovery] DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT [audit_logs_pkey_recovery] PRIMARY KEY CLUSTERED ([id])
    );

    ALTER TABLE [dbo].[audit_logs]
    ADD CONSTRAINT [audit_logs_actor_user_id_fkey_recovery]
        FOREIGN KEY ([actor_user_id]) REFERENCES [dbo].[users]([id])
        ON DELETE SET NULL ON UPDATE CASCADE;
END;

IF COL_LENGTH('dbo.audit_logs', 'module_name') IS NULL
BEGIN
    ALTER TABLE [dbo].[audit_logs]
    ADD [module_name] NVARCHAR(1000) NULL;
END;

IF COL_LENGTH('dbo.audit_logs', 'user_agent') IS NULL
BEGIN
    ALTER TABLE [dbo].[audit_logs]
    ADD [user_agent] NVARCHAR(1000) NULL;
END;
