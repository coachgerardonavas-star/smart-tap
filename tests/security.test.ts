import { describe, expect, it, vi } from "vitest";

vi.mock("astro:env/server", () => ({ getSecret: () => undefined }));
const { requestIp } = await import("../src/lib/security");

const request = (headers: Record<string, string>) => new Request("https://example.test/api/public/check-in", { headers });

describe("client IP for rate limiting", () => {
  it("ignores spoofable forwarding headers unless a trusted header is configured", () => {
    expect(requestIp(request({ "x-forwarded-for": "1.2.3.4" }), "10.0.0.5", undefined)).toBe("10.0.0.5");
  });

  it("uses the proxy-appended entry of the trusted header", () => {
    expect(requestIp(request({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }), "10.0.0.5", "x-forwarded-for")).toBe("203.0.113.9");
    expect(requestIp(request({ "cf-connecting-ip": "198.51.100.7" }), "10.0.0.5", "CF-Connecting-IP")).toBe("198.51.100.7");
  });

  it("falls back to the socket address when the trusted header is missing", () => {
    expect(requestIp(request({}), "10.0.0.5", "cf-connecting-ip")).toBe("10.0.0.5");
  });
});
