-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'FARMER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'FARMER',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Pond" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "size" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Pond_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterMaintenanceSchedule" (
    "id" TEXT NOT NULL,
    "pondId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "WaterMaintenanceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShrimpType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ShrimpType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShrimpUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,

    CONSTRAINT "ShrimpUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShrimpInventory" (
    "id" TEXT NOT NULL,
    "shrimpTypeId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShrimpInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PondShrimpAssignment" (
    "id" TEXT NOT NULL,
    "pondId" TEXT NOT NULL,
    "shrimpInventoryId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT,

    CONSTRAINT "PondShrimpAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedsInventory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitId" TEXT NOT NULL,
    "restockThreshold" DECIMAL(12,2),

    CONSTRAINT "FeedsInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedingSchedule" (
    "id" TEXT NOT NULL,
    "pondId" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedFarmerId" TEXT,

    CONSTRAINT "FeedingSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedingConfirmation" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispensedQty" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "FeedingConfirmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HarvestSchedule" (
    "id" TEXT NOT NULL,
    "pondId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "estimatedQty" DECIMAL(12,2) NOT NULL,
    "unitId" TEXT NOT NULL,
    "farmerId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',

    CONSTRAINT "HarvestSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Harvest" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT,
    "pondId" TEXT NOT NULL,
    "farmerId" TEXT NOT NULL,
    "actualQty" DECIMAL(12,2) NOT NULL,
    "unitId" TEXT NOT NULL,
    "harvestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "Harvest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsGatewayConfig" (
    "id" TEXT NOT NULL,
    "gatewayUrl" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "testPhone" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmsGatewayConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterMaintenanceSchedule" ADD CONSTRAINT "WaterMaintenanceSchedule_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "Pond"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShrimpInventory" ADD CONSTRAINT "ShrimpInventory_shrimpTypeId_fkey" FOREIGN KEY ("shrimpTypeId") REFERENCES "ShrimpType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShrimpInventory" ADD CONSTRAINT "ShrimpInventory_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ShrimpUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShrimpInventory" ADD CONSTRAINT "ShrimpInventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PondShrimpAssignment" ADD CONSTRAINT "PondShrimpAssignment_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "Pond"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PondShrimpAssignment" ADD CONSTRAINT "PondShrimpAssignment_shrimpInventoryId_fkey" FOREIGN KEY ("shrimpInventoryId") REFERENCES "ShrimpInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedsInventory" ADD CONSTRAINT "FeedsInventory_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ShrimpUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedingSchedule" ADD CONSTRAINT "FeedingSchedule_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "Pond"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedingSchedule" ADD CONSTRAINT "FeedingSchedule_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "FeedsInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedingSchedule" ADD CONSTRAINT "FeedingSchedule_assignedFarmerId_fkey" FOREIGN KEY ("assignedFarmerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedingConfirmation" ADD CONSTRAINT "FeedingConfirmation_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "FeedingSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedingConfirmation" ADD CONSTRAINT "FeedingConfirmation_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HarvestSchedule" ADD CONSTRAINT "HarvestSchedule_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "Pond"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HarvestSchedule" ADD CONSTRAINT "HarvestSchedule_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ShrimpUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HarvestSchedule" ADD CONSTRAINT "HarvestSchedule_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Harvest" ADD CONSTRAINT "Harvest_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "HarvestSchedule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Harvest" ADD CONSTRAINT "Harvest_pondId_fkey" FOREIGN KEY ("pondId") REFERENCES "Pond"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Harvest" ADD CONSTRAINT "Harvest_farmerId_fkey" FOREIGN KEY ("farmerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Harvest" ADD CONSTRAINT "Harvest_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ShrimpUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
