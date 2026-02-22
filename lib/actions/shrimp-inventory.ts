"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireFarmer } from "@/lib/auth";

export async function createShrimpInventory(formData: FormData) {
  const session = await requireFarmer();
  const shrimpTypeId = formData.get("shrimpTypeId") as string;
  const unitId = formData.get("unitId") as string;
  const quantity = Number(formData.get("quantity"));
  await prisma.shrimpInventory.create({
    data: { shrimpTypeId, unitId, quantity, userId: session.user.id },
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
