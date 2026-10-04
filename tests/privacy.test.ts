import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCustomerExportCsv } from "../src/lib/csv";
import {
  MINIMUM_CUSTOMER_AGE,
  PRIVACY_NOTICE_VERSION,
  buildPrivacyNoticeCopy,
  businessContact,
  businessPrivacyUrl,
  isAtLeastMinimumAge,
  latestBirthdayForAge,
} from "../src/lib/privacy";

describe("approved privacy notice", () => {
  it("keeps the approved Spanish and English promises with server substitutions", () => {
    const copy = buildPrivacyNoticeCopy({
      businessNameEs: "Café Luna",
      businessNameEn: "Café Luna",
      contactEs: "+13055550100",
      contactEn: "+13055550100",
    });
    expect(copy.es.title).toBe("Aviso de privacidad — Café Luna");
    expect(copy.es.sections.find((section) => section.heading === "Cuánto tiempo")?.paragraphs).toEqual([
      "Si pasan 24 meses sin que registres una visita, tus datos se borran. Si Café Luna deja de usar Smart Tap, recibe una copia de su lista de clientes y Smart Tap borra los datos en 30 días.",
    ]);
    expect(copy.es.sections.find((section) => section.heading === "Tus derechos")?.paragraphs).toEqual([
      "Puedes pedir ver, corregir o borrar tus datos, o retirar tu consentimiento. Escríbele a Café Luna: +13055550100. Si no te responde, escribe a smarttap@yourbizupgraded.com.",
    ]);
    expect(copy.en.sections.find((section) => section.heading === "How long")?.paragraphs).toEqual([
      "If 24 months pass without a recorded visit, your data is deleted. If Café Luna stops using Smart Tap, it receives a copy of its customer list and Smart Tap deletes the data within 30 days.",
    ]);
    expect(copy.en.sections.find((section) => section.heading === "Your rights")?.paragraphs).toEqual([
      "You can ask to see, correct or delete your data, or withdraw your consent. Contact Café Luna: +13055550100. If they do not answer, write to smarttap@yourbizupgraded.com.",
    ]);
    expect(copy.es.sections.find((section) => section.heading === "Edad")?.paragraphs).toEqual(["El registro es solo para personas de 13 años o más."]);
    expect(copy.en.sections.find((section) => section.heading === "Age")?.paragraphs).toEqual(["Registration is only for people aged 13 or older."]);
  });

  it("uses the business page by default and preserves a configured override", () => {
    expect(businessPrivacyUrl("cafe-luna", null)).toBe("/privacy/cafe-luna");
    expect(businessPrivacyUrl("cafe-luna", " /privacy/custom ")).toBe("/privacy/custom");
    expect(businessContact("+13055550100", "hola@example.com")).toBe("+13055550100 · hola@example.com");
    expect(businessContact(null, null)).toBeNull();
  });

  it("queries only active, uncancelled businesses and keeps the generic fallback", () => {
    const page = readFileSync(join(process.cwd(), "src/pages/privacy/[slug].astro"), "utf8");
    const generic = readFileSync(join(process.cwd(), "src/pages/privacy.astro"), "utf8");
    const landing = readFileSync(join(process.cwd(), "src/pages/b/[slug].astro"), "utf8");
    expect(page).toContain('.eq("is_active", true).is("cancelled_at", null)');
    expect(page).toContain("Astro.response.status = 404");
    expect(generic).toContain('businessNameEs="el negocio donde te registraste"');
    expect(generic).toContain('businessNameEn="the business where you registered"');
    expect(landing).toContain("businessPrivacyUrl(business.slug, business.privacy_url)");
  });
});

describe("server consent version and minimum age", () => {
  it("uses the approved version on the server and omits a browser version", () => {
    expect(PRIVACY_NOTICE_VERSION).toBe("2026-10-04");
    const route = readFileSync(join(process.cwd(), "src/pages/api/public/check-in.ts"), "utf8");
    const form = readFileSync(join(process.cwd(), "src/components/CheckInForm.tsx"), "utf8");
    expect(route).toContain("p_consent_version: PRIVACY_NOTICE_VERSION");
    expect(form).not.toContain("consentVersion");
  });

  it("accepts the exact thirteenth birthday and rejects a younger birthday", () => {
    const now = new Date("2026-10-04T12:00:00Z");
    expect(MINIMUM_CUSTOMER_AGE).toBe(13);
    expect(latestBirthdayForAge(13, now)).toBe("2013-10-04");
    expect(isAtLeastMinimumAge("2013-10-04", now)).toBe(true);
    expect(isAtLeastMinimumAge("2013-10-05", now)).toBe(false);
  });
});

describe("customer CSV", () => {
  it("contains the required fields and neutralizes spreadsheet formulas", () => {
    const csv = buildCustomerExportCsv([{
      fullName: "=HYPERLINK(\"https://bad.example\")",
      phone: "+13055550100",
      birthday: "1990-01-02",
      visitCount: 3,
      lastVisit: "2026-10-04T12:00:00Z",
      whatsappOptIn: true,
    }]);
    expect(csv).toContain('"name","phone","birthday","visit_count","last_visit","whatsapp_opt_in"');
    expect(csv).toContain('"\'=HYPERLINK(""https://bad.example"")"');
    expect(csv).toContain('"\'+13055550100"');
  });

  it("keeps export and cancellation routes on the AAL2 platform-admin guard", () => {
    for (const file of ["cancel.ts", "export.csv.ts"]) {
      const source = readFileSync(join(process.cwd(), "src/pages/api/admin/business/[id]", file), "utf8");
      expect(source).toContain("requirePlatformAdmin(request, cookies)");
    }
    const source = readFileSync(join(process.cwd(), "src/pages/api/admin/business/[id]/export.csv.ts"), "utf8");
    expect(source).toContain('action: "business.customers_exported"');
    expect(source).toContain("details: {}");
  });
});
