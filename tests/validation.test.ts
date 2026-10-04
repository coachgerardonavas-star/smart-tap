import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { businessInputSchema, businessUpdateSchema, checkInInputSchema, googleReviewUrlSchema, normalizePhone, safeNextPath } from "../src/lib/validation";

describe("public check-in validation", () => {
  it("accepts a complete check-in and rejects missing consent", () => {
    const valid = { slug: "cafe-luna", tagCode: "demo-cafe-luna-main-2026", fullName: "Elena García", phone: "305-555-0101", birthday: "1992-10-15", consent: true, consentVersion: "2026-10-01" };
    expect(checkInInputSchema.parse(valid).whatsappOptIn).toBe(false);
    expect(checkInInputSchema.safeParse({ ...valid, whatsappOptIn: true }).success).toBe(true);
    expect(checkInInputSchema.safeParse({ ...valid, consent: false }).success).toBe(false);
    expect(checkInInputSchema.safeParse({ ...valid, birthday: "2099-01-01" }).success).toBe(false);
  });

  it("rejects a slug that could alter a query or route", () => {
    const parsed = checkInInputSchema.safeParse({ slug: "../other-business", fullName: "Test User", phone: "+13055550101", birthday: "", consent: true, consentVersion: "1" });
    expect(parsed.success).toBe(false);
  });

  it("normalizes valid US numbers and rejects invalid numbers", () => {
    expect(normalizePhone("(305) 555-0101", "US")).toBe("+13055550101");
    expect(normalizePhone("123", "US")).toBeNull();
  });
});

describe("admin validation", () => {
  it("accepts configuration fields and rejects unsafe colors", () => {
    const valid = { displayName: "Café Luna", legalName: "", slug: "cafe-luna", logoUrl: "", privacyUrl: "/privacy", primaryColor: "#155EEF", secondaryColor: "#0B1220", timezone: "America/New_York", defaultCountry: "us", inactivityDays: "45", ownerEmail: "owner@example.com" };
    expect(businessInputSchema.safeParse(valid).success).toBe(true);
    expect(businessInputSchema.safeParse({ ...valid, primaryColor: "red; background:url(x)" }).success).toBe(false);
    expect(businessInputSchema.safeParse({ ...valid, defaultCountry: "ZZ" }).success).toBe(false);
    expect(businessInputSchema.safeParse({ ...valid, timezone: "Moon/Base" }).success).toBe(false);
  });

  it("allows only local redirect paths", () => {
    expect(safeNextPath("/dashboard?business=cafe-luna")).toBe("/dashboard?business=cafe-luna");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\t/evil.example")).toBe("/dashboard");
    expect(safeNextPath("/admin/../dashboard")).toBe("/dashboard");
  });

  it("accepts only direct HTTPS Google Review hosts", () => {
    for (const url of [
      "https://g.page/r/example/review",
      "https://search.google.com/local/writereview?placeid=abc",
      "https://www.google.com/maps/place/example",
      "https://maps.app.goo.gl/example",
    ]) expect(googleReviewUrlSchema.safeParse(url).success).toBe(true);
    for (const url of [
      "http://g.page/r/example/review",
      "https://evil.example/review",
      "https://g.page.evil.example/review",
      "javascript:alert(1)",
    ]) expect(googleReviewUrlSchema.safeParse(url).success).toBe(false);
  });

  it("trims onboarding offers and limits them to 200 characters", () => {
    const base = { displayName: "Café Luna", legalName: "", slug: "cafe-luna", logoUrl: "https://example.com/logo.png", privacyUrl: "/privacy", primaryColor: "#155EEF", secondaryColor: "#0B1220", timezone: "America/New_York", defaultCountry: "US", inactivityDays: "30", googleReviewUrl: "https://g.page/r/example/review", offerInactive: " Regresa por un café. ", offerBirthday: "Celebra con nosotros.", offerFrequent: "Gracias por volver.", offerNew: "Bienvenido." };
    const parsed = businessUpdateSchema.parse(base);
    expect(parsed.offerInactive).toBe("Regresa por un café.");
    expect(businessUpdateSchema.safeParse({ ...base, offerNew: "x".repeat(201) }).success).toBe(false);
  });

  it("renders the approved birthday label and help text", () => {
    const form = readFileSync(join(process.cwd(), "src/components/CheckInForm.tsx"), "utf8");
    expect(form).toContain("¿Cuándo cumples años?");
    expect(form).toContain("Déjanos tu fecha de cumpleaños y podremos sorprenderte con descuentos, regalos o beneficios especiales en tu día.");
  });
});
