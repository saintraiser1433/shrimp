"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { isValidPhilippineMobile, normalizePhilippinePhone } from "@/lib/phone";

export async function createFarmer(formData: FormData) {
  await requireAdmin();
  const name = (formData.get("name") as string)?.trim() || null;
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const phoneRaw = (formData.get("phone") as string)?.trim() || null;
  if (!email) throw new Error("Email is required.");
  if (!password || password.length < 6) throw new Error("Password must be at least 6 characters.");
  if (!phoneRaw) throw new Error("Phone number is required.");
  if (!isValidPhilippineMobile(phoneRaw))
    throw new Error("Phone must be Philippine format starting with +639 (e.g. +639171234567).");
  const phone = normalizePhilippinePhone(phoneRaw);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error("A user with this email already exists.");
  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      name: name || null,
      password: hashedPassword,
      phone,
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
  const phoneRaw = (formData.get("phone") as string)?.trim() || null;
  if (!email) throw new Error("Email is required.");
  if (phoneRaw !== null && phoneRaw !== "") {
    if (!isValidPhilippineMobile(phoneRaw))
      throw new Error("Phone must be Philippine format starting with +639 (e.g. +639171234567).");
  }
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.role !== "FARMER") throw new Error("Farmer not found.");
  const data: { name: string | null; email: string; password?: string; phone: string | null } = {
    name,
    email,
    phone: !phoneRaw ? null : normalizePhilippinePhone(phoneRaw),
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
