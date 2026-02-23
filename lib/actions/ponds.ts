"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sendSmsUsingSavedSettings } from "@/lib/actions/sms";

export async function createPond(formData: FormData) {
  await requireAdmin();
  const name = formData.get("name") as string;
  const location = (formData.get("location") as string) || "";
  const size = (formData.get("size") as string) || "";
  await prisma.pond.create({ data: { name, location, size } });
  revalidatePath("/admin/ponds");
  revalidatePath("/admin/dashboard");
}

export async function updatePond(id: string, formData: FormData) {
  await requireAdmin();
  const name = formData.get("name") as string;
  const location = (formData.get("location") as string) || "";
  const size = (formData.get("size") as string) || "";
  const status = (formData.get("status") as string) || "ACTIVE";
  await prisma.pond.update({
    where: { id },
    data: { name, location, size, status },
  });
  revalidatePath("/admin/ponds");
  revalidatePath(`/admin/ponds/${id}`);
}

export async function deletePond(id: string) {
  await requireAdmin();
  await prisma.pond.delete({ where: { id } });
  revalidatePath("/admin/ponds");
  revalidatePath("/admin/dashboard");
}

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

export async function createWaterMaintenance(pondId: string, formData: FormData) {
  await requireAdmin();
  const scheduledAt = new Date(formData.get("scheduledAt") as string);
  const type = formData.get("type") as string;
  const notes = (formData.get("notes") as string) || "";
  const assignedFarmerId = (formData.get("assignedFarmerId") as string) || null;
  await prisma.waterMaintenanceSchedule.create({
    data: { pondId, scheduledAt, type, notes, assignedFarmerId },
  });

  try {
    const pond = await prisma.pond.findUnique({ where: { id: pondId }, select: { name: true } });
    if (pond) {
      const dateStr = formatScheduleDate(scheduledAt);
      const message = `Good day! A water maintenance has been scheduled for ${pond.name} on ${dateStr}. Thank you.`;
      if (assignedFarmerId) {
        const farmer = await prisma.user.findUnique({
          where: { id: assignedFarmerId, role: "FARMER" },
          select: { phone: true },
        });
        if (farmer?.phone) await sendSmsUsingSavedSettings([farmer.phone], message);
      } else {
        const farmers = await prisma.user.findMany({
          where: { role: "FARMER", phone: { not: null } },
          select: { phone: true },
        });
        if (farmers.length > 0) {
          const phones = farmers.map((f) => f.phone!).filter(Boolean);
          await sendSmsUsingSavedSettings(phones, message);
        }
      }
    }
  } catch {
    // SMS best-effort; schedule creation already succeeded
  }

  revalidatePath("/admin/ponds");
  revalidatePath(`/admin/ponds/${pondId}`);
}

export async function completeWaterMaintenance(id: string) {
  await requireAdmin();
  await prisma.waterMaintenanceSchedule.update({
    where: { id },
    data: { completedAt: new Date() },
  });
  revalidatePath("/admin/ponds");
}
