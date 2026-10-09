import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import CheckInForm, { ConfirmationView } from "../src/components/CheckInForm";
import { businessPresets, businessTypes, resolveBusinessType, stockPhotoLibrary, stockPhotoPattern } from "../src/lib/business-presets";
import { normalizeCustomerName, publicCheckInResponse } from "../src/lib/check-in-result";
import {
  buttonTextColor, contrastRatio, customerStyleTokens, customerThemePalettes, customerThemes, filledVisitStars,
  isPaletteColor, visitCountLabel, worstCaseHeroBackground,
} from "../src/lib/customer-theme";
import { businessUpdateSchema, heroImageFromForm, heroImageUrlSchema, instagramUrlSchema } from "../src/lib/validation";

const root = process.cwd();
const rewardWords = /recompensa|premio|acumula|para obtener|canjea|puntos/i;

function confirmation(props: Partial<Parameters<typeof ConfirmationView>[0]> = {}) {
  return renderToStaticMarkup(createElement(ConfirmationView, {
    theme: "calido", primaryColor: "#C8412A", businessName: "Café Luna", businessType: "cafe", ...props,
  }));
}

function form(props: Record<string, unknown> = {}) {
  return renderToStaticMarkup(createElement(CheckInForm, {
    slug: "cafe-luna", businessName: "Café Luna", businessType: "cafe", primaryColor: "#C8412A", privacyUrl: "/privacy/cafe-luna",
    theme: "calido", tagline: "Momentos que se quedan", benefits: ["Ofertas para clientes", "Te reconocemos al volver", "Sorpresa en tu cumpleaños"],
    heroImageUrl: "/stock/cafe/cafe-1.webp", ...props,
  }));
}

const filledStars = (html: string) => (html.match(/class="star on"/g) ?? []).length;
const allStars = (html: string) => (html.match(/class="star( on)?"/g) ?? []).length;

describe("D-057 visit counter", () => {
  it.each([[1, 1], [3, 3], [5, 5], [9, 5]])("shows visit %i with %i of 5 stars filled", (visits, stars) => {
    const html = confirmation({ visitCount: visits });
    expect(html).toContain(`Esta es tu visita número ${visits}`);
    expect(filledStars(html)).toBe(stars);
    expect(allStars(html)).toBe(5);
    expect(html).toContain(`aria-label="${stars} de 5 estrellas"`);
    expect(filledVisitStars(visits)).toBe(stars);
    expect(visitCountLabel(visits)).toBe(`Esta es tu visita número ${visits}`);
  });

  it("hides the counter when the server sends no count", () => {
    for (const visitCount of [undefined, 0, -2, 2.5]) {
      const html = confirmation({ visitCount });
      expect(html).not.toContain("Esta es tu visita número");
      expect(allStars(html)).toBe(0);
      expect(html).toContain("Gracias por venir. La próxima vez solo toca la tarjeta otra vez.");
    }
  });

  it("never mentions rewards, prizes or accumulating visits", () => {
    for (const theme of customerThemes) {
      for (const visitCount of [1, 3, 5, 9, 40]) expect(confirmation({ theme, visitCount })).not.toMatch(rewardWords);
      expect(form({ theme })).not.toMatch(rewardWords);
    }
    for (const type of businessTypes) {
      const preset = businessPresets[type];
      expect([preset.tagline, ...preset.benefits].join(" ")).not.toMatch(rewardWords);
    }
    for (const file of ["src/components/CheckInForm.tsx", "src/lib/customer-theme.ts", "src/lib/business-presets.ts"]) {
      expect(readFileSync(join(root, file), "utf8")).not.toMatch(rewardWords);
    }
  });
});

