"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFarmer } from "@/lib/auth";

export async function confirmFeeding(formData: FormData) {
  const session = await requireFarmer();
  const scheduleId = formData.get("scheduleId") as string;
  const dispensedQty = Number(formData.get("dispensedQty"));
  const notes = (formData.get("notes") as string) || "";
  await prisma.feedingConfirmation.create({
    data: { scheduleId, farmerId: session.user.id, dispensedQty, notes },
  });
  await prisma.feedingSchedule.update({
    where: { id: scheduleId },
    data: { status: "COMPLETED" },
  });
  revalidatePath("/farmer/feeding");
  revalidatePath("/farmer/dashboard");
  revalidatePath("/admin/feeding-schedules");
}
