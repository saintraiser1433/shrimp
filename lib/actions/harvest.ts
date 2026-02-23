"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sendSmsUsingSavedSettings } from "@/lib/actions/sms";

function formatScheduleDate(d: Date): string {
  return d.toLocaleDateString("en-PH", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

  try {
    if (farmerId) {
      const [farmer, pond] = await Promise.all([
        prisma.user.findUnique({
          where: { id: farmerId, role: "FARMER" },
          select: { phone: true },
        }),
        prisma.pond.findUnique({ where: { id: pondId }, select: { name: true } }),
      ]);
      if (farmer?.phone && pond) {
        const dateStr = formatScheduleDate(scheduledAt);
        const message = `Good day! A harvest schedule has been assigned to you for ${pond.name} on ${dateStr}. Thank you.`;
        await sendSmsUsingSavedSettings([farmer.phone], message);
      }
    }
  } catch {
    // SMS best-effort; schedule creation already succeeded
  }

  revalidatePath("/admin/harvest-schedules");
  revalidatePath("/farmer/harvest");
}
