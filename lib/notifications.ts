import { prisma } from "@/lib/prisma";
import { sendSmsUsingSavedSettings } from "@/lib/actions/sms";

/** Hours after scheduled time before a DELAYED feeding becomes MISSED (farmer can still complete within this window). */
export const FEEDING_MISS_GRACE_HOURS = 24;

function formatFeedingScheduleDate(d: Date): string {
  return d.toLocaleDateString("en-PH", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function notifyFarmerLateOrMissedSms(opts: {
  phone: string;
  pondName: string;
  scheduledAt: Date;
  kind: "delayed" | "missed";
}) {
  const dateStr = formatFeedingScheduleDate(opts.scheduledAt);
  const message =
    opts.kind === "delayed"
      ? `Good day! Reminder: the feeding for ${opts.pondName} scheduled for ${dateStr} is now overdue (delayed). Please complete the feeding and confirm in the app as soon as possible. Thank you.`
      : `Good day! The feeding for ${opts.pondName} scheduled for ${dateStr} was not completed within the allowed time and is now marked missed. You may still record it as fed (late) in the app if applicable. Thank you.`;
  try {
    await sendSmsUsingSavedSettings([opts.phone], message);
  } catch {
    // SMS best-effort
  }
}

export async function createNotificationForAdmins(
  type: string,
  message: string,
  relatedId?: string
) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type,
      message,
      relatedId: relatedId ?? null,
    })),
  });
}

export async function checkLowStockAndNotify() {
  const feeds = await prisma.feedsInventory.findMany({
    where: { restockThreshold: { not: null } },
  });
  const lowStock = feeds.filter(
    (f) => f.restockThreshold != null && Number(f.quantity) < Number(f.restockThreshold)
  );
  for (const feed of lowStock) {
    if (feed.restockThreshold == null) continue;
    const recent = await prisma.notification.findFirst({
      where: {
        type: "LOW_STOCK",
        relatedId: feed.id,
        read: false,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (!recent) {
      await createNotificationForAdmins(
        "LOW_STOCK",
        `Feed "${feed.name}" is below restock threshold (${feed.quantity} < ${feed.restockThreshold}).`,
        feed.id
      );
    }
  }
}

export async function markMissedFeedingsAndNotify() {
  const now = new Date();
  const graceMs = FEEDING_MISS_GRACE_HOURS * 60 * 60 * 1000;
  const missedCutoff = new Date(now.getTime() - graceMs);

  const newlyDelayed = await prisma.feedingSchedule.findMany({
    where: {
      status: "PENDING",
      scheduledAt: { lt: now },
    },
    include: {
      pond: { select: { name: true } },
      assignedFarmer: { select: { phone: true } },
    },
  });

  for (const s of newlyDelayed) {
    await prisma.feedingSchedule.update({
      where: { id: s.id },
      data: { status: "DELAYED" },
    });
    const phone = s.assignedFarmer?.phone?.trim();
    if (phone) {
      await notifyFarmerLateOrMissedSms({
        phone,
        pondName: s.pond.name,
        scheduledAt: s.scheduledAt,
        kind: "delayed",
      });
    }
  }

  const newlyMissed = await prisma.feedingSchedule.findMany({
    where: {
      status: "DELAYED",
      scheduledAt: { lt: missedCutoff },
    },
    include: {
      pond: { select: { name: true } },
      assignedFarmer: { select: { phone: true } },
    },
  });

  for (const s of newlyMissed) {
    await prisma.feedingSchedule.update({
      where: { id: s.id },
      data: { status: "MISSED" },
    });
    const phone = s.assignedFarmer?.phone?.trim();
    if (phone) {
      await notifyFarmerLateOrMissedSms({
        phone,
        pondName: s.pond.name,
        scheduledAt: s.scheduledAt,
        kind: "missed",
      });
    }
  }

  if (newlyMissed.length > 0) {
    const pondNames = await prisma.pond.findMany({
      where: { id: { in: newlyMissed.map((m) => m.pondId) } },
      select: { name: true },
    });
    const names = pondNames.map((p) => p.name).join(", ");
    await createNotificationForAdmins(
      "MISSED_FEEDING",
      `${newlyMissed.length} feeding(s) marked missed after the delayed grace period (ponds: ${names}).`
    );
  }
}
