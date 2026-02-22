import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    const role = (session.user as { role?: string }).role;
    redirect(role === "ADMIN" ? "/admin/dashboard" : "/farmer/dashboard");
  }
  redirect("/login");
}
