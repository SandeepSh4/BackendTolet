-- Property applications (Phase A of the seeker↔owner application flow).
-- A seeker formally applies for a property; the owner accepts/rejects (with an
-- optional reason). Notifications are persisted in the existing Notifications
-- table. Safe to re-run: each object is guarded with an existence check.

SET NOCOUNT ON;
GO

IF OBJECT_ID('dbo.PropertyApplications', 'U') IS NULL
CREATE TABLE dbo.PropertyApplications (
    id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    propertyId      UNIQUEIDENTIFIER NOT NULL,
    seekerId        UNIQUEIDENTIFIER NOT NULL,
    listingId       UNIQUEIDENTIFIER NULL,
    status          NVARCHAR(20)     NOT NULL DEFAULT 'PENDING',
    note            NVARCHAR(MAX)    NULL,
    rejectionReason NVARCHAR(MAX)    NULL,
    viewedAt        DATETIME2        NULL,
    decidedAt       DATETIME2        NULL,
    createdAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_PropertyApplications PRIMARY KEY (id),
    CONSTRAINT FK_PropertyApplications_PropertyId FOREIGN KEY (propertyId) REFERENCES dbo.Properties (id) ON DELETE CASCADE,
    CONSTRAINT FK_PropertyApplications_SeekerId FOREIGN KEY (seekerId) REFERENCES dbo.Users (id) ON DELETE NO ACTION,
    CONSTRAINT FK_PropertyApplications_ListingId FOREIGN KEY (listingId) REFERENCES dbo.Listings (id) ON DELETE NO ACTION,
    CONSTRAINT CK_PropertyApplications_Status CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'))
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PropertyApplications_PropertyId')
    CREATE INDEX IX_PropertyApplications_PropertyId ON dbo.PropertyApplications (propertyId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PropertyApplications_SeekerId')
    CREATE INDEX IX_PropertyApplications_SeekerId ON dbo.PropertyApplications (seekerId);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_PropertyApplications_Status')
    CREATE INDEX IX_PropertyApplications_Status ON dbo.PropertyApplications (status);
GO

-- One ACTIVE (pending/accepted) application per (property, seeker) — DB-level
-- guard behind the DAO check (filtered unique index).
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_PropertyApplications_Active')
    CREATE UNIQUE INDEX UQ_PropertyApplications_Active
        ON dbo.PropertyApplications (propertyId, seekerId)
        WHERE status IN ('PENDING', 'ACCEPTED');
GO
