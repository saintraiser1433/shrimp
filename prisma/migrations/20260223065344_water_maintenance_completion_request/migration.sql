-- AlterTable
ALTER TABLE "WaterMaintenanceSchedule" ADD COLUMN     "completionRequestedBy" TEXT;

-- AddForeignKey
ALTER TABLE "WaterMaintenanceSchedule" ADD CONSTRAINT "WaterMaintenanceSchedule_completionRequestedBy_fkey" FOREIGN KEY ("completionRequestedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
