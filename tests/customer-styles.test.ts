import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  businessInitials,
  buttonTextColor,
  contrastRatio,
  customerThemes,
  defaultCustomerBenefits,
  resolveCustomerBenefits,
} from "../src/lib/customer-theme";
import { businessUpdateSchema } from "../src/lib/validation";

const root = process.cwd();
const formSource = readFileSync(join(root, "src/components/CheckInForm.tsx"), "utf8");
const styles = readFileSync(join(root, "src/components/check-in.css"), "utf8");
const fonts = readFileSync(join(root, "src/components/CustomerCapture.astro"), "utf8");
const realRoute = readFileSync(join(root, "src/pages/b/[slug].astro"), "utf8");
const demoRoute = readFileSync(join(root, "src/pages/demo/capture.astro"), "utf8");
const adminPage = readFileSync(join(root, "src/pages/admin/[id].astro"), "utf8");

const validUpdate = {
  displayName: "Café Luna", legalName: "", slug: "cafe-luna", logoUrl: "", privacyUrl: "/privacy",
  contactPhone: "", contactEmail: "", primaryColor: "#C8412A",
  timezone: "America/New_York", defaultCountry: "US", inactivityDays: "45",
  offerInactive: "", offerBirthday: "", offerFrequent: "", offerNew: "", googleReviewUrl: "",
  theme: "calido", tagline: "Café de barrio", benefit1: "Ofertas para clientes",
  benefit2: "Sorpresas en tu cumpleaños", benefit3: "Te reconocemos al volver", heroImageUrl: "https://example.com/hero.jpg",
};

