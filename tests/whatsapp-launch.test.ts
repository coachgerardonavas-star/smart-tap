import { describe, expect, it } from "vitest";
import { whatsappLaunchResponse } from "../src/lib/whatsapp-launch";

describe("WhatsApp mobile launch response", () => {
  it("returns same-origin HTML that launches wa.me client-side with a visible fallback", async () => {
    const url = "https://wa.me/13055550103?text=Hola%20Sof%C3%ADa";
    const response = whatsappLaunchResponse(url);
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(html).toContain(`href="${url}"`);
    expect(html).toContain("window.location.replace");
    expect(html).toContain("Abrir WhatsApp");
  });

  it.each(["https://example.com", "http://wa.me/13055550103", "https://evil.wa.me.example/13055550103"])(
    "rejects an untrusted launch destination %s",
    (url) => expect(() => whatsappLaunchResponse(url)).toThrow("Invalid WhatsApp launch URL"),
  );
});
