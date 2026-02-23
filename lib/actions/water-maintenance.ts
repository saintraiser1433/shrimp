"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFarmer } from "@/lib/auth";
import { requireAdmin } from "@/lib/auth";

/** Farmer: request that this schedule be marked complete. Admin must approve or reject. */
export async function requestWaterMaintenanceCompletion(scheduleId: string) {
  const session = await requireFarmer();
  const schedule = await prisma.waterMaintenanceSchedule.findUnique({
    where: { id: scheduleId },
    select: { assignedFarmerId: true, completedAt: true, completionRequestedBy: true, pondId: true },
  });
  if (!schedule) throw new Error("Schedule not found.");
  if (schedule.assignedFarmerId !== session.user.id)
    throw new Error("You are not assigned to this water maintenance.");
  if (schedule.completedAt) throw new Error("This schedule is already completed.");
  if (schedule.completionRequestedBy) throw new Error("Completion is already pending approval.");
  await prisma.waterMaintenanceSchedule.update({
    where: { id: scheduleId },
    data: { completionRequestedBy: session.user.id },
  });
  revalidatePath("/farmer/water-maintenance");
  revalidatePath(`/admin/ponds/${schedule.pondId}`);
}

/** Admin: approve farmer's completion request. Marks schedule as complete. */
export async function approveWaterMaintenanceCompletion(scheduleId: string) {
  await requireAdmin();
  const schedule = await prisma.waterMaintenanceSchedule.findUnique({
    where: { id: scheduleId },
    select: { pondId: true, completionRequestedBy: true },
  });
  if (!schedule) throw new Error("Schedule not found.");
  if (!schedule.completionRequestedBy) throw new Error("No completion request to approve.");
  await prisma.waterMaintenanceSchedule.update({
    where: { id: scheduleId },
    data: { completedAt: new Date(), completionRequestedBy: null },
  });
  revalidatePath("/farmer/water-maintenance");
  revalidatePath("/admin/ponds");
  revalidatePath(`/admin/ponds/${schedule.pondId}`);
}

/** Admin: reject farmer's completion request. Status returns to pending. */
export async function rejectWaterMaintenanceCompletion(scheduleId: string) {
  await requireAdmin();
  const schedule = await prisma.waterMaintenanceSchedule.findUnique({
    where: { id: scheduleId },
    select: { pondId: true, completionRequestedBy: true },
  });
  if (!schedule) throw new Error("Schedule not found.");
  if (!schedule.completionRequestedBy) throw new Error("No completion request to reject.");
  await prisma.waterMaintenanceSchedule.update({
    where: { id: scheduleId },
    data: { completionRequestedBy: null },
  });
  revalidatePath("/farmer/water-maintenance");
  revalidatePath("/admin/ponds");
  revalidatePath(`/admin/ponds/${schedule.pondId}`);
}
