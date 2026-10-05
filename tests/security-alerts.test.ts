import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  aggregateSecurityAlertEvents,
  buildSecurityAlertMessage,
  calculateSecurityAlertSince,
  filterSecurityAlertEvents,
  isSecurityAlertEvent,
  SECURITY_ALERT_MAX_LENGTH,
} from "../src/lib/security-alerts-core.mjs";
import { recordSecurityAuditOnce } from "../src/lib/security-alert-audit";
import { runSecurityAlerts } from "../scripts/security-alerts.mjs";

const createdAt = "2026-10-05T15:00:00.000Z";

function fakeSupabase(cursor: unknown, rows: unknown[], insertError: unknown = null) {
  let selectCall = 0;
  const inserts: unknown[] = [];
  const sinceValues: string[] = [];
  return {
    inserts,
    sinceValues,
    client: {
      from() {
        return {
          select() {
            selectCall += 1;
            if (selectCall === 1) {
              const cursorQuery = {
                eq: () => cursorQuery,
                order: () => cursorQuery,
                limit: () => cursorQuery,
                maybeSingle: async () => ({ data: cursor, error: null }),
              };
              return cursorQuery;
            }
            const eventQuery = {
              in: () => eventQuery,
              gt: (_column: string, value: string) => { sinceValues.push(value); return eventQuery; },
              order: () => eventQuery,
              limit: async () => ({ data: rows, error: null }),
            };
            return eventQuery;
          },
          async insert(value: unknown) {
            inserts.push(value);
            return { error: insertError };
          },
        };
      },
    },
  };
}

describe("GS-49 security alert core", () => {
  it("includes every approved action and filters business.updated by is_active", () => {
    const included = [
      "security.auth_rate_limit",
      "security.check_in_rate_limit",
      "platform_admin.promoted",
      "business.cancelled",
      "business.created",
      "business.customers_exported",
      "business.owner_approved",
      "business.term_extended",
      "customer.deleted",
      "member.invited",
      "member.activated",
      "member.deactivated",
      "nfc_tag.created",
      "nfc_tag.activated",
      "nfc_tag.deactivated",
    ];
    for (const action of included) expect(isSecurityAlertEvent({ action })).toBe(true);
    expect(isSecurityAlertEvent({ action: "business.updated", details: { changedFields: ["is_active"] } })).toBe(true);
    expect(isSecurityAlertEvent({ action: "business.updated", details: { changedFields: ["tagline"] } })).toBe(false);
    expect(isSecurityAlertEvent({ action: "alerts.digest_sent" })).toBe(false);
    expect(isSecurityAlertEvent({ action: "terms.signed" })).toBe(false);
  });

  it("filters and aggregates counts by action", () => {
    const events = filterSecurityAlertEvents([
      { action: "customer.deleted" },
      { action: "customer.deleted" },
      { action: "nfc_tag.created" },
      { action: "terms.signed" },
    ]);
    expect(aggregateSecurityAlertEvents(events)).toEqual([
      { action: "customer.deleted", count: 2 },
      { action: "nfc_tag.created", count: 1 },
    ]);
  });

  it("builds a count-only message even when details contain PII", () => {
    const message = buildSecurityAlertMessage([{
      action: "security.auth_rate_limit",
      created_at: createdAt,
      details: { email: "private@example.test", phone: "+13055550101", ip: "203.0.113.2" },
    }]);
    expect(message).toContain("security.auth_rate_limit: 1");
    expect(message).not.toMatch(/private@example|13055550101|203\.0\.113\.2/);
  });

  it("uses the prior successful cursor and falls back to 20 minutes", () => {
    expect(calculateSecurityAlertSince({ details: { until: createdAt } }, Date.parse("2026-10-05T16:00:00Z"))).toBe(createdAt);
    expect(calculateSecurityAlertSince(null, Date.parse("2026-10-05T16:00:00Z"))).toBe("2026-10-05T15:40:00.000Z");
    expect(calculateSecurityAlertSince({ details: { until: "invalid" } }, Date.parse("2026-10-05T16:00:00Z"))).toBe("2026-10-05T15:40:00.000Z");
  });

  it("marks a full page as 1000+ and caps messages at 3500 characters", () => {
    expect(buildSecurityAlertMessage([{ action: "customer.deleted" }], true)).toContain("1000+");
    const many = Array.from({ length: 100 }, (_, index) => ({ action: `security.${index}.${"a".repeat(100)}` }));
    const message = buildSecurityAlertMessage(many, true);
    expect(message.length).toBe(SECURITY_ALERT_MAX_LENGTH);
    expect(message.endsWith("… resumen truncado")).toBe(true);
  });
});

