import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("public form hardening", () => {
  it("verifies Turnstile before opening a service database client", () => {
    for (const path of [
      "src/pages/api/public/check-in.ts",
      "src/pages/api/auth/login.ts",
      "src/pages/api/auth/forgot-password.ts",
    ]) {
      const route = source(path);
      expect(route.indexOf("verifyTurnstile(")).toBeGreaterThan(-1);
      const databaseCall = path.includes("check-in") ? "createSupabaseServiceClient()" : path.includes("login") ? "enforceAuthRateLimit(" : "enforceAuthRateLimit(";
      expect(route.indexOf("verifyTurnstile(")).toBeLessThan(route.indexOf(databaseCall));
      expect(route).toContain("No pudimos procesar la solicitud.");
      expect(route).toMatch(/status:\s*400|json\(400/);
    }
  });

  it("returns the same minimal check-in confirmation for every customer", () => {
    const route = source("src/pages/api/public/check-in.ts");
    expect(route).toContain("{ ok: true, businessName: business.display_name }");
    expect(route).not.toContain("return json(201, { data })");
    const form = source("src/components/CheckInForm.tsx");
    expect(form).not.toContain("visitCount");
    expect(form).not.toContain("alreadyCounted");
  });

  it("places Turnstile widgets on check-in, login and password reset", () => {
    // The check-in form is a hydrated React island: implicit `.cf-turnstile`
    // rendering was wiped by hydration and every live check-in lost its token.
    const checkIn = source("src/components/CheckInForm.tsx");
    expect(checkIn).toContain("api.render(turnstileContainer.current");
    expect(checkIn).toContain("getResponse(turnstileWidget.current)");
    expect(checkIn).not.toContain('className="cf-turnstile"');
    expect(source("src/components/CustomerCapture.astro")).toContain("api.js?render=explicit");
    expect(source("src/pages/login.astro")).toContain("<TurnstileWidget");
    expect(source("src/pages/forgot-password.astro")).toContain("<TurnstileWidget");
  });

  it("uses generic auth responses and the dedicated rate limiter", () => {
    const login = source("src/pages/api/auth/login.ts");
    const forgot = source("src/pages/api/auth/forgot-password.ts");
    expect(login).toContain('enforceAuthRateLimit("login"');
    expect(forgot).toContain('enforceAuthRateLimit("forgot_password"');
    expect(login).toContain("/login?error=1");
    expect(forgot).toContain("/forgot-password?sent=1");
  });
});
