/**
 * Philippine mobile number normalization and validation.
 * Format: +639 followed by 9 digits (e.g. +639171234567).
 */

const PH_PREFIX = "+639";
const PH_MOBILE_LENGTH = 13; // "+639" (4 chars) + 9 digits

export function normalizePhilippinePhone(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("+")) return trimmed;
  if (trimmed.startsWith("639")) return `+${trimmed}`;
  if (trimmed.startsWith("09")) return `+63${trimmed.slice(1)}`;
  return `+63${trimmed.replace(/\D/g, "")}`;
}

export function isValidPhilippineMobile(phone: string): boolean {
  if (!phone || !phone.trim()) return false;
  const normalized = normalizePhilippinePhone(phone);
  if (!normalized.startsWith(PH_PREFIX) || normalized.length !== PH_MOBILE_LENGTH) return false;
  return /^\+639\d{9}$/.test(normalized);
}
