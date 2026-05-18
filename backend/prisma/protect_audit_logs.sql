-- ==========================================================
-- SQL Server Trigger: Bảo vệ bảng audit_logs khỏi sửa/xóa
-- Phase 5 - Task 5.5
-- ==========================================================

-- Trigger chống UPDATE
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_audit_logs_no_update')
    DROP TRIGGER trg_audit_logs_no_update;
GO

CREATE TRIGGER trg_audit_logs_no_update
ON audit_logs
INSTEAD OF UPDATE
AS
BEGIN
    RAISERROR('Audit logs are immutable and cannot be modified.', 16, 1);
    ROLLBACK;
END;
GO

-- Trigger chống DELETE
IF EXISTS (SELECT * FROM sys.triggers WHERE name = 'trg_audit_logs_no_delete')
    DROP TRIGGER trg_audit_logs_no_delete;
GO

CREATE TRIGGER trg_audit_logs_no_delete
ON audit_logs
INSTEAD OF DELETE
AS
BEGIN
    RAISERROR('Audit logs are immutable and cannot be deleted.', 16, 1);
    ROLLBACK;
END;
GO
