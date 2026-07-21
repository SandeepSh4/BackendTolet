-- Chat feature (Phase D): per-user-pair conversations with delivery ticks.
-- Conversations/Messages tables already exist (created by sync/schema.sql);
-- this migration adds the tick + context columns and the pagination index.
-- Safe to re-run: every step is guarded.

SET NOCOUNT ON;
GO

-- 1. Messages: deliveredAt (grey double tick; readAt = blue already exists)
IF COL_LENGTH('dbo.Messages', 'deliveredAt') IS NULL
    ALTER TABLE dbo.Messages ADD deliveredAt DATETIME2 NULL;
GO

-- 2. Conversations: property context (which accepted application opened the thread)
-- NOTE: sequelize-sync-created tables map UUID to CHAR(36) on MSSQL — the FK
-- column must match Properties.id exactly.
IF COL_LENGTH('dbo.Conversations', 'propertyId') IS NULL
    ALTER TABLE dbo.Conversations ADD propertyId CHAR(36) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_Conversations_PropertyId')
    ALTER TABLE dbo.Conversations
        ADD CONSTRAINT FK_Conversations_PropertyId FOREIGN KEY (propertyId)
        REFERENCES dbo.Properties (id) ON DELETE SET NULL;
GO

-- 3. History pagination index
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Messages_Conversation_CreatedAt')
    CREATE INDEX IX_Messages_Conversation_CreatedAt ON dbo.Messages (conversationId, createdAt);
GO
