import { describe, expect, it, vi } from "vitest";

const verifyOtp = vi.fn(async () => ({ error: null }));
vi.mock("astro:env/server", () => ({ getSecret: () => undefined }));
vi.mock("../src/lib/supabase", () => ({ createSupabaseServerClient: () => ({ auth: { verifyOtp } }) }));
const { GET, POST } = await import("../src/pages/auth/callback");

const redirect = (location: string, status = 302) => new Response(null, { status, headers: { location } });

describe("email link callback (D-021, GS-42)", () => {
  it("does not consume the token on GET, so link prefetch is harmless", async () => {
    const url = new URL("https://smart-tap.test/auth/callback?token_hash=abcdef123456&type=recovery&next=/set-password");
    const response = await GET({ request: new Request(url), cookies: {}, url, redirect } as never);
    expect(response.status).toBe(200);
    expect(verifyOtp).not.toHaveBeenCalled();
    const html = await response.text();
    expect(html).toContain('method="post"');
    expect(html).toContain('value="abcdef123456"');
  });

  it("escapes and rejects malformed token values", async () => {
    const url = new URL('https://smart-tap.test/auth/callback?token_hash="><script>&type=recovery');
    const response = await GET({ request: new Request(url), cookies: {}, url, redirect } as never);
    expect(response.status).toBe(303);
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("consumes the token on POST and keeps the redirect local", async () => {
    const body = new URLSearchParams({ token_hash: "abcdef123456", type: "recovery", next: "/\\evil.example" });
    const request = new Request("https://smart-tap.test/auth/callback", { method: "POST", body });
    const response = await POST({ request, cookies: {}, redirect } as never);
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "abcdef123456", type: "recovery" });
    expect(response.headers.get("location")).toBe("/dashboard");
  });
});
