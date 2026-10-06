import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { businessInputSchema, businessUpdateSchema, checkInInputSchema, googleReviewUrlSchema, normalizePhone, safeNextPath, termExtensionSchema, termsSignatureSchema } from "../src/lib/validation";

describe("public check-in validation", () => {
  afterEach(() => vi.useRealTimers());

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

  it("rejects a birthday younger than 13 with the short approved message", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    const base = { slug: "cafe-luna", fullName: "Test User", phone: "+13055550101", consent: true };
    expect(checkInInputSchema.safeParse({ ...base, birthday: "2013-10-04" }).success).toBe(true);
    const younger = checkInInputSchema.safeParse({ ...base, birthday: "2013-10-05" });
    expect(younger.success).toBe(false);
    if (!younger.success) expect(younger.error.issues.map((issue) => issue.message)).toContain("Debes tener 13 años o más.");
  });

  it("strips any consent version supplied by the browser", () => {
    const parsed = checkInInputSchema.parse({ slug: "cafe-luna", fullName: "Test User", phone: "+13055550101", consent: true, consentVersion: "attacker-version" });
    expect(parsed).not.toHaveProperty("consentVersion");
  });
});

describe("admin validation", () => {
  it("requires explicit owner signature and a signed extension annex", () => {
    expect(termsSignatureSchema.safeParse({ businessId: "10000000-0000-4000-8000-000000000001", legalName: "Ana Pérez", title: "Dueña", signed: "on" }).success).toBe(true);
    expect(termsSignatureSchema.safeParse({ businessId: "10000000-0000-4000-8000-000000000001", legalName: "Ana Pérez", title: "Dueña" }).success).toBe(false);
    expect(termExtensionSchema.safeParse({ termEndsAt: "2027-01-04", annexSigned: "on" }).success).toBe(true);
    expect(termExtensionSchema.safeParse({ termEndsAt: "2027-01-04" }).success).toBe(false);
  });
  it("accepts configuration fields and rejects unsafe colors", () => {
    const valid = { displayName: "Café Luna", legalName: "", slug: "cafe-luna", logoUrl: "", privacyUrl: "/privacy", primaryColor: "#155EEF", secondaryColor: "#0B1220", timezone: "America/New_York", defaultCountry: "us", inactivityDays: "45", ownerEmail: "owner@example.com" };
    expect(businessInputSchema.safeParse(valid).success).toBe(true);
    expect(businessInputSchema.safeParse({ ...valid, primaryColor: "red; background:url(x)" }).success).toBe(false);
    expect(businessInputSchema.safeParse({ ...valid, defaultCountry: "ZZ" }).success).toBe(false);
    expect(businessInputSchema.safeParse({ ...valid, timezone: "Moon/Base" }).success).toBe(false);
  });

  it("validates optional public business contacts", () => {
    const valid = { displayName: "Café Luna", legalName: "", slug: "cafe-luna", logoUrl: "", privacyUrl: "", primaryColor: "#155EEF", secondaryColor: "#0B1220", timezone: "America/New_York", defaultCountry: "US", inactivityDays: "45", ownerEmail: "", contactPhone: "+13055550100", contactEmail: "hola@example.com" };
    expect(businessInputSchema.parse(valid)).toMatchObject({ contactPhone: "+13055550100", contactEmail: "hola@example.com" });
    expect(businessInputSchema.safeParse({ ...valid, contactPhone: "305-555-0100" }).success).toBe(false);
    expect(businessInputSchema.safeParse({ ...valid, contactEmail: "correo-invalido" }).success).toBe(false);
    expect(businessInputSchema.safeParse({ ...valid, contactPhone: "", contactEmail: "" }).success).toBe(true);
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
    const base = { displayName: "Café Luna", legalName: "", slug: "cafe-luna", logoUrl: "https://example.com/logo.png", privacyUrl: "/privacy", primaryColor: "#C8412A", secondaryColor: "#0B1220", timezone: "America/New_York", defaultCountry: "US", inactivityDays: "30", googleReviewUrl: "https://g.page/r/example/review", offerInactive: " Regresa por un café. ", offerBirthday: "Celebra con nosotros.", offerFrequent: "Gracias por volver.", offerNew: "Bienvenido." };
    const parsed = businessUpdateSchema.parse(base);
    expect(parsed.offerInactive).toBe("Regresa por un café.");
    expect(businessUpdateSchema.safeParse({ ...base, offerNew: "x".repeat(201) }).success).toBe(false);
  });

  it("renders the approved birthday label and help text", () => {
    const form = readFileSync(join(process.cwd(), "src/components/CheckInForm.tsx"), "utf8");
    expect(form).toContain("¿Cuándo cumples años?");
    expect(form).toContain("Déjanos tu fecha de cumpleaños y podremos sorprenderte con descuentos, regalos o beneficios especiales en tu día.");
  });

  it("renders the optional benefit-led WhatsApp consent unchecked", () => {
    const form = readFileSync(join(process.cwd(), "src/components/CheckInForm.tsx"), "utf8");
    expect(form).toContain("Recibe ofertas y sorpresas de cumpleaños de {businessName} por WhatsApp. Puedes pedir que paren cuando quieras.");
    expect(form).toMatch(/<input name="whatsappOptIn" type="checkbox" \/>/);
    expect(form).not.toMatch(/name="whatsappOptIn"[^>]*checked/);
  });

  it("adds the minimum-age statement to the required consent", () => {
    const form = readFileSync(join(process.cwd(), "src/components/CheckInForm.tsx"), "utf8");
    expect(form).toContain("Tengo 13 años o más.");
    expect(form).toContain("max={latestBirthdayForAge()}");
  });
});
