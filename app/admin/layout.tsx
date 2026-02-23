import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard-layout";
import { adminNavItems } from "@/lib/nav-config";

export default async function AdminLayout({
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
  if ((session.user as { role?: string }).role !== "ADMIN") redirect("/farmer/dashboard");

  const [notificationUnreadCount, recentNotifications] = await Promise.all([
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

  const notificationItems = recentNotifications.map((n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
  }));

  return (
    <DashboardLayout
      navItems={adminNavItems}
      user={session.user}
      notificationHref="/admin/notifications"
      notificationUnreadCount={notificationUnreadCount}
      notificationItems={notificationItems}
    >
      {children}
    </DashboardLayout>
  );
}
