import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("astro:env/server", () => ({ getSecret: () => undefined }));
vi.mock("astro:middleware", () => ({ defineMiddleware: (handler: unknown) => handler }));

const authClient = { getClaims: vi.fn(), getUser: vi.fn() };
const profileQuery = { select: () => profileQuery, eq: () => profileQuery, maybeSingle: async () => ({ data: { platform_role: "platform_admin" } }) };
vi.mock("../src/lib/supabase", () => ({
  createSupabaseServerClient: () => ({ auth: authClient }),
  createSupabaseServiceClient: () => ({ from: () => profileQuery, auth: { admin: { getUserById: async () => ({ data: null }) } } }),
}));

const { AuthorizationError, getAuthIdentity } = await import("../src/lib/auth");
const { onRequest } = await import("../src/middleware");
const { isInvalidSessionError, supabaseSessionCookieNames } = await import("../src/lib/session");

const userId = "11111111-1111-4111-8111-111111111111";
const sessionCookies = "sb-fzrzrbzxjdezwylzkbkh-auth-token.0=a; sb-fzrzrbzxjdezwylzkbkh-auth-token.1=b; theme=dark; sb-fzrzrbzxjdezwylzkbkh-auth-token-code-verifier=c";

function context(path: string, cookieHeader = sessionCookies) {
  const url = new URL(path, "https://smart-tap.test");
  const deleted: string[] = [];
  return {
    deleted,
    url,
    request: new Request(url, { headers: { cookie: cookieHeader } }),
    cookies: { delete: (name: string) => { deleted.push(name); } },
    redirect(location: string, status = 302) {
      return new Response(null, { status, headers: { location } });
    },
  };
}

type Handler = (context: unknown, next: () => Promise<Response>) => Promise<Response>;
const run = (ctx: ReturnType<typeof context>, next: () => Promise<Response>) => (onRequest as unknown as Handler)(ctx, next);
const throwing = (error: unknown) => async () => { throw error; };

describe("D-058 reproduction: revoked session on /mfa", () => {
  it("turns the old 'Unable to list MFA factors' crash into an HTML page, never an untyped download", async () => {
    // Before D-058 the middleware re-threw this error and Node sent an empty
    // 500 with no content-type, which iOS saved as mfa.txt.
    const response = await run(context("/mfa?next=%2Fadmin"), throwing(new Error("Unable to list MFA factors")));
    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    const body = await response.text();
    expect(body).toContain("<!doctype html>");
    expect(body).toContain("Algo salió mal");
    expect(body).not.toContain("Unable to list MFA factors");
  });

  it("classifies the Auth 403 session_not_found as an invalid session", () => {
    expect(isInvalidSessionError({ name: "AuthApiError", status: 403, code: "session_not_found" })).toBe(true);
    expect(isInvalidSessionError({ name: "AuthApiError", status: 400, code: "refresh_token_not_found" })).toBe(true);
    expect(isInvalidSessionError({ name: "AuthSessionMissingError", status: 400 })).toBe(true);
    expect(isInvalidSessionError({ name: "AuthInvalidJwtError", status: 400 })).toBe(true);
    expect(isInvalidSessionError({ name: "AuthApiError", status: 401, code: "bad_jwt" })).toBe(true);
    expect(isInvalidSessionError({ name: "AuthRetryableFetchError", status: 0 })).toBe(false);
    expect(isInvalidSessionError({ name: "AuthApiError", status: 500, code: "unexpected_failure" })).toBe(false);
    expect(isInvalidSessionError(null)).toBe(false);
  });

  it("makes /mfa raise a session error before the generic factor error", () => {
    const page = readFileSync(join(process.cwd(), "src/pages/mfa.astro"), "utf8");
    const sessionCheck = page.indexOf('throw new AuthorizationError(401, "session_invalid")');
    const genericError = page.indexOf('throw new Error("Unable to list MFA factors")');
    expect(sessionCheck).toBeGreaterThan(0);
    expect(sessionCheck).toBeLessThan(genericError);
  });
});

