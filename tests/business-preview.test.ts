import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { businessPreview } from "../src/lib/business-preview";
import type { Business } from "../src/lib/types";

const savedBusiness = {
  id: "22222222-2222-4222-8222-222222222222",
  slug: "cafe-luna",
  display_name: "Café Luna",
  primary_color: "#C8412A",
  theme: "calido",
  tagline: "Momentos que se quedan",
  benefits: ["Uno", "Dos", "Tres"],
  hero_image_url: "/stock/cafe/cafe-1.webp",
  logo_url: "https://example.com/logo.png",
  business_type: "cafe",
  instagram_url: "https://www.instagram.com/cafeluna",
} as Business;

describe("business preview", () => {
  it("never lets a business member override saved branding", () => {
    const params = new URLSearchParams({ displayName: "Otro negocio", primaryColor: "#000000" });
    expect(businessPreview(savedBusiness, params, false)).toMatchObject({
      businessName: "Café Luna",
      primaryColor: "#C8412A",
    });
  });

  it("lets a platform admin preview valid unsaved branding", () => {
    const params = new URLSearchParams({
      displayName: "Café Sol",
      theme: "moderno",
      primaryColor: "#123abc",
      benefit1: "A",
      benefit2: "B",
      benefit3: "C",
      heroImageUrl: "",
      logoUrl: "https://cdn.example.com/new-logo.png",
    });
    expect(businessPreview(savedBusiness, params, true)).toMatchObject({
      businessName: "Café Sol",
      theme: "moderno",
      primaryColor: "#123ABC",
      benefits: ["A", "B", "C"],
      heroImageUrl: null,
      logoUrl: "https://cdn.example.com/new-logo.png",
    });
  });

  it("falls back to saved values for unsafe or incomplete overrides", () => {
    const params = new URLSearchParams({
      primaryColor: "red; background:url(x)",
      logoUrl: "javascript:alert(1)",
      benefit1: "Solo uno",
      benefit2: "",
      benefit3: "",
    });
    expect(businessPreview(savedBusiness, params, true)).toMatchObject({
      primaryColor: "#C8412A",
      logoUrl: "https://example.com/logo.png",
      benefits: ["Uno", "Dos", "Tres"],
    });
  });

  it("keeps the preview route behind authentication and tenant access", () => {
    const source = readFileSync(join(process.cwd(), "src/pages/preview/[id].astro"), "utf8");
    expect(source).toContain("requireDataAccess(Astro.request, Astro.cookies)");
    expect(source).toContain("assertBusinessAccess(identity, id)");
    expect(source).toContain("identity.isPlatformAdmin");
    expect(source).toContain("demo");
  });
});
