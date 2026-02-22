"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function assignShrimpToPond(formData: FormData) {
  const session = await requireAdmin();
  const pondId = formData.get("pondId") as string;
  const shrimpInventoryId = formData.get("shrimpInventoryId") as string;
  await prisma.pondShrimpAssignment.create({
    data: { pondId, shrimpInventoryId, assignedById: session.user.id },
  });
  revalidatePath("/admin/pond-assignments");
}

export async function unassignShrimpFromPond(assignmentId: string) {
  await requireAdmin();
  await prisma.pondShrimpAssignment.delete({ where: { id: assignmentId } });
  revalidatePath("/admin/pond-assignments");
}
