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
  const feedingAlarmCount = await prisma.feedingSchedule.count({
    where: {
      status: "PENDING",
      scheduledAt: { lte: windowEnd, gte: new Date(now.getTime() - 60 * 60 * 1000) },
    },
  });

  const navItems = getFarmerNavItems(feedingAlarmCount);

  return (
    <DashboardLayout navItems={navItems} user={session.user}>
      {children}
    </DashboardLayout>
  );
}