describe("D-057 confirmation links", () => {
  it("renders Instagram only when the business has a URL", () => {
    const withLink = confirmation({ instagramUrl: "https://www.instagram.com/cafeluna" });
    expect(withLink).toContain("Seguir en Instagram");
    expect(withLink).toContain('href="https://www.instagram.com/cafeluna"');
    expect(withLink).toContain('rel="noopener noreferrer"');
    for (const instagramUrl of [null, undefined, ""]) expect(confirmation({ instagramUrl })).not.toContain("Seguir en Instagram");
  });

  it("renders the Google review button only when configured", () => {
    expect(confirmation({ googleReviewUrl: "https://g.page/r/example/review" })).toContain("Déjanos una reseña en Google");
    expect(confirmation({ googleReviewUrl: null })).not.toContain("Déjanos una reseña en Google");
  });
});

describe("D-057 registration screen", () => {
  it("falls back to initials plus the business-type icon when there is no logo", () => {
    const fallback = form({ logoUrl: null, businessType: "barberia" });
    expect(fallback).toContain('data-fallback="initials"');
    expect(fallback).toContain(">CL<");
    expect(fallback).not.toContain("Logo de Café Luna");
    const withLogo = form({ logoUrl: "https://example.com/logo.png" });
    expect(withLogo).toContain('alt="Logo de Café Luna"');
    expect(withLogo).not.toContain('data-fallback="initials"');
  });

  it("shows the type subtitle, motto and three benefits with icons", () => {
    const html = form({ businessType: "panaderia" });
    expect(html).toContain('<p class="brand-sub">Panadería</p>');
    expect(html).toContain('<p class="motto">Momentos que se quedan</p>');
    expect((html.match(/class="benefit-icon"/g) ?? []).length).toBe(3);
  });

  it("loads the hero image eagerly with high priority and explicit size", () => {
    const html = form();
    expect(html).toMatch(/<img class="hero-image" src="\/stock\/cafe\/cafe-1.webp"[^>]*width="1200" height="800"[^>]*fetchPriority="high"/i);
    expect(form({ heroImageUrl: null })).not.toContain("hero-image\"");
  });

  it("keeps the approved consent, birthday and WhatsApp copy, with WhatsApp unchecked", () => {
    const html = form();
    expect(html).toContain("Tengo 13 años o más.");
    expect(html).toContain("Déjanos tu fecha de cumpleaños y podremos sorprenderte con descuentos, regalos o beneficios especiales en tu día.");
    expect(html).toContain("Recibe ofertas y sorpresas de cumpleaños de Café Luna por WhatsApp. Puedes pedir que paren cuando quieras.");
    expect(html).toMatch(/<input type="checkbox" name="whatsappOptIn"\/>/);
    expect(html).not.toMatch(/name="whatsappOptIn"[^>]*checked/);
  });
});

