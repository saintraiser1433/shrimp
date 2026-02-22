"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function createShrimpUnit(formData: FormData) {
  await requireAdmin();
  const name = formData.get("name") as string;
  const abbreviation = (formData.get("abbreviation") as string) || "";
  await prisma.shrimpUnit.create({ data: { name, abbreviation } });
  revalidatePath("/admin/shrimp-units");
}

export async function updateShrimpUnit(id: string, formData: FormData) {
  await requireAdmin();
  const name = formData.get("name") as string;
  const abbreviation = (formData.get("abbreviation") as string) || "";
  await prisma.shrimpUnit.update({
    where: { id },
    data: { name, abbreviation },
  });
  revalidatePath("/admin/shrimp-units");
}

export async function deleteShrimpUnit(id: string) {
  await requireAdmin();
  await prisma.shrimpUnit.delete({ where: { id } });
  revalidatePath("/admin/shrimp-units");
}
