import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("CEO 360 live preview", () => {
  const admin = source("src/pages/admin/[id].astro");
  const dashboard = source("src/pages/dashboard/index.astro");
  const layout = source("src/layouts/Base.astro");
  const middleware = source("src/middleware.ts");

  it("locks the editor until deliberate activation and requires explicit save", () => {
    expect(admin).toContain('<form id="business-config-form"');
    expect(admin).toContain('method="post" inert>');
    expect(admin).toContain('id="enable-ceo-edit"');
    expect(admin).toContain('id="discard-ceo-edit"');
    expect(admin).toContain("form.inert = !enabled");
    expect(admin).toContain('Guardar y publicar cambios');
    expect(admin).toContain('form?.reset()');
    expect(admin).toContain('beforeunload');
    expect(admin).toContain('if (!editing) { event.preventDefault(); return; }');
  });

  it("shows all three perspectives within the same CEO session", () => {
    expect(admin).toContain('data-ceo-view="ceo"');
    expect(admin).toContain('data-ceo-view="owner"');
    expect(admin).toContain('data-ceo-view="customer"');
    expect(admin).toContain('id="ceo-business-picker"');
    expect(admin).toContain('preview=owner');
    expect(admin).toContain('sandbox="allow-same-origin"');
    expect(admin).toContain('id="customer-live-preview"');
    expect(admin).toContain('refreshPreview()');
  });

  it("keeps real owner data read-only with no credential switching", () => {
    expect(dashboard).toContain('identity.isPlatformAdmin && Astro.url.searchParams.get("preview") === "owner"');
    expect(dashboard).toContain("previewReadOnly={ownerPreview}");
    expect(layout).toContain("inert={previewReadOnly}");
    expect(dashboard).toContain("dashboardData(identity");
  });

  it("allows only same-origin embedding of the two previews", () => {
    expect(middleware).toContain("const sameOriginFrame = isPreview || isOwnerDashboardPreview");
    expect(middleware).toContain('sameOriginFrame ? "SAMEORIGIN" : "DENY"');
    expect(middleware).toContain("frame-src 'self' https://challenges.cloudflare.com");
    expect(middleware).toContain('sameOriginFrame ? "\'self\'" : "\'none\'"');
  });
});