describe("customer-facing brand styles", () => {
  it("defines the four approved themes and fallback benefits", () => {
    expect(customerThemes).toEqual(["elegante", "calido", "moderno", "colorido"]);
    expect(resolveCustomerBenefits(null)).toEqual(defaultCustomerBenefits);
    expect(resolveCustomerBenefits(["Uno", "Dos", "Tres"])).toEqual(["Uno", "Dos", "Tres"]);
    expect(businessInitials("  Café Luna ")).toBe("CL");
  });

  it("chooses a button label with WCAG contrast of at least 4.5 to 1", () => {
    for (let red = 0; red <= 255; red += 17) for (let green = 0; green <= 255; green += 17) for (let blue = 0; blue <= 255; blue += 17) {
      const color = `#${[red, green, blue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
      expect(contrastRatio(color, buttonTextColor(color))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps body copy contrast above 4.5 to 1 for every fixed palette", () => {
    for (const [foreground, background] of [
      ["#1E1A15", "#FAF6EE"], ["#5B5248", "#FAF6EE"], ["#2B1E16", "#FDF1D6"],
      ["#6A5845", "#FDF1D6"], ["#111113", "#FFFFFF"], ["#55555C", "#FFFFFF"],
      ["#F5F5F7", "#0E0E10"], ["#3A1240", "#FFE3EC"], ["#6B4F67", "#FFFFFF"],
    ] as const) expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("validates theme, tagline, three benefits and HTTPS hero image", () => {
    const parsed = businessUpdateSchema.parse(validUpdate);
    expect(parsed).toMatchObject({ theme: "calido", tagline: "Café de barrio", benefits: [validUpdate.benefit1, validUpdate.benefit2, validUpdate.benefit3], heroImageUrl: validUpdate.heroImageUrl });
    expect(businessUpdateSchema.safeParse({ ...validUpdate, theme: "otro" }).success).toBe(false);
    expect(businessUpdateSchema.safeParse({ ...validUpdate, tagline: "x".repeat(81) }).success).toBe(false);
    expect(businessUpdateSchema.safeParse({ ...validUpdate, benefit2: "" }).success).toBe(false);
    expect(businessUpdateSchema.safeParse({ ...validUpdate, benefit1: "x".repeat(41) }).success).toBe(false);
    expect(businessUpdateSchema.safeParse({ ...validUpdate, heroImageUrl: "http://example.com/hero.jpg" }).success).toBe(false);
    expect(businessUpdateSchema.safeParse({ ...validUpdate, heroImageUrl: "/stock/cafe/cafe-1.webp" }).success).toBe(true);
    expect(businessUpdateSchema.safeParse({ ...validUpdate, heroImageUrl: "/stock/cafe/cafe-9.webp" }).success).toBe(false);
    expect(businessUpdateSchema.safeParse({ ...validUpdate, heroImageUrl: "/stock/../secret.webp" }).success).toBe(false);
    expect(businessUpdateSchema.safeParse({ ...validUpdate, heroImageUrl: "/uploads/x.webp" }).success).toBe(false);
  });

  it("renders the approved legal copy and leaves WhatsApp unchecked", () => {
    expect(formSource).toContain("Tengo 13 años o más.");
    expect(formSource).toContain("Déjanos tu fecha de cumpleaños y podremos sorprenderte con descuentos, regalos o beneficios especiales en tu día.");
    expect(formSource).toContain("Recibe ofertas y sorpresas de cumpleaños de {businessName} por WhatsApp. Puedes pedir que paren cuando quieras.");
    expect(formSource).toMatch(/<input name="whatsappOptIn" type="checkbox" \/>/);
  });

  it("uses the exact confirmation copy and only renders the review link when configured", () => {
    expect(formSource).toContain("<h1>¡Listo!</h1>");
    expect(formSource).toContain("<h2>Tu visita quedó registrada</h2>");
    expect(formSource).toContain("Gracias por venir. La próxima vez solo toca la tarjeta otra vez.");
    expect(formSource).toContain("{googleReviewUrl && (");
    expect(formSource).toContain("{instagramUrl && (");
  });

  it("uses explicit hero dimensions, high fetch priority, inline SVG icons and accessible native controls", () => {
    expect(formSource).toMatch(/className="hero-image"[^>]*width="1200" height="800"/);
    expect(formSource).toMatch(/className="hero-image"[^>]*fetchPriority="high"/);
    expect(formSource).toContain("<svg");
    expect(formSource).toContain("<label htmlFor=\"fullName\">");
    expect(formSource).toContain("<input id=\"fullName\"");
    expect(formSource).toContain("<button type=\"submit\"");
  });

  it("self-hosts only the selected theme's fonts, including the script face", () => {
    expect(fonts).toContain("fontCss[props.theme]");
    expect(fonts).toContain("font-display:swap");
    expect(fonts).not.toContain("fonts.googleapis.com");
    expect(fonts).not.toContain("fonts.gstatic.com");
    for (const family of ["Cormorant Garamond Local", "Jost Local", "Great Vibes Local", "Fraunces Local", "Nunito Local", "Caveat Local", "Archivo Local", "IBM Plex Sans Local", "Baloo 2 Local"]) expect(fonts).toContain(family);
  });

  it("keeps touch targets at least 44 pixels and respects reduced motion", () => {
    expect(styles).toContain("min-height: 56px");
    expect(styles).toContain("min-height: 44px");
    expect(styles).toContain("@media (prefers-reduced-motion: no-preference)");
    expect(styles).toContain(":focus-visible");
    const motionStart = styles.indexOf("@media (prefers-reduced-motion: no-preference) {");
    const motionBlock = styles.slice(motionStart, styles.indexOf("\n}", motionStart));
    const animations = styles.match(/animation:/g) ?? [];
    expect(animations.length).toBeGreaterThan(0);
    expect(motionBlock.match(/animation:/g)?.length).toBe(animations.length);
  });

  it("shares one capture component across the live and selectable demo routes", () => {
    expect(realRoute).toContain('import CustomerCapture from "../../components/CustomerCapture.astro"');
    expect(demoRoute).toContain('import CustomerCapture from "../../components/CustomerCapture.astro"');
    expect(demoRoute).toContain("customerThemes.map");
  });

  it("exposes every new business field in the admin form", () => {
    for (const name of ["businessType", "theme", "tagline", "heroSource", "heroImageCustom", "benefit1", "benefit2", "benefit3", "instagramUrl"]) expect(adminPage).toContain(`name="${name}"`);
    expect(adminPage).toContain("<BrandColorField");
    expect(readFileSync("src/components/BrandColorField.astro", "utf8")).toContain('name="primaryColor"');
  });
});
