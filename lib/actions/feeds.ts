"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { checkLowStockAndNotify } from "@/lib/notifications";

export async function createFeed(formData: FormData) {
  await requireAdmin();
  const name = formData.get("name") as string;
  const quantity = Number(formData.get("quantity"));
  const unitId = formData.get("unitId") as string;
  const restockStr = formData.get("restockThreshold") as string;
  const restockThreshold = restockStr ? Number(restockStr) : null;
  await prisma.feedsInventory.create({
    data: { name, quantity, unitId, restockThreshold },
  });
  await checkLowStockAndNotify();
  revalidatePath("/admin/feeds");
  revalidatePath("/admin/notifications");
}

export async function updateFeed(id: string, formData: FormData) {
  await requireAdmin();
  const name = formData.get("name") as string;
  const quantity = Number(formData.get("quantity"));
  const restockStr = formData.get("restockThreshold") as string;
  const restockThreshold = restockStr ? Number(restockStr) : null;
  await prisma.feedsInventory.update({
    where: { id },
    data: { name, quantity, restockThreshold },
  });
  await checkLowStockAndNotify();
  revalidatePath("/admin/feeds");
  revalidatePath("/admin/notifications");
}

export async function deleteFeed(id: string) {
  await requireAdmin();
  await prisma.feedsInventory.delete({ where: { id } });
  revalidatePath("/admin/feeds");
}
