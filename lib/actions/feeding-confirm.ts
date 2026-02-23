"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFarmer } from "@/lib/auth";
import { sendSmsUsingSavedSettings } from "@/lib/actions/sms";

function formatFeedingDate(d: Date): string {
  return d.toLocaleDateString("en-PH", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

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

  // Notify admin via SMS (non-blocking; do not fail confirmation if SMS fails)
  try {
    const [schedule, farmer, admins] = await Promise.all([
      prisma.feedingSchedule.findUnique({
        where: { id: scheduleId },
        include: { pond: true },
      }),
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true },
      }),
      prisma.user.findMany({
        where: { role: "ADMIN", phone: { not: null } },
        select: { phone: true },
      }),
    ]);
    if (schedule?.pond && admins.length > 0 && admins.some((a) => a.phone)) {
      const farmerName = farmer?.name?.trim() || farmer?.email || "A farmer";
      const pondName = schedule.pond.name;
      const dateStr = formatFeedingDate(schedule.scheduledAt);
      const message = `Good day! This is to inform you that ${farmerName} has successfully completed the feeding for ${pondName} on ${dateStr}. Thank you.`;
      const phones = admins.map((a) => a.phone!).filter(Boolean);
      await sendSmsUsingSavedSettings(phones, message);
    }
  } catch {
    // SMS is best-effort; feeding confirmation already succeeded
  }

  revalidatePath("/farmer/feeding");
  revalidatePath("/farmer/dashboard");
  revalidatePath("/admin/feeding-schedules");
}
