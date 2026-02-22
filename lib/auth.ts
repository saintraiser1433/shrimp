import { auth } from "@/auth";

export async function getSession() {
  return auth();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== "ADMIN") {
    throw new Error("Forbidden: Admin only");
  }
  return session;
}

export async function requireFarmer() {
  const session = await requireAuth();
  if (session.user.role !== "FARMER") {
    throw new Error("Forbidden: Farmer only");
  }
  return session;
}
