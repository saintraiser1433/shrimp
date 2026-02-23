"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFarmer } from "@/lib/auth";
import { createNotificationForAdmins } from "@/lib/notifications";

export async function declareHarvest(formData: FormData) {
  const session = await requireFarmer();
  const pondId = formData.get("pondId") as string;
  const actualQty = Number(formData.get("actualQty"));
  const unitId = formData.get("unitId") as string;
  const scheduleIdRaw = (formData.get("scheduleId") as string) || "";
  const scheduleId = scheduleIdRaw.trim() || null;
  const notes = (formData.get("notes") as string) || "";

  if (!scheduleId) {
    throw new Error("A linked schedule is required. Select the harvest schedule this harvest fulfills to avoid variance and confusion.");
  }

  const pond = await prisma.pond.findUnique({ where: { id: pondId } });
  const unit = await prisma.shrimpUnit.findUnique({ where: { id: unitId } });
  const harvest = await prisma.harvest.create({
    data: {
      pondId,
      farmerId: session.user.id,
      actualQty,
      unitId,
      scheduleId,
      notes,
    },
  });
  await prisma.harvestSchedule.update({
    where: { id: scheduleId },
    data: { status: "COMPLETED" },
  });
  await createNotificationForAdmins(
    "NEW_HARVEST",
    `Harvest declared: ${actualQty} ${unit?.abbreviation || unit?.name || "units"} for pond ${pond?.name || pondId}.`,
    harvest.id
  );
  revalidatePath("/farmer/harvest");
  revalidatePath("/admin/harvest-performance");
  revalidatePath("/admin/notifications");
}
