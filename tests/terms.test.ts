import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { TERMS_COPY, TERMS_VERSION } from "../src/lib/terms";

vi.mock("astro:env/server", () => ({ getSecret: () => undefined }));
vi.mock("astro:middleware", () => ({ defineMiddleware: (handler: unknown) => handler }));

const { onRequest } = await import("../src/middleware");
const { TermsAcceptanceRequiredError, hasAcceptedCurrentTerms } = await import("../src/lib/terms-access");

function approvedLanguage(markdown: string, start: string, end: string | null): string {
  const afterStart = markdown.split(start)[1];
  if (!afterStart) throw new Error(`Missing ${start}`);
  const language = end ? afterStart.split(end)[0] : afterStart.split("## Implementation spec")[0];
  if (!language) throw new Error(`Missing approved copy after ${start}`);
  return language.trim();
}

function renderedCopy(language: "es" | "en"): string {
  const copy = TERMS_COPY[language];
  return [
    `**${copy.title}**`,
    ...copy.sections.map((section) => `**${section.heading}** ${section.text}`),
    copy.version,
  ].join("\n\n");
}

function middlewareContext(path: string) {
  const url = new URL(path, "https://smart-tap.test");
  return {
    url,
    redirect(location: string, status = 302) {
      return new Response(null, { status, headers: { location } });
    },
  };
}

describe("approved Terms of Service", () => {
  it("renders the approved Spanish and English text word for word", () => {
    const approved = readFileSync(join(process.cwd(), "docs/TERMS_OF_SERVICE.md"), "utf8").replace(/\r\n/g, "\n");
    expect(renderedCopy("es")).toBe(approvedLanguage(approved, "## Español", "## English").replace("{fecha}", TERMS_VERSION));
    expect(renderedCopy("en")).toBe(approvedLanguage(approved, "## English", null).replace("{date}", TERMS_VERSION));
  });

  it("links the public terms from login, dashboard and business privacy", () => {
    for (const file of ["src/pages/login.astro", "src/pages/dashboard/index.astro", "src/pages/privacy/[slug].astro"]) {
      expect(readFileSync(join(process.cwd(), file), "utf8"), file).toContain('href="/terms"');
    }
  });
});

describe("terms acceptance gate", () => {
  it("redirects the dashboard to acceptance before showing customer data", async () => {
    const response = await onRequest(
      middlewareContext("/dashboard?business=cafe-luna") as never,
      async () => { throw new TermsAcceptanceRequiredError("10000000-0000-4000-8000-000000000001"); },
    );
    if (!(response instanceof Response)) throw new Error("Expected a redirect response");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("https://smart-tap.test/terms/accept?business=10000000-0000-4000-8000-000000000001&next=%2Fdashboard%3Fbusiness%3Dcafe-luna");
  });

  it("returns 403 JSON for dashboard APIs before acceptance", async () => {
    const response = await onRequest(
      middlewareContext("/api/dashboard/follow-up") as never,
      async () => { throw new TermsAcceptanceRequiredError("10000000-0000-4000-8000-000000000001"); },
    );
    if (!(response instanceof Response)) throw new Error("Expected an API response");
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Debes aceptar los Términos de servicio vigentes." });
  });

  it("checks every dashboard data route and exempts platform admins", async () => {
    expect(readFileSync(join(process.cwd(), "src/lib/data.ts"), "utf8")).toContain("assertCurrentTermsAccepted(identity, business.id)");
    const apiRoot = join(process.cwd(), "src/pages/api/dashboard");
    const files = readdirSync(apiRoot, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
      .map((entry) => join(entry.parentPath, entry.name));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) expect(readFileSync(file, "utf8"), file).toContain("assertCurrentTermsAccepted");
    await expect(hasAcceptedCurrentTerms({ id: "admin", email: null, isPlatformAdmin: true, aal: "aal2" }, "business")).resolves.toBe(true);
  });

  it("keeps the current version on the server and the checkbox unchecked", () => {
    const route = readFileSync(join(process.cwd(), "src/pages/api/terms/accept.ts"), "utf8");
    const page = readFileSync(join(process.cwd(), "src/components/TermsAcceptanceCard.astro"), "utf8");
    expect(route).toContain("p_terms_version: TERMS_VERSION");
    expect(route).not.toContain('form.get("termsVersion")');
    expect(route.indexOf("assertBusinessAccess(identity, businessId)")).toBeLessThan(route.indexOf('service.rpc("record_terms_acceptance"'));
    expect(page).toContain('type="checkbox" name="accepted" required');
    expect(page).not.toMatch(/type="checkbox"[^>]+checked/);
  });

  it("requires owner electronic signature with server-set evidence", () => {
    const route = readFileSync(join(process.cwd(), "src/pages/api/terms/sign.ts"), "utf8");
    const page = readFileSync(join(process.cwd(), "src/components/TermsSignatureCard.astro"), "utf8");
    const signPage = readFileSync(join(process.cwd(), "src/pages/terms/sign.astro"), "utf8");
    expect(TERMS_VERSION).toBe("2026-10-04-v2");
    expect(route).toContain('membership.role !== "owner"');
    expect(route).toContain("p_terms_version: TERMS_VERSION");
    expect(route).toContain("hashIdentifier(`terms-signature:${requestIp(request, clientAddress)}`)");
    expect(route).toContain('request.headers.get("user-agent")');
    expect(page).toContain('type="checkbox" name="signed" required');
    expect(page).toContain("Firmo estos Términos de servicio");
    expect(page).not.toMatch(/type="checkbox"[^>]+checked/);
    expect(signPage).toContain("<TermsNotice />");
  });

  it("routes owners to signature and keeps manager acceptance separate", () => {
    const page = readFileSync(join(process.cwd(), "src/pages/terms/accept.astro"), "utf8");
    const route = readFileSync(join(process.cwd(), "src/pages/api/terms/accept.ts"), "utf8");
    const dashboard = readFileSync(join(process.cwd(), "src/pages/dashboard/index.astro"), "utf8");
    expect(page).toContain('membership.role === "owner"');
    expect(route).toContain('membership.role === "owner"');
    expect(dashboard).toContain("pendingOwnerSignatureBusiness");
  });
});
