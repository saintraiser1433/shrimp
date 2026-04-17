"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

function parseOptionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export async function createShrimpType(formData: FormData) {
  await requireAdmin();
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || "";
  const defaultFeedingIntervalDays = parseOptionalNumber(formData.get("defaultFeedingIntervalDays"));
  const defaultFeedingQty = parseOptionalNumber(formData.get("defaultFeedingQty"));
  const defaultFeedingUnitId = (formData.get("defaultFeedingUnitId") as string) || null;
  await prisma.shrimpType.create({
    data: {
      name,
      description,
      defaultFeedingIntervalDays,
      defaultFeedingQty,
      defaultFeedingUnitId,
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
  await prisma.shrimpType.update({
    where: { id },
    data: {
      name,
      description,
      defaultFeedingIntervalDays,
      defaultFeedingQty,
      defaultFeedingUnitId,
    },
  });
  revalidatePath("/admin/shrimp-types");
}

export async function deleteShrimpType(id: string) {
  await requireAdmin();
  await prisma.shrimpType.delete({ where: { id } });
  revalidatePath("/admin/shrimp-types");
}
