"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

/** Max feeding sessions per day per growth stage (aligned with admin UX). */
const MAX_FEEDING_SESSIONS_PER_DAY = 3;

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

type GrowthStageRange = {
  id: string;
  startDayFromStocking: number;
  endDayFromStocking: number;
};

async function validateContinuousGrowthStages(
  shrimpTypeId: string,
  candidate: GrowthStageRange,
  excludeStageId?: string,
) {
  const existingStages = await prisma.shrimpGrowthStage.findMany({
    where: {
      shrimpTypeId,
      ...(excludeStageId ? { id: { not: excludeStageId } } : {}),
    },
    select: {
      id: true,
      startDayFromStocking: true,
      endDayFromStocking: true,
    },
  });

  const allStages = [...existingStages, candidate].sort((a, b) => {
    if (a.startDayFromStocking !== b.startDayFromStocking) {
      return a.startDayFromStocking - b.startDayFromStocking;
    }
    return a.endDayFromStocking - b.endDayFromStocking;
  });

  if (allStages[0]?.startDayFromStocking !== 1) {
    throw new Error("Growth stages must start at day 1.");
  }

  for (let i = 0; i < allStages.length; i++) {
    const current = allStages[i];
    if (current.startDayFromStocking < 1) {
      throw new Error("Growth stage start day must be 1 or higher.");
    }
    if (current.endDayFromStocking < current.startDayFromStocking) {
      throw new Error("End day must be greater than or equal to start day.");
    }

    if (i === 0) continue;
    const previous = allStages[i - 1];
    const expectedStart = previous.endDayFromStocking + 1;
    if (current.startDayFromStocking !== expectedStart) {
      throw new Error(
        `Growth stages must be continuous. Stage after day ${previous.endDayFromStocking} must start at day ${expectedStart}.`,
      );
    }
  }
}

export async function createShrimpType(formData: FormData) {
  await requireAdmin();
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || "";
  const defaultFeedingIntervalDays = parseOptionalNumber(formData.get("defaultFeedingIntervalDays"));
  const defaultFeedingQty = parseOptionalNumber(formData.get("defaultFeedingQty"));
  const defaultFeedingUnitId = (formData.get("defaultFeedingUnitId") as string) || null;
  const expectedHarvestDays = parseOptionalNumber(formData.get("expectedHarvestDays"));
  const expectedHarvestQty = parseOptionalNumber(formData.get("expectedHarvestQty"));
  const expectedHarvestUnitId = (formData.get("expectedHarvestUnitId") as string) || null;
  await prisma.shrimpType.create({
    data: {
      name,
      description,
      defaultFeedingIntervalDays,
      defaultFeedingQty,
      defaultFeedingUnitId,
      expectedHarvestDays,
      expectedHarvestQty,
      expectedHarvestUnitId,
    },
  });
  revalidatePath("/admin/shrimp-types");
}

export async function updateShrimpType(id: string, formData: FormData) {
  await requireAdmin();
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || "";
  const defaultFeedingIntervalDays = parseOptionalNumber(formData.get("defaultFeedingIntervalDays"));
  const defaultFeedingQty = parseOptionalNumber(formData.get("defaultFeedingQty"));
  const defaultFeedingUnitId = (formData.get("defaultFeedingUnitId") as string) || null;
  const expectedHarvestDays = parseOptionalNumber(formData.get("expectedHarvestDays"));
  const expectedHarvestQty = parseOptionalNumber(formData.get("expectedHarvestQty"));
  const expectedHarvestUnitId = (formData.get("expectedHarvestUnitId") as string) || null;
  await prisma.shrimpType.update({
    where: { id },
    data: {
      name,
      description,
      defaultFeedingIntervalDays,
      defaultFeedingQty,
      defaultFeedingUnitId,
      expectedHarvestDays,
      expectedHarvestQty,
      expectedHarvestUnitId,
    },
  });
  revalidatePath("/admin/shrimp-types");
}

export async function deleteShrimpType(id: string) {
  await requireAdmin();
  await prisma.shrimpType.delete({ where: { id } });
  revalidatePath("/admin/shrimp-types");
}

