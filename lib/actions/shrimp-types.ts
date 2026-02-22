"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function createShrimpType(formData: FormData) {
  await requireAdmin();
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || "";
  await prisma.shrimpType.create({ data: { name, description } });
  revalidatePath("/admin/shrimp-types");
}

export async function updateShrimpType(id: string, formData: FormData) {
  await requireAdmin();
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || "";
  await prisma.shrimpType.update({
    where: { id },
    data: { name, description },
  });
  revalidatePath("/admin/shrimp-types");
}

export async function deleteShrimpType(id: string) {
  await requireAdmin();
  await prisma.shrimpType.delete({ where: { id } });
  revalidatePath("/admin/shrimp-types");
}
