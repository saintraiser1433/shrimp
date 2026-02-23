"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function createFeedingSchedule(formData: FormData) {
  await requireAdmin();
  const pondId = formData.get("pondId") as string;
  const feedId = formData.get("feedId") as string;
  const scheduledAt = new Date(formData.get("scheduledAt") as string);
  if (scheduledAt.getTime() < Date.now()) {
    throw new Error("Scheduled date and time must be in the future.");
  }
  const quantity = Number(formData.get("quantity"));
  const assignedFarmerId = (formData.get("assignedFarmerId") as string) || null;
  await prisma.feedingSchedule.create({
    data: { pondId, feedId, scheduledAt, quantity, assignedFarmerId },
  });
  revalidatePath("/admin/feeding-schedules");
  revalidatePath("/farmer/dashboard");
  revalidatePath("/farmer/feeding");
}

export async function updateFeedingSchedule(id: string, formData: FormData) {
  await requireAdmin();
  const scheduledAt = new Date(formData.get("scheduledAt") as string);
  const quantity = Number(formData.get("quantity"));
  const assignedFarmerId = (formData.get("assignedFarmerId") as string) || null;
  await prisma.feedingSchedule.update({
    where: { id },
    data: { scheduledAt, quantity, assignedFarmerId },
  });
  revalidatePath("/admin/feeding-schedules");
  revalidatePath("/farmer/feeding");
}

export async function deleteFeedingSchedule(id: string) {
  await requireAdmin();
  await prisma.feedingSchedule.delete({ where: { id } });
  revalidatePath("/admin/feeding-schedules");
  revalidatePath("/farmer/feeding");
}