export async function createGrowthStage(shrimpTypeId: string, formData: FormData) {
  await requireAdmin();
  const stageName = formData.get("stageName") as string;
  const startDayFromStocking = Number(formData.get("startDayFromStocking"));
  const endDayFromStocking = Number(formData.get("endDayFromStocking"));
  if (!Number.isFinite(startDayFromStocking) || !Number.isFinite(endDayFromStocking)) {
    throw new Error("Start and end day must be valid numbers.");
  }
  if (endDayFromStocking < startDayFromStocking) {
    throw new Error("End day must be greater than or equal to start day.");
  }
  await validateContinuousGrowthStages(shrimpTypeId, {
    id: "new",
    startDayFromStocking,
    endDayFromStocking,
  });
  const feedId = (formData.get("feedId") as string) || null;
  const feedQtyPerSession = Number(formData.get("feedQtyPerSession"));
  if (!Number.isFinite(feedQtyPerSession) || feedQtyPerSession <= 0) {
    throw new Error("Feed quantity per session must be a positive number.");
  }
  const feedingSessionsPerDay = parseOptionalNumber(formData.get("feedingSessionsPerDay")) ?? 1;
  if (
    !Number.isFinite(feedingSessionsPerDay) ||
    feedingSessionsPerDay < 1 ||
    feedingSessionsPerDay > MAX_FEEDING_SESSIONS_PER_DAY
  ) {
    throw new Error(`Sessions per day must be between 1 and ${MAX_FEEDING_SESSIONS_PER_DAY}.`);
  }
  const feedUnitId = (formData.get("feedUnitId") as string) || null;
  const sortOrder = parseOptionalNumber(formData.get("sortOrder")) ?? 0;

  await prisma.shrimpGrowthStage.create({
    data: {
      shrimpTypeId,
      stageName,
      startDayFromStocking,
      endDayFromStocking,
      feedId,
      feedQtyPerSession,
      feedingSessionsPerDay,
      feedUnitId,
      sortOrder,
    },
  });
  revalidatePath("/admin/shrimp-types");
}

export async function updateGrowthStage(id: string, formData: FormData) {
  await requireAdmin();
  const stageName = formData.get("stageName") as string;
  const startDayFromStocking = Number(formData.get("startDayFromStocking"));
  const endDayFromStocking = Number(formData.get("endDayFromStocking"));
  const existingStage = await prisma.shrimpGrowthStage.findUnique({
    where: { id },
    select: { shrimpTypeId: true },
  });
  if (!existingStage) {
    throw new Error("Growth stage not found.");
  }
  if (!Number.isFinite(startDayFromStocking) || !Number.isFinite(endDayFromStocking)) {
    throw new Error("Start and end day must be valid numbers.");
  }
  if (endDayFromStocking < startDayFromStocking) {
    throw new Error("End day must be greater than or equal to start day.");
  }
  await validateContinuousGrowthStages(
    existingStage.shrimpTypeId,
    {
      id,
      startDayFromStocking,
      endDayFromStocking,
    },
    id,
  );
  const feedId = (formData.get("feedId") as string) || null;
  const feedQtyPerSession = Number(formData.get("feedQtyPerSession"));
  const feedingSessionsPerDay = parseOptionalNumber(formData.get("feedingSessionsPerDay")) ?? 1;
  if (
    !Number.isFinite(feedingSessionsPerDay) ||
    feedingSessionsPerDay < 1 ||
    feedingSessionsPerDay > MAX_FEEDING_SESSIONS_PER_DAY
  ) {
    throw new Error(`Sessions per day must be between 1 and ${MAX_FEEDING_SESSIONS_PER_DAY}.`);
  }
  const feedUnitId = (formData.get("feedUnitId") as string) || null;
  const sortOrder = parseOptionalNumber(formData.get("sortOrder")) ?? 0;

  await prisma.shrimpGrowthStage.update({
    where: { id },
    data: {
      stageName,
      startDayFromStocking,
      endDayFromStocking,
      feedId,
      feedQtyPerSession,
      feedingSessionsPerDay,
      feedUnitId,
      sortOrder,
    },
  });
  revalidatePath("/admin/shrimp-types");
}

export async function deleteGrowthStage(id: string) {
  await requireAdmin();
  await prisma.shrimpGrowthStage.delete({ where: { id } });
  revalidatePath("/admin/shrimp-types");
}
