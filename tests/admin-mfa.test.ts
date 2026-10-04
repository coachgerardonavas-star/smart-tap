import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("astro:env/server", () => ({ getSecret: () => undefined }));
vi.mock("astro:middleware", () => ({ defineMiddleware: (handler: unknown) => handler }));

const { AuthorizationError, assertBusinessAccess, enforcePlatformAdminMfa } = await import("../src/lib/auth");
const { onRequest } = await import("../src/middleware");

const admin = (aal: "aal1" | "aal2") => ({
  id: "11111111-1111-4111-8111-111111111111",
  email: "admin@example.test",
  isPlatformAdmin: true,
  aal,
});

function middlewareContext(path: string) {
  const url = new URL(path, "https://smart-tap.test");
  return {
    url,
    redirect(location: string, status = 302) {
      return new Response(null, { status, headers: { location } });
    },
  };
}

describe("platform admin MFA policy", () => {
  it("denies an aal1 platform_admin", () => {
    expect(() => enforcePlatformAdminMfa(admin("aal1"))).toThrow(
      expect.objectContaining({ status: 403, reason: "mfa_required" }),
    );
  });

  it("allows an aal2 platform_admin", () => {
    expect(enforcePlatformAdminMfa(admin("aal2"))).toEqual(admin("aal2"));
  });

  it("keeps every protected admin page and API on the aal2 guard", () => {
    const apiRoot = join(process.cwd(), "src", "pages", "api", "admin");
    const apiFiles = walkTypeScript(apiRoot);
    expect(apiFiles.length).toBeGreaterThan(0);
    for (const file of apiFiles) {
      expect(readFileSync(file, "utf8"), file).toContain("requirePlatformAdmin(request, cookies)");
    }

    for (const file of ["src/pages/admin/index.astro", "src/pages/admin/[id].astro"]) {
      expect(readFileSync(join(process.cwd(), file), "utf8"), file).toContain(
        "requirePlatformAdmin(Astro.request, Astro.cookies)",
      );
    }
  });
});

describe("platform admin MFA on customer-data routes", () => {
  it("denies an aal1 platform_admin tenant access before any query", async () => {
    await expect(assertBusinessAccess(admin("aal1"), "22222222-2222-4222-8222-222222222222", false)).rejects.toMatchObject({ status: 403, reason: "mfa_required" });
  });

  it("allows an aal2 platform_admin tenant access", async () => {
    await expect(assertBusinessAccess(admin("aal2"), "22222222-2222-4222-8222-222222222222", false)).resolves.toEqual({ role: "platform_admin" });
  });

  it("puts the dashboard and customer deletion behind the data-access guard", () => {
    expect(readFileSync(join(process.cwd(), "src/pages/dashboard/index.astro"), "utf8")).toContain("requireDataAccess(Astro.request, Astro.cookies)");
    expect(readFileSync(join(process.cwd(), "src/pages/api/dashboard/customer/[id]/delete.ts"), "utf8")).toContain("requireDataAccess(request, cookies)");
  });
});

describe("MFA-required responses", () => {
  it("returns 403 JSON for an aal1 admin API request", async () => {
    const response = await onRequest(
      middlewareContext("/api/admin/businesses") as never,
      async () => { throw new AuthorizationError(403, "mfa_required"); },
    );
    if (!(response instanceof Response)) throw new Error("Expected an API response");
    expect(response.status).toBe(403);
    expect(response.headers.get("content-type")).toBe("application/json");
    await expect(response.json()).resolves.toEqual({ error: "Debes confirmar el segundo factor." });
  });

  it("redirects an aal1 admin page request to the MFA flow", async () => {
    const response = await onRequest(
      middlewareContext("/admin?business=review-live") as never,
      async () => { throw new AuthorizationError(403, "mfa_required"); },
    );
    if (!(response instanceof Response)) throw new Error("Expected a redirect response");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://smart-tap.test/admin/mfa?next=%2Fadmin%3Fbusiness%3Dreview-live",
    );
  });
});

function walkTypeScript(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walkTypeScript(path) : entry.name.endsWith(".ts") ? [path] : [];
  });
}
