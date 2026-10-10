import { resolveBusinessType } from "./business-presets";
import { isCustomerTheme, resolveCustomerBenefits } from "./customer-theme";
import type { Business } from "./types";
import { heroImageUrlSchema, instagramUrlSchema } from "./validation";

export type BusinessPreview = {
  businessName: string;
  businessType: ReturnType<typeof resolveBusinessType>;
  primaryColor: string;
  theme: Business["theme"];
  tagline: string | null;
  benefits: string[];
  heroImageUrl: string | null;
  logoUrl: string | null;
  instagramUrl: string | null;
};

const readText = (params: URLSearchParams, name: string, fallback: string | null, max: number) => {
  if (!params.has(name)) return fallback;
  const value = (params.get(name) ?? "").trim();
  return value.length <= max ? value || null : fallback;
};

const readHttpsUrl = (params: URLSearchParams, name: string, fallback: string | null) => {
  if (!params.has(name)) return fallback;
  const value = (params.get(name) ?? "").trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return value.length <= 500 && url.protocol === "https:" && !url.username && !url.password ? value : fallback;
  } catch {
    return fallback;
  }
};

export function businessPreview(business: Business, params: URLSearchParams, allowOverrides: boolean): BusinessPreview {
  const savedTheme = isCustomerTheme(business.theme) ? business.theme : "calido";
  const saved: BusinessPreview = {
    businessName: business.display_name,
    businessType: resolveBusinessType(business.business_type),
    primaryColor: business.primary_color,
    theme: savedTheme,
    tagline: business.tagline,
    benefits: resolveCustomerBenefits(business.benefits),
    heroImageUrl: business.hero_image_url,
    logoUrl: business.logo_url,
    instagramUrl: business.instagram_url,
  };
  if (!allowOverrides) return saved;

  const themeValue = params.get("theme");
  const colorValue = params.get("primaryColor")?.trim().toUpperCase();
  const benefitValues = [1, 2, 3].map((index) => readText(params, `benefit${index}`, null, 40));
  const hasAllBenefits = benefitValues.every(Boolean);
  const hasNoBenefits = benefitValues.every((value) => !value);
  const heroResult = params.has("heroImageUrl") ? heroImageUrlSchema.safeParse(params.get("heroImageUrl")) : null;
  const instagramResult = params.has("instagramUrl") ? instagramUrlSchema.safeParse(params.get("instagramUrl")) : null;

  return {
    businessName: readText(params, "displayName", saved.businessName, 100) ?? saved.businessName,
    businessType: resolveBusinessType(params.get("businessType") ?? saved.businessType),
    primaryColor: colorValue && /^#[0-9A-F]{6}$/.test(colorValue) ? colorValue : saved.primaryColor,
    theme: isCustomerTheme(themeValue) ? themeValue : saved.theme,
    tagline: readText(params, "tagline", saved.tagline, 80),
    benefits: hasAllBenefits ? benefitValues as string[] : hasNoBenefits ? resolveCustomerBenefits(null) : saved.benefits,
    heroImageUrl: heroResult?.success ? heroResult.data : saved.heroImageUrl,
    logoUrl: readHttpsUrl(params, "logoUrl", saved.logoUrl),
    instagramUrl: instagramResult?.success ? instagramResult.data : saved.instagramUrl,
  };
}
