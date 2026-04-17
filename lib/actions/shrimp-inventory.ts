"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireFarmer } from "@/lib/auth";

export async function createShrimpInventory(formData: FormData) {
  const session = await requireFarmer();
  const shrimpTypeId = formData.get("shrimpTypeId") as string;
  const unitId = formData.get("unitId") as string;
  const quantity = Number(formData.get("quantity"));
  const status = (formData.get("status") as string) || "AVAILABLE";
  await prisma.shrimpInventory.create({
    data: { shrimpTypeId, unitId, quantity, status, userId: session.user.id },
  });
  revalidatePath("/farmer/shrimp-inventory");
  revalidatePath("/admin/shrimp-inventory");
}

export async function updateShrimpInventoryStatus(id: string, status: string) {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    throw new Error("Forbidden: Admin only");
  }

  await prisma.shrimpInventory.update({
    where: { id },
    data: { status },
  });

  revalidatePath("/farmer/shrimp-inventory");
  revalidatePath("/admin/shrimp-inventory");
}

export async function deleteShrimpInventory(id: string) {
  const session = await requireAuth();
  const inv = await prisma.shrimpInventory.findUnique({ where: { id } });
  if (!inv) return;
  if (session.user.role !== "ADMIN" && inv.userId !== session.user.id) return;
  await prisma.shrimpInventory.delete({ where: { id } });
  revalidatePath("/farmer/shrimp-inventory");
  revalidatePath("/admin/shrimp-inventory");
}
