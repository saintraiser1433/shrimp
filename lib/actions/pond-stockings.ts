"use server";
// NOTE: Never abbreviate "Panso Nestor Sherald" as "PNS" in system text.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sendSmsUsingSavedSettings } from "@/lib/actions/sms";
import { FEEDING_SCHEDULE_HORIZON_DAYS } from "@/lib/constants/feeding";

/** Rolling window of calendar days ahead for which auto schedules are ensured (today + N−1). */
const SCHEDULE_HORIZON_DAYS = FEEDING_SCHEDULE_HORIZON_DAYS;

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function diffInDays(later: Date, earlier: Date): number {
  const ms = startOfDay(later).getTime() - startOfDay(earlier).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

type GrowthStageRow = {
  id: string;
  stageName: string;
  startDayFromStocking: number;
  endDayFromStocking: number;
  feedId: string | null;
  feedQtyPerSession: { toString(): string } | number;
  feedingSessionsPerDay: number;
};

function findStageForDay(stages: GrowthStageRow[], dayFromStocking: number): GrowthStageRow | null {
  for (const stage of stages) {
    if (
      dayFromStocking >= stage.startDayFromStocking &&
      dayFromStocking <= stage.endDayFromStocking
    ) {
      return stage;
    }
  }
  return null;
}

/**
 * Generate feeding schedules for the upcoming horizon (default 7 days)
 * for a given pond stocking. Skips days that already have a schedule
 * for this stocking, and skips days where no growth stage covers them.
 */
export async function generateSchedulesForCurrentStage(stockingId: string) {
  const stocking = await prisma.pondStocking.findUnique({
    where: { id: stockingId },
    include: {
      shrimpType: { include: { growthStages: { orderBy: { startDayFromStocking: "asc" } } } },
    },
  });
  if (!stocking || stocking.status !== "ACTIVE") return 0;

  const stages = stocking.shrimpType.growthStages;
  if (stages.length === 0) return 0;

  const today = startOfDay(new Date());
  const stockedAtDay = startOfDay(stocking.stockedAt);
  let createdCount = 0;

  for (let i = 0; i < SCHEDULE_HORIZON_DAYS; i++) {
    const targetDate = addDays(today, i);
    const dayFromStocking = diffInDays(targetDate, stockedAtDay) + 1;
    if (dayFromStocking < 1) continue;

    const stage = findStageForDay(stages, dayFromStocking);
    if (!stage) continue;
    if (!stage.feedId) continue;

    const existing = await prisma.feedingSchedule.findFirst({
      where: {
        pondStockingId: stocking.id,
        scheduledAt: {
          gte: targetDate,
          lt: addDays(targetDate, 1),
        },
      },
    });
    if (existing) continue;

    const sessionsPerDay = Math.min(3, Math.max(1, stage.feedingSessionsPerDay));
    for (let s = 0; s < sessionsPerDay; s++) {
      // Spread sessions across the day starting at 06:00, then evenly to 18:00
      const sessionDate = new Date(targetDate);
      const startHour = 6;
      const endHour = 18;
      const hour =
        sessionsPerDay === 1
          ? Math.floor((startHour + endHour) / 2)
          : Math.floor(startHour + ((endHour - startHour) * s) / (sessionsPerDay - 1));
      sessionDate.setHours(hour, 0, 0, 0);

      await prisma.feedingSchedule.create({
        data: {
          pondId: stocking.pondId,
          feedId: stage.feedId,
          shrimpTypeId: stocking.shrimpTypeId,
          pondStockingId: stocking.id,
          growthStageName: stage.stageName,
          scheduledAt: sessionDate,
          quantity: stage.feedQtyPerSession.toString(),
          assignedFarmerId: stocking.assignedFarmerId,
        },
      });
      createdCount += 1;
    }
  }

  return createdCount;
}

/** Best-effort: extend auto-generated rows for every active stocking (safe on repeated calls). */
export async function refreshSchedulesForAllActiveStockings(): Promise<void> {
  const stockings = await prisma.pondStocking.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  for (const { id } of stockings) {
    try {
      await generateSchedulesForCurrentStage(id);
    } catch {
      // ignore per-stocking failures
    }
  }
}

export async function createPondStocking(formData: FormData) {
  await requireAdmin();
  const pondId = formData.get("pondId") as string;
  const shrimpTypeId = formData.get("shrimpTypeId") as string;
  const stockedAtRaw = formData.get("stockedAt") as string;
  const initialQuantity = Number(formData.get("initialQuantity"));
  const initialUnitId = (formData.get("initialUnitId") as string) || null;
  const assignedFarmerId = (formData.get("assignedFarmerId") as string) || null;
  const notes = (formData.get("notes") as string) || null;

  if (!pondId || !shrimpTypeId) {
    throw new Error("Pond and shrimp type are required.");
  }
  if (!Number.isFinite(initialQuantity) || initialQuantity <= 0) {
    throw new Error("Initial quantity must be a positive number.");
  }

  const stockedAt = stockedAtRaw ? new Date(stockedAtRaw) : new Date();
  if (Number.isNaN(stockedAt.getTime())) {
    throw new Error("Invalid stocked-at date.");
  }

  const shrimpType = await prisma.shrimpType.findUnique({
    where: { id: shrimpTypeId },
    select: { expectedHarvestDays: true, expectedHarvestQty: true },
  });
  if (!shrimpType) {
    throw new Error("Shrimp type not found.");
  }

  const expectedHarvestDate = shrimpType.expectedHarvestDays
    ? addDays(stockedAt, shrimpType.expectedHarvestDays)
    : null;
  const expectedHarvestQty =
    shrimpType.expectedHarvestQty === null ? null : shrimpType.expectedHarvestQty.toString();

  const stocking = await prisma.pondStocking.create({
    data: {
      pondId,
      shrimpTypeId,
      stockedAt,
      initialQuantity,
      initialUnitId,
      assignedFarmerId,
      notes,
      expectedHarvestDate,
      expectedHarvestQty,
    },
  });

  // Auto-generate first batch of feeding schedules
  try {
    await generateSchedulesForCurrentStage(stocking.id);
  } catch {
    // Best-effort: stocking record was already created
  }

  // Notify farmer via SMS (best-effort)
  try {
    if (assignedFarmerId) {
      const [farmer, pond] = await Promise.all([
        prisma.user.findUnique({
          where: { id: assignedFarmerId, role: "FARMER" },
          select: { phone: true },
        }),
        prisma.pond.findUnique({ where: { id: pondId }, select: { name: true } }),
      ]);
      if (farmer?.phone && pond) {
        const dateStr = stockedAt.toLocaleDateString("en-PH", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
        const message = `Good day! A new shrimp stocking has been recorded for ${pond.name} on ${dateStr}. Feeding schedules have been generated. Thank you.`;
        await sendSmsUsingSavedSettings([farmer.phone], message);
      }
    }
  } catch {
    // SMS best-effort
  }

  revalidatePath("/admin/pond-stockings");
  revalidatePath("/admin/feeding-schedules");
  revalidatePath("/admin/harvest-performance");
  revalidatePath("/farmer/feeding");
}

export async function terminatePondStocking(id: string) {
  await requireAdmin();
  await prisma.pondStocking.update({
    where: { id },
    data: { status: "TERMINATED" },
  });
  revalidatePath("/admin/pond-stockings");
}

export async function regenerateStockingSchedules(id: string): Promise<void> {
  await requireAdmin();
  await generateSchedulesForCurrentStage(id);
  revalidatePath("/admin/pond-stockings");
  revalidatePath("/admin/feeding-schedules");
  revalidatePath("/farmer/feeding");
}

export async function deletePondStocking(id: string) {
  await requireAdmin();
  await prisma.pondStocking.delete({ where: { id } });
  revalidatePath("/admin/pond-stockings");
  revalidatePath("/admin/feeding-schedules");
  revalidatePath("/admin/harvest-performance");
}
