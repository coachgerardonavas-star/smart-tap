import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCustomerExportCsv } from "../src/lib/csv";
import { customerExportIsAvailable, fetchAllPages } from "../src/lib/pagination";
import {
  MINIMUM_CUSTOMER_AGE,
  PRIVACY_NOTICE_VERSION,
  PRIVACY_NOTICE_UPDATED_EN,
  PRIVACY_NOTICE_UPDATED_ES,
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
      "Si pasan 24 meses sin que registres una visita, tus datos se borran. Si Café Luna deja de usar Smart Tap, puede descargar su lista de clientes durante 30 días y Smart Tap borra los datos a los 90 días.",
    ]);
    expect(copy.es.sections.find((section) => section.heading === "Tus derechos")?.paragraphs).toEqual([
      "Puedes pedir ver, corregir o borrar tus datos, o retirar tu consentimiento. Escríbele a Café Luna: +13055550100. Si no te responde, escribe a smarttap@yourbizupgraded.com.",
    ]);
    expect(copy.en.sections.find((section) => section.heading === "How long")?.paragraphs).toEqual([
      "If 24 months pass without a recorded visit, your data is deleted. If Café Luna stops using Smart Tap, it can download its customer list for 30 days and Smart Tap deletes the data after 90 days.",
    ]);
    expect(copy.en.sections.find((section) => section.heading === "Your rights")?.paragraphs).toEqual([
      "You can ask to see, correct or delete your data, or withdraw your consent. Contact Café Luna: +13055550100. If they do not answer, write to smarttap@yourbizupgraded.com.",
    ]);
    expect(copy.es.sections.find((section) => section.heading === "Edad")?.paragraphs).toEqual(["El registro es solo para personas de 13 años o más."]);
    expect(copy.en.sections.find((section) => section.heading === "Age")?.paragraphs).toEqual(["Registration is only for people aged 13 or older."]);
  });

  it("renders the approved notice word for word in both languages", () => {
    const approved = readFileSync(join(process.cwd(), "docs/PRIVACY_NOTICE.md"), "utf8").replace(/\r\n/g, "\n");
    const copy = buildPrivacyNoticeCopy({
      businessNameEs: "Café Luna",
      businessNameEn: "Café Luna",
      contactEs: "contacto@example.test",
      contactEn: "contact@example.test",
    });
    const render = (language: "es" | "en") => {
      const value = copy[language];
      return [
        `**${value.title}**`,
        ...value.sections.map((section) => [
          `**${section.heading}**`,
          ...(section.paragraphs ?? []),
          ...(section.items ?? []).map((item) => `- ${item}`),
        ].join("\n")),
        value.updated,
      ].join("\n\n");
    };
    const spanish = approved.split("## Español")[1]?.split("## English")[0]?.trim();
    const english = approved.split("## English")[1]?.split("## Implementation spec")[0]?.trim();
    expect(spanish).toBeTruthy();
    expect(english).toBeTruthy();
    expect(render("es")).toBe(spanish!
      .replaceAll("{Negocio}", "Café Luna")
      .replace("{contacto}", "contacto@example.test")
      .replace("{fecha}", PRIVACY_NOTICE_UPDATED_ES));
    expect(render("en")).toBe(english!
      .replaceAll("{Business}", "Café Luna")
      .replace("{contact}", "contact@example.test")
      .replace("{date}", PRIVACY_NOTICE_UPDATED_EN));
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
    expect(csv).toContain('"+13055550100"');
    expect(csv).not.toContain('"\'+13055550100"');
  });

  it("paginates every customer beyond the Supabase 1000-row response limit", async () => {
    const source = Array.from({ length: 2_105 }, (_, index) => ({
      fullName: `Cliente ${index + 1}`,
      phone: `+1305${String(index).padStart(7, "0")}`,
      birthday: null,
      visitCount: index,
      lastVisit: null,
      whatsappOptIn: false,
    }));
    const calls: Array<[number, number]> = [];
    const rows = await fetchAllPages(async (from, to) => {
      calls.push([from, to]);
      return { data: source.slice(from, to + 1), error: null };
    });
    expect(rows).toEqual(source);
    expect(calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
    const csv = buildCustomerExportCsv(rows);
    expect(csv.trimEnd().split("\r\n")).toHaveLength(2_106);
    expect(csv).toContain('"Cliente 2105","+13050002104"');
    const route = readFileSync(join(process.cwd(), "src/pages/api/admin/business/[id]/export.csv.ts"), "utf8");
    expect(route.match(/fetchAllPages/g)).toHaveLength(3);
    expect(route.match(/\.range\(from, to\)/g)).toHaveLength(2);
  });

  it("allows export before cancellation and through day 30, then closes it", () => {
    const now = new Date("2026-10-04T12:00:00Z");
    expect(customerExportIsAvailable(null, now)).toBe(true);
    expect(customerExportIsAvailable("2026-09-04T12:00:00Z", now)).toBe(true);
    expect(customerExportIsAvailable("2026-09-04T11:59:59Z", now)).toBe(false);
    const route = readFileSync(join(process.cwd(), "src/pages/api/admin/business/[id]/export.csv.ts"), "utf8");
    expect(route).toContain("status: 410");
    expect(route).toContain("La ventana de descarga de 30 días terminó.");
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
