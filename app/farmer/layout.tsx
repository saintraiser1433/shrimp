import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard-layout";
import { getFarmerNavItems } from "@/lib/nav-config";

export default async function FarmerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = null;
  try {
    session = await auth();
  } catch {
    // JWT decryption failed (stale/mismatched cookie).
    // Route to the dedicated handler that can actually delete the cookie.
    redirect("/api/clear-auth");
  }
  if (!session?.user) redirect("/login");
  if ((session.user as { role?: string }).role !== "FARMER") redirect("/admin/dashboard");

  const now = new Date();
  const windowEnd = new Date(now.getTime() + 30 * 60 * 1000);
  const [feedingAlarmCount, notificationUnreadCount, recentNotifications] = await Promise.all([
    prisma.feedingSchedule.count({
      where: {
        assignedFarmerId: session.user.id,
        OR: [
          {
            status: "PENDING",
            scheduledAt: { lte: windowEnd, gte: new Date(now.getTime() - 60 * 60 * 1000) },
          },
          { status: "DELAYED" },
        ],
      },
    }),
    prisma.notification.count({
      where: { userId: session.user.id, read: false },
    }),
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, type: true, message: true, read: true, createdAt: true },
    }),
  ]);

  const navItems = getFarmerNavItems(feedingAlarmCount, notificationUnreadCount);
  const notificationItems = recentNotifications.map((n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <DashboardLayout
      navItems={navItems}
      user={session.user}
      notificationHref="/farmer/notifications"
      notificationUnreadCount={notificationUnreadCount}
      notificationItems={notificationItems}
    >
      {children}
    </DashboardLayout>
  );
}
