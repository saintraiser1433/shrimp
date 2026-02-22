import { redirect } from "next/navigation";
import { auth } from "@/auth";
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

  return (
    <DashboardLayout navItems={adminNavItems} user={session.user}>
      {children}
    </DashboardLayout>
  );
}
