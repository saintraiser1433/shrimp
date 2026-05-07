"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAuth } from "@/lib/auth";

export async function markNotificationRead(id: string) {
  await requireAdmin();
  await prisma.notification.update({
    where: { id },
    data: { read: true },
  });
  revalidatePath("/admin/notifications");
}

export async function markAllNotificationsRead(userId: string) {
  await requireAdmin();
  await prisma.notification.updateMany({
    where: { userId },
    data: { read: true },
  });
  revalidatePath("/admin/notifications");
}

export async function markAllNotificationsReadForSession() {
  const session = await requireAdmin();
  await prisma.notification.updateMany({
    where: { userId: session.user.id },
    data: { read: true },
  });
  revalidatePath("/admin/notifications");
}

export async function markMyNotificationRead(id: string) {
  const session = await requireAuth();
  await prisma.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { read: true },
  });
  revalidatePath("/admin/notifications");
  revalidatePath("/farmer/notifications");
}

export async function markAllMyNotificationsRead() {
  const session = await requireAuth();
  await prisma.notification.updateMany({
    where: { userId: session.user.id },
    data: { read: true },
  });
  revalidatePath("/admin/notifications");
  revalidatePath("/farmer/notifications");
}
