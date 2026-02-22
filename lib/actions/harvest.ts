"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function createHarvestSchedule(formData: FormData) {
  await requireAdmin();
  const pondId = formData.get("pondId") as string;
  const scheduledAt = new Date(formData.get("scheduledAt") as string);
  const estimatedQty = Number(formData.get("estimatedQty"));
  const unitId = formData.get("unitId") as string;
  const farmerId = (formData.get("farmerId") as string) || null;
  await prisma.harvestSchedule.create({
    data: { pondId, scheduledAt, estimatedQty, unitId, farmerId },
  });
  revalidatePath("/admin/feeding-schedules");
  revalidatePath("/farmer/harvest");
}