describe("GS-49 security alert runner", () => {
  it("does not write the cursor when Telegram fails", async () => {
    const db = fakeSupabase(null, [{ action: "customer.deleted", created_at: createdAt }]);
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("", { status: 503 }));
    await expect(runSecurityAlerts({
      supabase: db.client,
      telegramToken: "fake-bot-token",
      telegramChatId: "fake-chat-id",
      fetchImpl,
      now: Date.parse("2026-10-05T16:00:00Z"),
      log: vi.fn(),
    })).rejects.toThrow("Telegram delivery failed: HTTP 503");
    expect(db.inserts).toEqual([]);
  });

  it("writes the last sent event as the cursor only after delivery", async () => {
    const db = fakeSupabase(
      { details: { until: "2026-10-05T14:00:00.000Z" } },
      [
        { action: "customer.deleted", created_at: "2026-10-05T14:30:00.000Z" },
        { action: "nfc_tag.created", created_at: createdAt },
      ],
    );
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("", { status: 200 }));
    const result = await runSecurityAlerts({
      supabase: db.client,
      telegramToken: "fake-bot-token",
      telegramChatId: "fake-chat-id",
      fetchImpl,
      log: vi.fn(),
    });
    expect(result).toMatchObject({ sent: true, count: 2, until: createdAt });
    expect(db.sinceValues).toEqual(["2026-10-05T14:00:00.000Z"]);
    expect(db.inserts).toEqual([{
      actor_user_id: null,
      business_id: null,
      action: "alerts.digest_sent",
      entity_type: "system",
      entity_id: null,
      details: { until: createdAt, count: 2 },
    }]);
  });

  it("marks a 1,000-row page and stops the cursor at its last row", async () => {
    const rows = Array.from({ length: 1_000 }, () => ({ action: "customer.deleted", created_at: createdAt }));
    const db = fakeSupabase(null, rows);
    const fetchImpl = vi.fn<typeof fetch>(async () => new Response("", { status: 200 }));
    const result = await runSecurityAlerts({
      supabase: db.client,
      telegramToken: "fake-bot-token",
      telegramChatId: "fake-chat-id",
      fetchImpl,
      log: vi.fn(),
    });
    const [, request] = fetchImpl.mock.calls[0] ?? [];
    const payload = JSON.parse(String(request?.body)) as { text: string };
    expect(payload.text).toContain("1000+");
    expect(result).toMatchObject({ count: 1_000, until: createdAt, limitReached: true });
    expect(db.inserts[0]).toMatchObject({ details: { until: createdAt, count: 1_000 } });
  });
});

describe("recordSecurityAuditOnce", () => {
  it("respects cooldown and strips IP, email, phone and hash details", async () => {
    const insert = vi.fn(async (_value: unknown) => ({ error: null }));
    const service = { from: () => ({ insert }) };
    const event = {
      action: "security.auth_rate_limit" as const,
      entity_type: "auth" as const,
      details: {
        action: "login",
        ip: "203.0.113.2",
        email: "private@example.test",
        phone: "+13055550101",
        identifier_hash: "a".repeat(64),
      },
    };
    expect(await recordSecurityAuditOnce(service as never, "test-cooldown", event, 1_000)).toBe(true);
    expect(await recordSecurityAuditOnce(service as never, "test-cooldown", event, 1_001)).toBe(false);
    expect(insert).toHaveBeenCalledTimes(1);
    const written = insert.mock.calls[0]?.[0];
    expect(written).toMatchObject({ details: { action: "login" } });
    expect(JSON.stringify(written)).not.toMatch(/203\.0\.113\.2|private@example|13055550101|a{64}/);
  });

  it("releases the cooldown key when insertion fails", async () => {
    const insert = vi.fn()
      .mockResolvedValueOnce({ error: { code: "test_error" } })
      .mockResolvedValueOnce({ error: null });
    const service = { from: () => ({ insert }) };
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const event = { action: "security.check_in_rate_limit" as const, entity_type: "business" as const };
    expect(await recordSecurityAuditOnce(service as never, "test-release", event, 2_000)).toBe(false);
    expect(await recordSecurityAuditOnce(service as never, "test-release", event, 2_001)).toBe(true);
    expect(insert).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });
});

describe("GS-49 Render schedule", () => {
  it("declares the approved 15-minute Cron Job with runtime-only secrets", () => {
    const blueprint = readFileSync(join(process.cwd(), "render.yaml"), "utf8");
    expect(blueprint).toContain("type: cron");
    expect(blueprint).toContain("name: smart-tap-security-alerts");
    expect(blueprint).toContain('schedule: "*/15 * * * *"');
    expect(blueprint).toContain("plan: starter");
    expect(blueprint).toContain("buildCommand: npm ci");
    expect(blueprint).toContain("startCommand: node scripts/security-alerts.mjs");
    for (const key of ["PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID"]) {
      expect(blueprint).toMatch(new RegExp(`key: ${key}\\s+sync: false`));
    }
  });
});
