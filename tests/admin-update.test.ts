import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { changedFieldNames } from "../src/lib/audit";

describe("business update audit details", () => {
  it("returns only names of fields whose values changed", () => {
    const current = { display_name: "Café Luna", inactivity_days: 30, offer_new: null };
    const next = { display_name: "Café Luna", inactivity_days: 45, offer_new: "Café gratis" };
    const changedFields = changedFieldNames(current, next);
    expect(changedFields).toEqual(["inactivity_days", "offer_new"]);
    expect(changedFields).not.toContain(45);
    expect(changedFields).not.toContain("Café gratis");
  });

  it("writes changedFields under details without field values", () => {
    const route = readFileSync(join(process.cwd(), "src/pages/api/admin/business/[id]/update.ts"), "utf8");
    expect(route).toContain("details: { changedFields }");
    expect(route).not.toMatch(/details:\s*\{[^}]*updates/);
  });

  it("includes the customer style fields in the audited update", () => {
    const route = readFileSync(join(process.cwd(), "src/pages/api/admin/business/[id]/update.ts"), "utf8");
    for (const field of ["theme", "tagline", "benefits", "hero_image_url", "business_type", "instagram_url"]) {
      expect(route).toContain(field);
    }
    expect(route).toContain("changedFieldNames(current, updates)");
  });
});

describe("D-060 delete business route", () => {
  const route = readFileSync(join(process.cwd(), "src/pages/api/admin/business/[id]/delete.ts"), "utf8");
  it("requires a platform admin, the typed slug and an empty business", () => {
    expect(route).toContain("requirePlatformAdmin");
    expect(route).toContain("typed !== business.slug");
    expect(route).toContain('from("customers")');
    expect(route).toContain('from("visits")');
  });
  it("audits before deleting and keeps only slug and name in the audit details", () => {
    expect(route.indexOf('"business.deleted"')).toBeLessThan(route.indexOf('.delete().eq("id", id)'));
    expect(route).toContain("details: { slug: business.slug, displayName: business.display_name }");
  });
  it("is offered on the admin page only when the business is empty", () => {
    const page = readFileSync(join(process.cwd(), "src/pages/admin/[id].astro"), "utf8");
    expect(page).toContain("canDelete ?");
    expect(page).toContain("/delete`");
  });
});

describe("D-061 Automate IT brand in the admin area", () => {
  const layout = readFileSync(join(process.cwd(), "src/layouts/Base.astro"), "utf8");
  it("applies the brand palette only when isAdmin is set", () => {
    expect(layout).toContain('class:list={{ "admin-theme": isAdmin }}');
    for (const color of ["#0A0E1A", "#0052CC", "#003DA5", "#00D9FF", "#AADD00"]) expect(layout).toContain(color);
  });
  it("keeps cyan and lime decorative (never as text color)", () => {
    expect(layout).not.toMatch(/color:\s*var\(--ait-(cyan|lime)\)/);
  });
});

describe("admin header link to add a business", () => {
  it("offers a '+ Nuevo negocio' link that jumps to the creation form", () => {
    const layout = readFileSync(join(process.cwd(), "src/layouts/Base.astro"), "utf8");
    const page = readFileSync(join(process.cwd(), "src/pages/admin/index.astro"), "utf8");
    expect(layout).toContain('href="/admin#nuevo-negocio"');
    expect(layout).toContain("Nuevo negocio");
    expect(page).toContain('id="nuevo-negocio"');
    expect(page).toContain('id="negocios"');
  });
});

describe("activation steps and copyable NFC links", () => {
  const page = readFileSync(join(process.cwd(), "src/pages/admin/[id].astro"), "utf8");
  it("explains why activation is locked and who signs the Terms", () => {
    expect(page).toContain("Por qué no se puede marcar");
    expect(page).toContain("Tú no puedes firmar por él");
    expect(page).toContain("/login");
  });
  it("offers a copy button for each NFC link and for the Google review link", () => {
    expect(page).toContain("data-copy-source");
    expect((page.match(/data-copy>/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(page).toContain("navigator.clipboard.writeText");
  });
});

describe("activation checklist above the toggle", () => {
  const page = readFileSync(join(process.cwd(), "src/pages/admin/[id].astro"), "utf8");
  it("shows the checklist before the Negocio activo checkbox with the real requirements", () => {
    expect(page.indexOf('id="antes-de-activar"')).toBeGreaterThan(-1);
    expect(page.indexOf('id="antes-de-activar"')).toBeLessThan(page.indexOf('name="isActive"'));
    expect(page).toContain("enlace del logo");
    expect(page).toContain('id="acceso"');
    expect(page).toContain('id="aprobacion"');
  });
  it("tells the admin when an invited email already had an account (no email is sent)", () => {
    const invite = readFileSync(join(process.cwd(), "src/pages/api/admin/business/[id]/invite.ts"), "utf8");
    expect(invite).toContain("NO se envió invitación");
  });
});
