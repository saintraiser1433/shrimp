"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

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

export async function createWaterMaintenance(pondId: string, formData: FormData) {
  await requireAdmin();
  const scheduledAt = new Date(formData.get("scheduledAt") as string);
  const type = formData.get("type") as string;
  const notes = (formData.get("notes") as string) || "";
  await prisma.waterMaintenanceSchedule.create({
    data: { pondId, scheduledAt, type, notes },
  });
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