describe("D-057 contrast", () => {
  it("keeps hero text at 4.5:1 over a white photo under the lightest veil", () => {
    for (const theme of customerThemes) {
      const tokens = customerStyleTokens[theme];
      const background = worstCaseHeroBackground(theme);
      expect(contrastRatio(tokens.heroInk, background)).toBeGreaterThanOrEqual(4.5);
      // Colorido prints the motto on its own yellow pill.
      expect(contrastRatio(tokens.mottoInk, theme === "colorido" ? "#FFD23F" : background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps form and confirmation text at 4.5:1 and field borders at 3:1", () => {
    for (const theme of customerThemes) {
      const t = customerStyleTokens[theme];
      for (const [foreground, background] of ([
        [t.paperInk, t.paper], [t.paperMuted, t.paper], [t.paperInk, t.paperField], [t.paperMuted, t.paperField],
        [t.confirmationInk, t.confirmationBackground], [t.confirmationMuted, t.confirmationBackground],
        [t.confirmationInk, t.card], [t.confirmationMuted, t.card],
      ] as const)) expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(t.paperLine, t.paperField)).toBeGreaterThanOrEqual(3);
    }
  });

  it("offers four palette colors per style, each with a 4.5:1 button label", () => {
    for (const theme of customerThemes) {
      const palette = customerThemePalettes[theme];
      expect(new Set(palette).size).toBe(4);
      for (const color of palette) {
        expect(contrastRatio(color, buttonTextColor(color))).toBeGreaterThanOrEqual(4.5);
        expect(isPaletteColor(theme, color.toLowerCase())).toBe(true);
      }
    }
  });
});

describe("D-057 business type presets", () => {
  it("defines every type with valid suggested values", () => {
    expect(businessTypes).toEqual(["restaurante", "cafe", "panaderia", "barberia", "salon", "heladeria", "tienda", "gimnasio"]);
    const days = Object.fromEntries(businessTypes.map((type) => [type, businessPresets[type].inactivityDays]));
    expect(days).toEqual({ restaurante: 21, cafe: 14, panaderia: 14, barberia: 35, salon: 30, heladeria: 21, tienda: 30, gimnasio: 14 });
    for (const type of businessTypes) {
      const preset = businessPresets[type];
      expect(customerThemes).toContain(preset.theme);
      expect(preset.tagline.length).toBeGreaterThan(0);
      expect(preset.tagline.length).toBeLessThanOrEqual(80);
      expect(preset.benefits).toHaveLength(3);
      for (const benefit of preset.benefits) expect(benefit.length).toBeLessThanOrEqual(40);
      expect(preset.photos).toHaveLength(3);
    }
  });

  it("passes the admin schema when a preset is applied as-is", () => {
    for (const type of businessTypes) {
      const preset = businessPresets[type];
      const parsed = businessUpdateSchema.safeParse({
        displayName: "Negocio", legalName: "", slug: "negocio", logoUrl: "", privacyUrl: "", contactPhone: "", contactEmail: "",
        primaryColor: customerThemePalettes[preset.theme][0], secondaryColor: "#111111", timezone: "America/New_York", defaultCountry: "US",
        inactivityDays: String(preset.inactivityDays), offerInactive: "", offerBirthday: "", offerFrequent: "", offerNew: "", googleReviewUrl: "",
        theme: preset.theme, tagline: preset.tagline, benefit1: preset.benefits[0], benefit2: preset.benefits[1], benefit3: preset.benefits[2],
        heroImageUrl: preset.photos[0], businessType: type, instagramUrl: "",
      });
      expect(parsed.success).toBe(true);
    }
  });

  it("ships every library photo as a local WebP under 200 KB with credits", () => {
    const attribution = readFileSync(join(root, "public/stock/ATTRIBUTION.md"), "utf8");
    expect(stockPhotoLibrary).toHaveLength(24);
    for (const photo of stockPhotoLibrary) {
      expect(photo).toMatch(stockPhotoPattern);
      const file = join(root, "public", photo);
      expect(statSync(file).size).toBeLessThan(200 * 1024);
      const header = readFileSync(file).subarray(0, 12).toString("latin1");
      expect(header.startsWith("RIFF") && header.endsWith("WEBP")).toBe(true);
      expect(attribution).toContain(`\`${photo.replace("/stock/", "")}\``);
    }
    for (const type of businessTypes) expect(readdirSync(join(root, "public/stock", type)).filter((name) => name.endsWith(".webp"))).toHaveLength(3);
    expect(attribution).toContain("Unsplash License");
  });

  it("uses cafe as the safe display fallback for legacy or empty types", () => {
    expect(resolveBusinessType(null)).toBe("cafe");
    expect(resolveBusinessType("spa")).toBe("cafe");
    expect(resolveBusinessType("barberia")).toBe("barberia");
  });

  it("requires the accent to belong to the chosen style", () => {
    const base = {
      displayName: "Negocio", legalName: "", slug: "negocio", logoUrl: "", privacyUrl: "", contactPhone: "", contactEmail: "",
      secondaryColor: "#111111", timezone: "America/New_York", defaultCountry: "US", inactivityDays: "30", offerInactive: "", offerBirthday: "",
      offerFrequent: "", offerNew: "", googleReviewUrl: "", theme: "moderno", tagline: "", benefit1: "", benefit2: "", benefit3: "", heroImageUrl: "", businessType: "barberia",
    };
    expect(businessUpdateSchema.safeParse({ ...base, primaryColor: "#ff6a2b" }).data?.primaryColor).toBe("#FF6A2B");
    expect(businessUpdateSchema.safeParse({ ...base, primaryColor: "#C8412A" }).success).toBe(false);
    expect(businessUpdateSchema.safeParse({ ...base, primaryColor: "#FF6A2B", businessType: "spa" }).success).toBe(false);
  });
});

describe("D-057 URL validation", () => {
  it("accepts only canonical Instagram profile URLs", () => {
    expect(instagramUrlSchema.parse("https://www.instagram.com/cafe.luna_2026")).toBe("https://www.instagram.com/cafe.luna_2026");
    expect(instagramUrlSchema.parse(" https://www.instagram.com/cafeluna/ ")).toBe("https://www.instagram.com/cafeluna");
    expect(instagramUrlSchema.parse("")).toBeNull();
    for (const value of [
      "http://www.instagram.com/cafeluna", "https://instagram.com/cafeluna", "https://www.instagram.com.evil.com/cafeluna",
      "https://www.instagram.com/cafe/luna", "https://www.instagram.com/" + "a".repeat(31), "https://www.instagram.com/cafe-luna",
      "https://www.instagram.com/cafeluna?x=1", "javascript:alert(1)", "https://user@www.instagram.com/cafeluna",
    ]) expect(instagramUrlSchema.safeParse(value).success).toBe(false);
  });

  it("accepts HTTPS or library hero photos and nothing else", () => {
    expect(heroImageUrlSchema.parse("https://images.example.com/hero.jpg")).toBe("https://images.example.com/hero.jpg");
    expect(heroImageUrlSchema.parse("/stock/barberia/barberia-2.webp")).toBe("/stock/barberia/barberia-2.webp");
    expect(heroImageUrlSchema.parse("")).toBeNull();
    for (const value of [
      "http://example.com/hero.jpg", "https://user:pass@example.com/hero.jpg", "/stock/barberia/barberia-2.png", "/stock/Barberia/x.webp",
      "//evil.com/x.webp", "/stock/barberia/../../etc.webp", "data:image/png;base64,AAAA", "javascript:alert(1)",
    ]) expect(heroImageUrlSchema.safeParse(value).success).toBe(false);
  });

  it("resolves the admin photo choice", () => {
    expect(heroImageFromForm({ heroSource: "/stock/cafe/cafe-2.webp", heroImageCustom: "https://x.test/a.jpg" })).toBe("/stock/cafe/cafe-2.webp");
    expect(heroImageFromForm({ heroSource: "custom", heroImageCustom: "https://x.test/a.jpg" })).toBe("https://x.test/a.jpg");
    expect(heroImageFromForm({ heroSource: "none", heroImageCustom: "https://x.test/a.jpg" })).toBe("");
    expect(heroImageFromForm({ heroImageUrl: "https://x.test/b.jpg" })).toBe("https://x.test/b.jpg");
  });
});

describe("D-057 public check-in response", () => {
  it("returns the count only when the submitted name matches the stored name", () => {
    const rpc = { customerName: "María López", businessName: "Café Luna", visitCount: 3, alreadyCounted: false, untagged: false };
    expect(publicCheckInResponse(rpc, "  maria   lopez ", "Café Luna")).toEqual({ ok: true, businessName: "Café Luna", visitCount: 3 });
    expect(publicCheckInResponse(rpc, "Otra Persona", "Café Luna")).toEqual({ ok: true, businessName: "Café Luna" });
    expect(publicCheckInResponse(null, "María López", "Café Luna")).toEqual({ ok: true, businessName: "Café Luna" });
    expect(publicCheckInResponse({ ...rpc, visitCount: "x" }, "María López", "Café Luna")).toEqual({ ok: true, businessName: "Café Luna" });
    const response = publicCheckInResponse(rpc, "María López", "Café Luna");
    expect(Object.keys(response).sort()).toEqual(["businessName", "ok", "visitCount"]);
    expect(normalizeCustomerName("  JOSÉ  Núñez ")).toBe("jose nunez");
  });
});
