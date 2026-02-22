import { prisma } from "@/lib/prisma";

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
  const missed = await prisma.feedingSchedule.findMany({
    where: { status: "PENDING", scheduledAt: { lt: now } },
  });
  for (const s of missed) {
    await prisma.feedingSchedule.update({
      where: { id: s.id },
      data: { status: "MISSED" },
    });
  }
  if (missed.length > 0) {
    const pondNames = await prisma.pond.findMany({
      where: { id: { in: missed.map((m) => m.pondId) } },
      select: { name: true },
    });
    const names = pondNames.map((p) => p.name).join(", ");
    await createNotificationForAdmins(
      "MISSED_FEEDING",
      `${missed.length} feeding(s) missed (ponds: ${names}).`
    );
  }
}
