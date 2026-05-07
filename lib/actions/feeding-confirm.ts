"use server";
// NOTE: Never abbreviate "Panso Nestor Sherald" as "PNS" in system text.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireFarmer } from "@/lib/auth";
import { sendSmsUsingSavedSettings } from "@/lib/actions/sms";
import { checkLowStockAndNotify } from "@/lib/notifications";

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
  const lateReason = (formData.get("lateReason") as string) || "";

  if (!Number.isFinite(dispensedQty) || dispensedQty <= 0) {
    throw new Error("Dispensed quantity must be a positive number.");
  }

  const schedule = await prisma.feedingSchedule.findUnique({
    where: { id: scheduleId },
    include: { feed: true },
  });
  if (!schedule) {
    throw new Error("Feeding schedule not found.");
  }
  if (schedule.status === "COMPLETED") {
    throw new Error("This feeding has already been confirmed.");
  }

  const actionable = schedule.status === "PENDING" || schedule.status === "DELAYED" || schedule.status === "MISSED";
  if (!actionable) {
    throw new Error("This feeding cannot be confirmed in its current status.");
  }

  const isLate =
    schedule.status === "MISSED" ||
    schedule.status === "DELAYED" ||
    schedule.scheduledAt.getTime() < Date.now() - 60 * 1000;

  await prisma.feedingConfirmation.create({
    data: {
      scheduleId,
      farmerId: session.user.id,
      dispensedQty,
      notes,
      isLate,
      lateReason: isLate && lateReason.trim() ? lateReason.trim() : null,
    },
  });

  await prisma.feedingSchedule.update({
    where: { id: scheduleId },
    data: { status: "COMPLETED" },
  });

  // Auto-deduct from feeds inventory
  try {
    await prisma.feedsInventory.update({
      where: { id: schedule.feedId },
      data: { quantity: { decrement: dispensedQty } },
    });
    await checkLowStockAndNotify();
  } catch {
    // Inventory deduction is best-effort; confirmation already saved
  }

  // Notify admin via SMS (best-effort)
  try {
    const [scheduleWithPond, farmer, admins] = await Promise.all([
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
    if (scheduleWithPond?.pond && admins.length > 0 && admins.some((a) => a.phone)) {
      const farmerName = farmer?.name?.trim() || farmer?.email || "A farmer";
      const pondName = scheduleWithPond.pond.name;
      const dateStr = formatFeedingDate(scheduleWithPond.scheduledAt);
      const status = isLate ? "completed (late)" : "successfully completed";
      const message = `Good day! This is to inform you that ${farmerName} has ${status} the feeding for ${pondName} on ${dateStr}. Thank you.`;
      const phones = admins.map((a) => a.phone!).filter(Boolean);
      await sendSmsUsingSavedSettings(phones, message);
    }
  } catch {
    // SMS is best-effort
  }

  revalidatePath("/farmer/feeding");
  revalidatePath("/farmer/dashboard");
  revalidatePath("/farmer/shrimp-inventory");
  revalidatePath("/admin/feeding-schedules");
  revalidatePath("/admin/feeds");
}
