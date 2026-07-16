-- Listings model migration.
-- 1. Capability flags on PropertyTypes (which listing intents each type supports)
-- 2. Listings table  — one offer (SALE / RENT / SHORT_STAY) per row, max one per
--    type per property; availability + admin approval live per listing
-- 3. StayPricingTiers — guest-count-based nightly pricing for SHORT_STAY listings
-- 4. Backfill: every existing property gets a RENT/MONTHLY listing from its
--    legacy rentAmount/depositAmount columns
-- Safe to re-run: each object/step is guarded with an existence check.

SET NOCOUNT ON;
GO

---------------------------------------------------------------------------
-- 1. PropertyTypes capability flags
---------------------------------------------------------------------------
IF COL_LENGTH('dbo.PropertyTypes', 'allowsSale') IS NULL
    ALTER TABLE dbo.PropertyTypes ADD allowsSale BIT NOT NULL CONSTRAINT DF_PropertyTypes_AllowsSale DEFAULT 0;
GO
IF COL_LENGTH('dbo.PropertyTypes', 'allowsRent') IS NULL
    ALTER TABLE dbo.PropertyTypes ADD allowsRent BIT NOT NULL CONSTRAINT DF_PropertyTypes_AllowsRent DEFAULT 1;
GO
IF COL_LENGTH('dbo.PropertyTypes', 'allowsShortStay') IS NULL
    ALTER TABLE dbo.PropertyTypes ADD allowsShortStay BIT NOT NULL CONSTRAINT DF_PropertyTypes_AllowsShortStay DEFAULT 0;
GO

-- Capability matrix for the seeded types (also re-asserted on app boot by seedPropertyTypes).
UPDATE dbo.PropertyTypes SET allowsSale = 1, allowsRent = 1, allowsShortStay = 0
WHERE name IN ('1 BHK Apartment', '2 BHK Apartment', '3 BHK Apartment', 'House', 'Office', 'Shop', 'Land');
UPDATE dbo.PropertyTypes SET allowsSale = 0, allowsRent = 1, allowsShortStay = 0
WHERE name IN ('1RK', 'Single Room', 'PG', 'Hostel');
UPDATE dbo.PropertyTypes SET allowsSale = 0, allowsRent = 0, allowsShortStay = 1
WHERE name = 'Home Stay';
GO

---------------------------------------------------------------------------
-- 2. Listings
---------------------------------------------------------------------------
IF OBJECT_ID('dbo.Listings', 'U') IS NULL
CREATE TABLE dbo.Listings (
    id                  UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    propertyId          UNIQUEIDENTIFIER NOT NULL,
    listingType         NVARCHAR(20)     NOT NULL,
    currency            NVARCHAR(10)     NOT NULL DEFAULT 'INR',
    -- SALE
    salePrice           DECIMAL(14,2)    NULL,
    isNegotiable        BIT              NOT NULL DEFAULT 0,
    -- RENT
    rentAmount          DECIMAL(12,2)    NULL,
    rentPeriod          NVARCHAR(20)     NULL,
    depositAmount       DECIMAL(12,2)    NULL,
    -- SHORT_STAY
    baseNightlyPrice    DECIMAL(12,2)    NULL,
    extraGuestCharge    DECIMAL(12,2)    NULL,
    maxGuests           INT              NULL,
    minNights           INT              NULL,
    maxNights           INT              NULL,
    availabilityStatus  NVARCHAR(20)     NOT NULL DEFAULT 'AVAILABLE',
    isApprovedByAdmin   BIT              NOT NULL DEFAULT 0,
    createdAt           DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedAt           DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_Listings PRIMARY KEY (id),
    CONSTRAINT UQ_Listings_Property_Type UNIQUE (propertyId, listingType),
    CONSTRAINT FK_Listings_PropertyId FOREIGN KEY (propertyId) REFERENCES dbo.Properties (id) ON DELETE CASCADE,
    CONSTRAINT CK_Listings_ListingType CHECK (listingType IN ('SALE', 'RENT', 'SHORT_STAY')),
    CONSTRAINT CK_Listings_RentPeriod CHECK (rentPeriod IS NULL OR rentPeriod IN ('MONTHLY', 'YEARLY')),
    CONSTRAINT CK_Listings_AvailabilityStatus CHECK (availabilityStatus IN ('AVAILABLE', 'RESERVED', 'UNAVAILABLE'))
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Listings_AvailabilityStatus')
    CREATE INDEX IX_Listings_AvailabilityStatus ON dbo.Listings (availabilityStatus);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Listings_ListingType')
    CREATE INDEX IX_Listings_ListingType ON dbo.Listings (listingType);
GO

---------------------------------------------------------------------------
-- 3. StayPricingTiers
---------------------------------------------------------------------------
IF OBJECT_ID('dbo.StayPricingTiers', 'U') IS NULL
CREATE TABLE dbo.StayPricingTiers (
    id              UNIQUEIDENTIFIER NOT NULL DEFAULT NEWID(),
    listingId       UNIQUEIDENTIFIER NOT NULL,
    guestsUpTo      INT              NOT NULL,
    pricePerNight   DECIMAL(12,2)    NOT NULL,
    createdAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    updatedAt       DATETIME2        NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_StayPricingTiers PRIMARY KEY (id),
    CONSTRAINT UQ_StayPricingTiers_Listing_Guests UNIQUE (listingId, guestsUpTo),
    CONSTRAINT FK_StayPricingTiers_ListingId FOREIGN KEY (listingId) REFERENCES dbo.Listings (id) ON DELETE CASCADE,
    CONSTRAINT CK_StayPricingTiers_GuestsUpTo CHECK (guestsUpTo >= 1)
);
GO

---------------------------------------------------------------------------
-- 4. Backfill: legacy per-month rent -> RENT/MONTHLY listing
---------------------------------------------------------------------------
INSERT INTO dbo.Listings (propertyId, listingType, currency, rentAmount, rentPeriod, depositAmount, availabilityStatus, isApprovedByAdmin)
SELECT p.id, 'RENT', p.currency, p.rentAmount, 'MONTHLY', p.depositAmount, p.availabilityStatus, p.isApprovedByAdmin
FROM dbo.Properties p
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Listings l WHERE l.propertyId = p.id AND l.listingType = 'RENT'
);
GO
