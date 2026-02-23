-- AlterTable
ALTER TABLE "WaterMaintenanceSchedule" ADD COLUMN     "assignedFarmerId" TEXT;

-- AddForeignKey
ALTER TABLE "WaterMaintenanceSchedule" ADD CONSTRAINT "WaterMaintenanceSchedule_assignedFarmerId_fkey" FOREIGN KEY ("assignedFarmerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
