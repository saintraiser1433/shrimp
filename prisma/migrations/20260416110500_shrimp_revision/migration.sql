-- Add shrimp-type-driven scheduling defaults and inventory status tracking.
ALTER TABLE "ShrimpType"
ADD COLUMN "defaultFeedingIntervalDays" INTEGER,
ADD COLUMN "defaultFeedingQty" DECIMAL(12, 2),
ADD COLUMN "defaultFeedingUnitId" TEXT;

ALTER TABLE "ShrimpInventory"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'AVAILABLE';

ALTER TABLE "FeedingSchedule"
ADD COLUMN "shrimpTypeId" TEXT;

ALTER TABLE "HarvestSchedule"
ADD COLUMN "shrimpTypeId" TEXT;

ALTER TABLE "ShrimpType"
ADD CONSTRAINT "ShrimpType_defaultFeedingUnitId_fkey"
FOREIGN KEY ("defaultFeedingUnitId") REFERENCES "ShrimpUnit"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FeedingSchedule"
ADD CONSTRAINT "FeedingSchedule_shrimpTypeId_fkey"
FOREIGN KEY ("shrimpTypeId") REFERENCES "ShrimpType"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HarvestSchedule"
ADD CONSTRAINT "HarvestSchedule_shrimpTypeId_fkey"
FOREIGN KEY ("shrimpTypeId") REFERENCES "ShrimpType"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ShrimpType_defaultFeedingUnitId_idx" ON "ShrimpType"("defaultFeedingUnitId");
CREATE INDEX "FeedingSchedule_shrimpTypeId_idx" ON "FeedingSchedule"("shrimpTypeId");
CREATE INDEX "HarvestSchedule_shrimpTypeId_idx" ON "HarvestSchedule"("shrimpTypeId");
