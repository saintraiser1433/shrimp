"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { isValidPhilippineMobile, normalizePhilippinePhone } from "@/lib/phone";

export async function updateAdminProfile(formData: FormData) {
  const session = await requireAdmin();
  const name = (formData.get("name") as string)?.trim() || null;
  const phoneRaw = (formData.get("phone") as string)?.trim() || null;
  if (phoneRaw !== null && phoneRaw !== "") {
    if (!isValidPhilippineMobile(phoneRaw))
      throw new Error("Phone must be Philippine format starting with +639 (e.g. +639171234567).");
  }
  const phone = !phoneRaw ? null : normalizePhilippinePhone(phoneRaw);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { name, phone },
  });
  revalidatePath("/admin/settings");
}
