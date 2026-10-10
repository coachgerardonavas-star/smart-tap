import { describe, expect, it } from "vitest";
import { slugify } from "../src/lib/slug";
import { businessInputSchema } from "../src/lib/validation";

describe("slugify", () => {
  it("turns business names into valid short URLs", () => {
    expect(slugify("Arepas sabrosas")).toBe("arepas-sabrosas");
    expect(slugify("  Café Luna  ")).toBe("cafe-luna");
    expect(slugify("Arepas del Niño & Cía.")).toBe("arepas-del-nino-cia");
    expect(slugify("---")).toBe("");
  });

  it("always satisfies the server slug rule and the 80 character limit", () => {
    const long = slugify("Restaurante ".repeat(20));
    expect(long.length).toBeLessThanOrEqual(80);
    for (const name of ["Arepas sabrosas", "Ñandú 24/7", long]) {
      const slug = slugify(name);
      const parsed = businessInputSchema.safeParse({
        displayName: "Negocio", slug, logoUrl: "", ownerEmail: "", primaryColor: "#155EEF", secondaryColor: "#0B1220",
        timezone: "America/New_York", defaultCountry: "US", inactivityDays: "30",
      });
      expect(parsed.success).toBe(true);
    }
  });
});
