"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { sendSmsWithConfig } from "@/lib/sms-gateway";
import { requireAdmin } from "@/lib/auth";

const PH_PREFIX = "+639";
const PH_MOBILE_LENGTH = 13; // "+639" (4 chars) + 9 digits

function normalizePhone(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("639")) return `+${trimmed}`;
  if (trimmed.startsWith("09")) return `+63${trimmed.slice(1)}`;
  return `+63${trimmed.replace(/\D/g, "")}`;
}

function isValidPhilippineMobile(phone: string): boolean {
  const normalized = normalizePhone(phone);
  if (!normalized.startsWith(PH_PREFIX) || normalized.length !== PH_MOBILE_LENGTH) return false;
  return /^\+639\d{9}$/.test(normalized);
}

export type SendTestSmsResult = { ok: true } | { ok: false; error: string };
export type SaveSmsSettingsResult = { ok: true } | { ok: false; error: string };
export type SendSmsResult = { ok: true } | { ok: false; error: string };

export type SmsSettings = {
  gatewayUrl: string;
  username: string;
  password: string;
  testPhone: string | null;
};

/** Get saved SMS gateway settings (admin only). Used to prefill Settings form. */
export async function getSmsSettings(): Promise<SmsSettings | null> {
  await requireAdmin();
  try {
    const row = await prisma.smsGatewayConfig.findFirst({ orderBy: { updatedAt: "desc" } });
    if (!row) return null;
    return {
      gatewayUrl: row.gatewayUrl,
      username: row.username,
      password: row.password,
      testPhone: row.testPhone,
    };
  } catch {
    return null; // Table missing or Prisma client outdated – run: npx prisma generate && npx prisma migrate dev
  }
}

/** Save SMS gateway settings to DB (admin only). */
export async function saveSmsSettings(formData: FormData): Promise<SaveSmsSettingsResult> {
  await requireAdmin();
  const gatewayUrl = (formData.get("gatewayUrl") as string)?.trim() ?? "";
  const username = (formData.get("username") as string)?.trim() ?? "";
  const password = (formData.get("password") as string) ?? "";
  const testPhone = (formData.get("phone") as string)?.trim() || null;
  if (!gatewayUrl) return { ok: false, error: "Gateway URL is required." };
  if (!username) return { ok: false, error: "Username is required." };
  if (!password) return { ok: false, error: "Password is required." };
  try {
    const existing = await prisma.smsGatewayConfig.findFirst();
    if (existing) {
      await prisma.smsGatewayConfig.update({
        where: { id: existing.id },
        data: { gatewayUrl, username, password, testPhone },
      });
    } else {
      await prisma.smsGatewayConfig.create({
        data: { gatewayUrl, username, password, testPhone },
      });
    }
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Could not save settings. Run: npx prisma generate && npx prisma migrate dev. ${msg}` };
  }
}

/** Send SMS using the saved gateway settings. Use this from other components (e.g. notifications). */
export async function sendSmsUsingSavedSettings(
  phoneNumbers: string[],
  text: string
): Promise<SendSmsResult> {
  try {
    const row = await prisma.smsGatewayConfig.findFirst({ orderBy: { updatedAt: "desc" } });
    if (!row) {
      return { ok: false, error: "SMS gateway is not configured. Save settings in Admin → Settings." };
    }
    const normalized = phoneNumbers.map((p) => normalizePhone(p)).filter(Boolean);
    if (normalized.length === 0) return { ok: false, error: "At least one phone number is required." };
    return sendSmsWithConfig(
      { url: row.gatewayUrl, username: row.username, password: row.password },
      normalized,
      text
    );
  } catch {
    return { ok: false, error: "SMS gateway unavailable. Run: npx prisma generate && npx prisma migrate dev." };
  }
}

export async function sendTestSms(formData: FormData): Promise<SendTestSmsResult> {
  await requireAdmin();
  const gatewayUrl = (formData.get("gatewayUrl") as string)?.trim() ?? "";
  const username = (formData.get("username") as string)?.trim() ?? "";
  const password = (formData.get("password") as string) ?? "";
  const phone = (formData.get("phone") as string)?.trim() ?? "";
  const code = (formData.get("code") as string)?.trim() ?? "";
  if (!gatewayUrl) return { ok: false, error: "Gateway URL is required." };
  if (!username) return { ok: false, error: "Username is required." };
  if (!password) return { ok: false, error: "Password is required." };
  if (!phone) return { ok: false, error: "Phone number is required." };
  if (!code) return { ok: false, error: "Code (message) is required." };
  const normalized = normalizePhone(phone);
  if (!isValidPhilippineMobile(normalized)) {
    return { ok: false, error: "Phone must be Philippine format starting with +639 (e.g. +639171234567)." };
  }
  return sendSmsWithConfig(
    { url: gatewayUrl, username, password },
    [normalized],
    code
  );
}
