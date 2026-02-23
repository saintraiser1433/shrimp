"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function createFarmer(formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  if (!email) throw new Error("Email is required.");
  if (!password || password.length < 6) throw new Error("Password must be at least 6 characters.");
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("A user with this email already exists.");
  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      name: name || null,
      password: hashedPassword,
      role: "FARMER",
    },
  });
  revalidatePath("/admin/farmers");
}

export async function updateFarmer(id: string, formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim();
  const newPassword = (formData.get("newPassword") as string)?.trim() || null;
  if (!email) throw new Error("Email is required.");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "FARMER") throw new Error("Farmer not found.");
  const data: { name: string | null; email: string; password?: string } = {
    name,
    email,
  };
  if (newPassword && newPassword.length >= 6) {
    data.password = await bcrypt.hash(newPassword, 10);
  }
  await prisma.user.update({
    where: { id },
    data,
  });
  revalidatePath("/admin/farmers");
}

export async function deleteFarmer(id: string) {
  await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "FARMER") throw new Error("Farmer not found.");
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/farmers");
}
