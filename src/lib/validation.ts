import { isSupportedCountry, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { z } from "zod";
import { isAtLeastMinimumAge } from "./privacy";
import { customerThemes } from "./customer-theme";

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
const optionalContactEmailSchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim() : "",
  z.union([z.literal(""), z.email().max(254)]),
).transform((value) => value || null);
const optionalContactPhoneSchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim() : "",
  z.union([z.literal(""), z.string().max(32).refine((value) => {
    const parsed = parsePhoneNumberFromString(value);
    return Boolean(parsed?.isValid() && parsed.number === value);
  }, "El teléfono de contacto debe usar formato E.164, por ejemplo +13055550100.")]),
).transform((value) => value || null);
const optionalUrlSchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim() : value,
  z.union([z.literal(""), z.url().max(500)]),
);
const optionalOfferSchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim() : value,
  z.union([z.literal(""), z.string().min(1).max(200)]),
).transform((value) => value || null);
const optionalTaglineSchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim() : "",
  z.union([z.literal(""), z.string().min(1).max(80)]),
).transform((value) => value || null);
const optionalBenefitItemSchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim() : "",
  z.union([z.literal(""), z.string().min(1).max(40)]),
);
const optionalHttpsUrlSchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim() : "",
  z.union([z.literal(""), z.url().max(500).refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "La URL debe usar HTTPS.")]),
).transform((value) => value || null);
const googleReviewHosts = new Set(["g.page", "search.google.com", "www.google.com", "maps.app.goo.gl"]);
export const googleReviewUrlSchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim() : value,
  z.union([z.literal(""), z.url().max(500).refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && googleReviewHosts.has(url.hostname.toLowerCase()) && !url.username && !url.password && !url.port;
    } catch {
      return false;
    }
  }, "La URL de Google Review no es válida.")]),
).transform((value) => value || null);
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
  whatsappOptIn: z.boolean().optional().default(false),
}).refine((value) => !value.birthday || value.birthday <= new Date().toISOString().slice(0, 10), {
  message: "El cumpleaños no puede estar en el futuro.",
  path: ["birthday"],
}).refine((value) => !value.birthday || isAtLeastMinimumAge(value.birthday), {
  message: "Debes tener 13 años o más.",
  path: ["birthday"],
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
  contactPhone: optionalContactPhoneSchema,
  contactEmail: optionalContactEmailSchema,
  primaryColor: z.string().regex(hexColorPattern),
  secondaryColor: z.string().regex(hexColorPattern),
  timezone: z.string().trim().min(3).max(80).refine((value) => {
    try { new Intl.DateTimeFormat("en-US", { timeZone: value }); return true; } catch { return false; }
  }, "La zona horaria no es válida."),
  defaultCountry: z.string().trim().length(2).transform((value) => value.toUpperCase()).refine((value) => isSupportedCountry(value as CountryCode), "El país no es válido."),
  inactivityDays: z.coerce.number().int().min(7).max(365),
  ownerEmail: optionalEmailSchema,
});

export const businessUpdateSchema = businessInputSchema.omit({ ownerEmail: true }).extend({
  offerInactive: optionalOfferSchema,
  offerBirthday: optionalOfferSchema,
  offerFrequent: optionalOfferSchema,
  offerNew: optionalOfferSchema,
  googleReviewUrl: googleReviewUrlSchema,
  theme: z.preprocess((value) => typeof value === "string" ? value : "calido", z.enum(customerThemes)),
  tagline: optionalTaglineSchema,
  benefit1: optionalBenefitItemSchema,
  benefit2: optionalBenefitItemSchema,
  benefit3: optionalBenefitItemSchema,
  heroImageUrl: optionalHttpsUrlSchema,
}).superRefine((value, context) => {
  const benefits = [value.benefit1, value.benefit2, value.benefit3];
  if (benefits.some(Boolean) && !benefits.every(Boolean)) {
    context.addIssue({ code: "custom", path: ["benefit1"], message: "Completa los tres beneficios o deja los tres vacíos." });
  }
}).transform(({ benefit1, benefit2, benefit3, ...value }) => ({
  ...value,
  benefits: benefit1 && benefit2 && benefit3 ? [benefit1, benefit2, benefit3] : null,
}));

export const ownerApprovalSchema = z.object({ ownerName: z.string().trim().min(2).max(120) });

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
  const fallback = "/dashboard";
  // Browsers read "/\host" as "//host", and strip tabs and newlines before resolving.
  if (typeof value !== "string" || !value.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const base = "https://smart-tap.invalid";
    const resolved = new URL(value, base);
    if (resolved.origin !== base) return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

export const followUpActionSchema = z.object({
  businessId: z.uuid(),
  customerId: z.uuid(),
  kind: z.enum(["inactive", "birthday", "frequent", "new"]),
  action: z.enum(["contact", "dismiss"]),
});

export const businessIdSchema = z.uuid();

export const statusChangeSchema = z.object({
  targetId: z.uuid(),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});
