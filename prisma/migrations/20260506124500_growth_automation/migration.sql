-- Growth automation: stages, pond stockings, late confirmations, expected harvest defaults, schedule linkage.

ALTER TABLE "ShrimpType"
ADD COLUMN "expectedHarvestDays" INTEGER,
ADD COLUMN "expectedHarvestQty" DECIMAL(12, 2),
ADD COLUMN "expectedHarvestUnitId" TEXT;

ALTER TABLE "ShrimpType"
ADD CONSTRAINT "ShrimpType_expectedHarvestUnitId_fkey"
FOREIGN KEY ("expectedHarvestUnitId") REFERENCES "ShrimpUnit"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ShrimpType_expectedHarvestUnitId_idx" ON "ShrimpType"("expectedHarvestUnitId");

CREATE TABLE "ShrimpGrowthStage" (
    "id" TEXT NOT NULL,
    "shrimpTypeId" TEXT NOT NULL,
    "stageName" TEXT NOT NULL,
    "startDayFromStocking" INTEGER NOT NULL,
    "endDayFromStocking" INTEGER NOT NULL,
    "feedId" TEXT,
    "feedQtyPerSession" DECIMAL(12, 2) NOT NULL,
    "feedingSessionsPerDay" INTEGER NOT NULL DEFAULT 1,
    "feedUnitId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ShrimpGrowthStage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShrimpGrowthStage_shrimpTypeId_idx" ON "ShrimpGrowthStage"("shrimpTypeId");
CREATE INDEX "ShrimpGrowthStage_feedId_idx" ON "ShrimpGrowthStage"("feedId");
CREATE INDEX "ShrimpGrowthStage_feedUnitId_idx" ON "ShrimpGrowthStage"("feedUnitId");

ALTER TABLE "ShrimpGrowthStage"
ADD CONSTRAINT "ShrimpGrowthStage_shrimpTypeId_fkey"
FOREIGN KEY ("shrimpTypeId") REFERENCES "ShrimpType"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShrimpGrowthStage"
ADD CONSTRAINT "ShrimpGrowthStage_feedId_fkey"
FOREIGN KEY ("feedId") REFERENCES "FeedsInventory"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ShrimpGrowthStage"
ADD CONSTRAINT "ShrimpGrowthStage_feedUnitId_fkey"
FOREIGN KEY ("feedUnitId") REFERENCES "ShrimpUnit"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PondStocking" (
    "id" TEXT NOT NULL,
    "pondId" TEXT NOT NULL,
    "shrimpTypeId" TEXT NOT NULL,
    "stockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "initialQuantity" DECIMAL(12, 2) NOT NULL,
    "initialUnitId" TEXT,
    "expectedHarvestDate" TIMESTAMP(3),
    "expectedHarvestQty" DECIMAL(12, 2),
    "assignedFarmerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PondStocking_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PondStocking_pondId_idx" ON "PondStocking"("pondId");
CREATE INDEX "PondStocking_shrimpTypeId_idx" ON "PondStocking"("shrimpTypeId");
CREATE INDEX "PondStocking_initialUnitId_idx" ON "PondStocking"("initialUnitId");
CREATE INDEX "PondStocking_assignedFarmerId_idx" ON "PondStocking"("assignedFarmerId");

ALTER TABLE "PondStocking"
ADD CONSTRAINT "PondStocking_pondId_fkey"
FOREIGN KEY ("pondId") REFERENCES "Pond"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PondStocking"
ADD CONSTRAINT "PondStocking_shrimpTypeId_fkey"
FOREIGN KEY ("shrimpTypeId") REFERENCES "ShrimpType"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PondStocking"
ADD CONSTRAINT "PondStocking_initialUnitId_fkey"
FOREIGN KEY ("initialUnitId") REFERENCES "ShrimpUnit"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PondStocking"
ADD CONSTRAINT "PondStocking_assignedFarmerId_fkey"
FOREIGN KEY ("assignedFarmerId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FeedingSchedule"
ADD COLUMN "pondStockingId" TEXT,
ADD COLUMN "growthStageName" TEXT;

CREATE INDEX "FeedingSchedule_pondStockingId_idx" ON "FeedingSchedule"("pondStockingId");

ALTER TABLE "FeedingSchedule"
ADD CONSTRAINT "FeedingSchedule_pondStockingId_fkey"
FOREIGN KEY ("pondStockingId") REFERENCES "PondStocking"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FeedingConfirmation"
ADD COLUMN "isLate" BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN "lateReason" TEXT;

ALTER TABLE "HarvestSchedule"
ADD COLUMN "pondStockingId" TEXT;

CREATE INDEX "HarvestSchedule_pondStockingId_idx" ON "HarvestSchedule"("pondStockingId");

ALTER TABLE "HarvestSchedule"
ADD CONSTRAINT "HarvestSchedule_pondStockingId_fkey"
FOREIGN KEY ("pondStockingId") REFERENCES "PondStocking"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
