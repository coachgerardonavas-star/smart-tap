import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("GS-49 security alerts", () => {
  it("records auth and check-in rate-limit hits without storing raw identifiers", () => {
    const auth = source("src/lib/auth-rate-limit.ts");
    const checkIn = source("src/pages/api/public/check-in.ts");
    expect(auth).toContain('action: "security.auth_rate_limit"');
    expect(checkIn).toContain('action: "security.check_in_rate_limit"');
    expect(auth).not.toContain("normalizedEmail,");
    expect(checkIn).not.toContain("details: { ip");
    expect(checkIn).not.toContain("details: { phone");
  });

  it("audits bootstrap platform-admin promotion", () => {
    const auth = source("src/lib/auth.ts");
    expect(auth).toContain('action: "platform_admin.promoted"');
    expect(auth).toContain('details: { source: "bootstrap" }');
  });

  it("sends only aggregated security event counts to Telegram", () => {
    const runner = source("scripts/security-alerts.mjs");
    expect(runner).toContain('required("TELEGRAM_BOT_TOKEN")');
    expect(runner).toContain('required("TELEGRAM_CHAT_ID")');
    expect(runner).toContain('row.action.startsWith("security.")');
    expect(runner).toContain('row.action.startsWith("platform_admin.")');
    expect(runner).toContain("counts.set(event.action");
    expect(runner).not.toContain("phone_e164");
    expect(runner).not.toContain("full_name");
  });
});
