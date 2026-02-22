import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardRedirectPage() {
  let session = null;
  try {
    session = await auth();
  } catch {
    redirect("/login");
  }
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role as string;
  if (role === "ADMIN") redirect("/admin/dashboard");
  redirect("/farmer/dashboard");
}
