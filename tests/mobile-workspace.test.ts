import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(),path),"utf8");

describe("CEO mobile workspace redesign",()=>{
  const ceo=source("src/pages/admin/[id].astro");
  const route=source("src/pages/api/admin/business/[id]/update.ts");
  const owner=source("src/pages/dashboard/index.astro");
  const base=source("src/layouts/Base.astro");

  it("opens with the original Vista 360 and keeps the three roles",()=>{
    expect(ceo).toContain('data-ceo-panel="vista"');
    expect(ceo).toContain('data-ceo-panel="diseno" hidden');
    expect(ceo).toContain('data-ceo-panel="administracion" hidden');
    expect(ceo).toContain('data-ceo-panel="accesos" hidden');
    for(const role of ["ceo","owner","customer"]) expect(ceo).toContain(`data-ceo-view="${role}"`);
    expect(ceo).toContain("Tres perspectivas, una sesión");
    expect(ceo).toContain("Modo seguro");
  });
  it("separates live design from administration and access actions",()=>{
    expect(ceo).toContain('id="business-config-form"');
    expect(ceo).toContain('name="mode" value="design"');
    expect(ceo).toContain('id="business-admin-form"');
    expect(ceo).toContain('name="mode" value="administration"');
    expect(ceo).toContain('form.inert = !enabled');
    expect(ceo).toContain('adminForm.inert=!enabled');
    expect(ceo).toContain('id="customer-live-preview"');
    expect(ceo).toContain("Cancelar servicio");
    expect(ceo).toContain("NFC y enlaces");
  });
  it("rejects saves that try to change fields outside their scope",()=>{
    expect(route).toContain('mode !== "design" && mode !== "administration"');
    expect(route).toContain('allowed.has(name)');
    expect(route).toContain('mode === "design" ? current.is_active');
    expect(route).toContain('const saved = {');
    expect(route).toContain('businessUpdateSchema.safeParse');
    expect(route).toContain('changedFieldNames(current, updates)');
    expect(route).toContain("requirePlatformAdmin");
  });
  it("supports tabbed owner navigation while preview is read-only",()=>{
    for(const id of ["inicio","clientes","seguimiento","pagina"]) expect(owner).toContain(`id: "${id}"`);
    expect(owner).toContain('previewReadOnly={ownerPreview}');
    expect(base).toContain('hidden={previewReadOnly}');
    expect(ceo).toContain('sandbox="allow-same-origin"');
    expect(ceo).toContain('data-owner-tab="seguimiento"');
    expect(ceo).toContain('resizeOwnerPreview');
    expect(owner).toContain('data-owner-customer');
    expect(owner).toContain("customer.whatsapp_opt_in");
    expect(owner).toContain("canManage");
  });
});