describe("D-058 invalid session on protected pages and APIs", () => {
  it.each(["/mfa", "/admin", "/admin/10000000-0000-4000-8000-000000000001", "/dashboard", "/terms/accept?business=x"])(
    "redirects %s to login with next and clears every Supabase session cookie", async (path) => {
      const ctx = context(path);
      const response = await run(ctx, throwing(new AuthorizationError(401, "session_invalid")));
      expect(response.status).toBe(302);
      const location = new URL(response.headers.get("location") ?? "");
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("next")).toBe(new URL(path, "https://x.test").pathname + new URL(path, "https://x.test").search);
      expect(ctx.deleted.sort()).toEqual([
        "sb-fzrzrbzxjdezwylzkbkh-auth-token-code-verifier",
        "sb-fzrzrbzxjdezwylzkbkh-auth-token.0",
        "sb-fzrzrbzxjdezwylzkbkh-auth-token.1",
      ]);
    });

  it("answers /api/* with 401 JSON and clears the session cookies", async () => {
    const ctx = context("/api/dashboard/follow-up");
    const response = await run(ctx, throwing(new AuthorizationError(401, "session_invalid")));
    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.json()).toEqual({ error: "Debes iniciar sesión." });
    expect(ctx.deleted).toHaveLength(3);
  });

  it("answers an unexpected /api/* error with JSON, not HTML", async () => {
    const response = await run(context("/api/admin/businesses"), throwing(new TypeError("boom")));
    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toBe("application/json");
    expect(await response.text()).not.toContain("boom");
  });

  it("only matches Supabase session cookie names", () => {
    expect(supabaseSessionCookieNames("sb-abc-auth-token=x; other=y; sb-abc-auth-token.2=z; sb-abc-something=q")).toEqual(["sb-abc-auth-token", "sb-abc-auth-token.2"]);
    expect(supabaseSessionCookieNames(null)).toEqual([]);
  });
});

describe("D-058 page errors always carry an HTML content type", () => {
  it("renders the 403 page as HTML", async () => {
    const response = await run(context("/admin"), throwing(new AuthorizationError(403)));
    expect(response.status).toBe(403);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await response.text()).toContain("No tienes acceso");
  });

  it("replaces an untyped error response from a page", async () => {
    const response = await run(context("/dashboard"), async () => new Response(null, { status: 500 }));
    expect(response.status).toBe(500);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await response.text()).toContain("Algo salió mal");
  });

  it("leaves successful and typed responses untouched", async () => {
    const page = await run(context("/dashboard"), async () => new Response("<p>ok</p>", { status: 200, headers: { "content-type": "text/html" } }));
    expect(await page.text()).toBe("<p>ok</p>");
    const notFound = await run(context("/nada"), async () => new Response("<h1>404</h1>", { status: 404, headers: { "content-type": "text/html" } }));
    expect(await notFound.text()).toBe("<h1>404</h1>");
  });
});

describe("D-058 valid flows keep their guards", () => {
  it("still sends an aal1 admin to /mfa without clearing the session", async () => {
    const ctx = context("/admin");
    const response = await run(ctx, throwing(new AuthorizationError(403, "mfa_required")));
    expect(response.status).toBe(302);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/mfa");
    expect(ctx.deleted).toEqual([]);
  });
});

describe("D-058 server-side session confirmation", () => {
  beforeEach(() => {
    authClient.getClaims.mockReset();
    authClient.getUser.mockReset();
    authClient.getClaims.mockResolvedValue({ data: { claims: { sub: userId, email: "admin@example.test", aal: "aal2" } }, error: null });
  });

  it("returns no identity when Auth reports the session revoked, even with a valid aal2 JWT", async () => {
    authClient.getUser.mockResolvedValue({ data: { user: null }, error: { name: "AuthApiError", status: 403, code: "session_not_found" } });
    expect(await getAuthIdentity(new Request("https://x.test/admin"), {} as never)).toBeNull();
  });

  it("does not log the user out when Auth is unreachable", async () => {
    authClient.getUser.mockResolvedValue({ data: { user: null }, error: { name: "AuthRetryableFetchError", status: 0 } });
    await expect(getAuthIdentity(new Request("https://x.test/admin"), {} as never)).rejects.toThrow("auth_unavailable");
  });

  it("rejects a live user that does not match the token subject", async () => {
    authClient.getUser.mockResolvedValue({ data: { user: { id: "99999999-9999-4999-8999-999999999999" } }, error: null });
    expect(await getAuthIdentity(new Request("https://x.test/admin"), {} as never)).toBeNull();
  });

  it("keeps a valid aal2 admin session", async () => {
    authClient.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
    expect(await getAuthIdentity(new Request("https://x.test/admin"), {} as never)).toEqual({
      id: userId, email: "admin@example.test", isPlatformAdmin: true, aal: "aal2",
    });
  });

  it("keeps logout global", () => {
    const logout = readFileSync(join(process.cwd(), "src/pages/api/auth/logout.ts"), "utf8");
    expect(logout).toContain("supabase.auth.signOut()");
    expect(logout).not.toMatch(/scope:\s*["']local["']/);
  });
});
