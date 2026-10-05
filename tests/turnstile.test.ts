import { beforeEach, describe, expect, it, vi } from "vitest";

const secrets = vi.hoisted(() => new Map<string, string>());
vi.mock("astro:env/server", () => ({ getSecret: (name: string) => secrets.get(name) }));
const { turnstileSiteKey, verifyTurnstile } = await import("../src/lib/turnstile");

beforeEach(() => {
  secrets.clear();
  vi.restoreAllMocks();
});

describe("Cloudflare Turnstile", () => {
  it("skips safely and logs once when configuration is incomplete", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await expect(verifyTurnstile(null, "203.0.113.5")).resolves.toBe(true);
    await expect(verifyTurnstile("", "203.0.113.5")).resolves.toBe(true);
    expect(turnstileSiteKey()).toBeNull();
    expect(warning).toHaveBeenCalledTimes(1);
  });

  it("requires a token and verifies it with Cloudflare when configured", async () => {
    secrets.set("TURNSTILE_SITE_KEY", "site-test");
    secrets.set("TURNSTILE_SECRET_KEY", "secret-test");
    const fetchMock = vi.fn().mockResolvedValue(new Response('{"success":true}', { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    expect(turnstileSiteKey()).toBe("site-test");
    await expect(verifyTurnstile("", "203.0.113.5")).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(verifyTurnstile("valid-token", "203.0.113.5")).resolves.toBe(true);
    const body = fetchMock.mock.calls[0]![1]!.body as URLSearchParams;
    expect(body.get("secret")).toBe("secret-test");
    expect(body.get("response")).toBe("valid-token");
    expect(body.get("remoteip")).toBe("203.0.113.5");
  });
});
