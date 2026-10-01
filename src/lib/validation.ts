import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { z } from "zod";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hexColorPattern = /^#[0-9a-fA-F]{6}$/;
const trimmedEmailSchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim() : value,
  z.email().max(254),
);
const optionalEmailSchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim() : value,
  z.union([z.literal(""), z.email().max(254)]),
);
const optionalUrlSchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim() : value,
  z.union([z.literal(""), z.url().max(500)]),
);
const privacyUrlSchema = z.string().trim().max(500).refine((value) => {
  if (!value || value.startsWith("/")) return true;
  try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
}, "La URL de privacidad no es válida.");

export const checkInInputSchema = z.object({
  slug: z.string().trim().min(2).max(80).regex(slugPattern),
  tagCode: z.string().trim().min(12).max(100).optional().or(z.literal("")),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(32),
  birthday: z.iso.date().optional().or(z.literal("")),
  consent: z.literal(true),
  consentVersion: z.string().trim().min(1).max(30),
});

export const loginInputSchema = z.object({
  email: trimmedEmailSchema,
  password: z.string().min(8).max(200),
});

export const businessInputSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  legalName: z.string().trim().max(160).optional().or(z.literal("")),
  slug: z.string().trim().min(2).max(80).regex(slugPattern),
  logoUrl: optionalUrlSchema,
  privacyUrl: privacyUrlSchema.optional().or(z.literal("")),
  primaryColor: z.string().regex(hexColorPattern),
  secondaryColor: z.string().regex(hexColorPattern),
  timezone: z.string().trim().min(3).max(80),
  defaultCountry: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  inactivityDays: z.coerce.number().int().min(7).max(365),
  ownerEmail: optionalEmailSchema,
});

export const businessUpdateSchema = businessInputSchema.omit({ ownerEmail: true });

export const memberInviteSchema = z.object({
  email: trimmedEmailSchema,
  role: z.enum(["owner", "manager", "viewer"]),
});

export const nfcTagInputSchema = z.object({
  label: z.string().trim().min(1).max(80),
});

export const passwordInputSchema = z.object({
  password: z.string().min(12).max(200),
  confirmation: z.string().min(12).max(200),
}).refine((value) => value.password === value.confirmation, {
  message: "Las contraseñas no coinciden.",
  path: ["confirmation"],
});

export function normalizePhone(value: string, defaultCountry: string): string | null {
  const parsed = parsePhoneNumberFromString(value, defaultCountry as CountryCode);
  return parsed?.isValid() ? parsed.number : null;
}

export function safeNextPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }
  return value;
}
