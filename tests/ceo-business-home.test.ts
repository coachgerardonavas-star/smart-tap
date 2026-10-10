import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contractOverview } from "../src/lib/admin-contract-overview";

const src = (path: string) => readFileSync(join(process.cwd(),path),"utf8");

describe("CEO home navigation and directory", () => {
  const home = src("src/pages/admin/index.astro");
  const detail = src("src/pages/admin/[id].astro");
  const layout = src("src/layouts/Base.astro");
  const dashboard = src("src/pages/dashboard/index.astro");
  it("shows a searchable grid with brands and clickable business names", () => {
    expect(home).toContain('id="business-search"');
    expect(home).toContain('data-business-card');
    expect(home).toContain('class="business-logo"');
    expect(home).toContain("business.logo_url");
    expect(home).toContain('class="business-cards"');
    expect(home).toContain("normalizeName");
    expect(home).toContain("card.hidden = !matches");
  });
  it("shows only the contract date, never a fabricated billing date", () => {
    expect(home).toContain("business.term_ends_at");
    expect(home).toContain("Renovación / fin del período");
    expect(home).toContain("no representa el próximo cobro mensual");
    expect(home).toContain("business.contractDate");
  });
  it("opens the create form from the compact + Negocio navigation", () => {
    expect(layout).toContain('href={homeHref}');
    expect(layout).toContain('"Inicio" : "Panel"');
    expect(layout).toContain('href="/admin#nuevo-negocio"');
    expect(layout).toContain('class="nav-plus"');
    expect(home).toContain('id="nuevo-negocio"');
    expect(home).toContain("newBusiness.open = true");
  });
  it("eliminates the business dropdown without losing 360 views", () => {
    expect(detail).not.toContain("ceo-business-picker");
    expect(detail).toContain('href="/admin#negocios"');
    expect(detail).toContain('data-ceo-view="owner"');
    expect(detail).toContain('id="customer-live-preview"');
    expect(dashboard).toContain('return Astro.redirect("/admin", 302)');
  });
});
describe("contract period summary", () => {
  const now = new Date("2026-10-10T12:00:00Z");
  it("never treats contract expiration as the next monthly payment", () => {
    expect(contractOverview(null,null,now)).toEqual({state:"missing",label:"Sin período contractual registrado"});
    expect(contractOverview("2026-12-10T12:00:00Z",null,now).state).toBe("current");
  });
  it("marks near-due and expired terms without creating renewal dates", () => {
    expect(contractOverview("2026-10-15T12:00:00Z",null,now).state).toBe("due-soon");
    expect(contractOverview("2026-10-01T12:00:00Z",null,now).state).toBe("expired");
    expect(contractOverview("2026-10-01T12:00:00Z","2026-10-03T00:00:00Z",now).state).toBe("cancelled");
    expect(contractOverview("bad",null,now).state).toBe("missing");
  });
});
