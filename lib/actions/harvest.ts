"use server";
// NOTE: Never abbreviate "Panso Nestor Sherald" as "PNS" in system text.

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
  let shrimpTypeId = (formData.get("shrimpTypeId") as string) || null;
  const scheduledAtRaw = formData.get("scheduledAt") as string;
  const estimatedQtyRaw = formData.get("estimatedQty") as string;
  const unitIdRaw = formData.get("unitId") as string;
  const farmerId = (formData.get("farmerId") as string) || null;

  // Auto-fill from active PondStocking (if any) when fields are missing
  const activeStocking = await prisma.pondStocking.findFirst({
    where: { pondId, status: "ACTIVE" },
    orderBy: { stockedAt: "desc" },
    include: {
      shrimpType: { select: { expectedHarvestUnitId: true } },
    },
  });

  let scheduledAt: Date;
  if (scheduledAtRaw) {
    scheduledAt = new Date(scheduledAtRaw);
  } else if (activeStocking?.expectedHarvestDate) {
    scheduledAt = new Date(activeStocking.expectedHarvestDate);
  } else {
    throw new Error("Scheduled date is required.");
  }

  let estimatedQty: number;
  if (estimatedQtyRaw && estimatedQtyRaw.trim() !== "") {
    estimatedQty = Number(estimatedQtyRaw);
  } else if (activeStocking?.expectedHarvestQty) {
    estimatedQty = Number(activeStocking.expectedHarvestQty);
  } else {
    throw new Error("Estimated quantity is required.");
  }

  let unitId = unitIdRaw;
  if (!unitId && activeStocking?.shrimpType?.expectedHarvestUnitId) {
    unitId = activeStocking.shrimpType.expectedHarvestUnitId;
  }
  if (!unitId) {
    throw new Error("Unit is required.");
  }

  if (!shrimpTypeId && activeStocking) {
    shrimpTypeId = activeStocking.shrimpTypeId;
  }

  const blockingSchedule = await prisma.harvestSchedule.findFirst({
    where: { pondId, status: "SCHEDULED" },
    select: { id: true },
  });
  if (blockingSchedule) {
    throw new Error(
      "This pond already has a scheduled harvest. Complete or cancel it before creating another.",
    );
  }

  await prisma.harvestSchedule.create({
    data: {
      pondId,
      shrimpTypeId,
      pondStockingId: activeStocking?.id ?? null,
      scheduledAt,
      estimatedQty,
      unitId,
      farmerId,
    },
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

export async function updateHarvestSchedule(id: string, formData: FormData) {
  await requireAdmin();
  const shrimpTypeId = (formData.get("shrimpTypeId") as string) || null;
  const scheduledAt = new Date(formData.get("scheduledAt") as string);
  const estimatedQty = Number(formData.get("estimatedQty"));
  const unitId = formData.get("unitId") as string;
  const farmerId = (formData.get("farmerId") as string) || null;

  await prisma.harvestSchedule.update({
    where: { id },
    data: { shrimpTypeId, scheduledAt, estimatedQty, unitId, farmerId },
  });

  revalidatePath("/admin/harvest-schedules");
  revalidatePath("/farmer/harvest");
}

export async function deleteHarvestSchedule(id: string) {
  await requireAdmin();
  await prisma.harvestSchedule.delete({ where: { id } });
  revalidatePath("/admin/harvest-schedules");
  revalidatePath("/farmer/harvest");
}
