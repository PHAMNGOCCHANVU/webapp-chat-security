BEGIN TRY

BEGIN TRAN;

IF EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE [name] = 'users_phone_key'
      AND [parent_object_id] = OBJECT_ID('dbo.users')
)
BEGIN
    ALTER TABLE [dbo].[users] DROP CONSTRAINT [users_phone_key];
END;

IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE [name] = 'users_phone_key'
      AND [object_id] = OBJECT_ID('dbo.users')
)
BEGIN
    DROP INDEX [users_phone_key] ON [dbo].[users];
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE [name] = 'IX_User_Phone'
      AND [object_id] = OBJECT_ID('dbo.users')
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [IX_User_Phone]
    ON [dbo].[users]([phone])
    WHERE [phone] IS NOT NULL;
END;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
