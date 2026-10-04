import { describe, expect, it } from "vitest";
import { buildFollowUpOpportunities, buildWhatsAppUrl, type FollowUpCustomer } from "../src/lib/follow-up";
import type { Visit } from "../src/lib/types";

const business = { businessName: "Café Luna", timezone: "America/New_York", inactivityDays: 30 };
const now = new Date("2026-10-04T03:30:00Z"); // Oct 3 at 11:30 p.m. in New York.

function customer(overrides: Partial<FollowUpCustomer> = {}): FollowUpCustomer {
  return {
    id: "30000000-0000-4000-8000-000000000010",
    business_id: "10000000-0000-4000-8000-000000000001",
    full_name: "Elena García",
    phone_e164: "+13055550101",
    birthday: null,
    consent_current: true,
    consent_at: "2026-01-01T00:00:00Z",
    whatsapp_opt_in: true,
    whatsapp_opt_in_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    last_seen_at: "2026-10-01T16:00:00Z",
    ...overrides,
  };
}

function visit(id: string, customerId: string, visitedAt: string): Visit {
  return { id, business_id: "10000000-0000-4000-8000-000000000001", customer_id: customerId, tag_id: null, source: "nfc", visited_at: visitedAt };
}

describe("follow-up opportunity rules", () => {
  it("includes inactivity at 30 local calendar days and excludes day 29", () => {
    const atBoundary = customer({ id: "inactive-30", last_seen_at: "2026-09-03T16:00:00Z" });
    const beforeBoundary = customer({ id: "inactive-29", last_seen_at: "2026-09-04T16:00:00Z" });
    const result = buildFollowUpOpportunities({
      ...business,
      now,
      customers: [atBoundary, beforeBoundary],
      visits: [],
      visitCounts: { "inactive-30": 2, "inactive-29": 2 },
    });
    expect(result.filter((item) => item.kind === "inactive").map((item) => item.customer.id)).toEqual(["inactive-30"]);
    expect(result.find((item) => item.kind === "inactive")?.periodKey).toBe("2026-09-03");
  });

  it("uses the business time zone for birthday edges", () => {
    const birthdayCustomer = customer({ id: "birthday", birthday: "1990-10-04" });
    const [result] = buildFollowUpOpportunities({
      ...business,
      now,
      customers: [birthdayCustomer],
      visits: [],
      visitCounts: { birthday: 2 },
    }).filter((item) => item.kind === "birthday");
    expect(result).toMatchObject({ periodKey: "2026", reason: "Cumple el 4 oct" });
  });

  it("counts four visits in the last 30 local days and excludes day 30", () => {
    const frequent = customer({ id: "frequent" });
    const visits = [
      visit("v1", frequent.id, "2026-10-03T18:00:00Z"),
      visit("v2", frequent.id, "2026-10-02T18:00:00Z"),
      visit("v3", frequent.id, "2026-09-04T18:00:00Z"),
      visit("v4", frequent.id, "2026-09-04T20:00:00Z"),
      visit("v5", frequent.id, "2026-09-03T18:00:00Z"),
    ];
    const result = buildFollowUpOpportunities({ ...business, now, customers: [frequent], visits, visitCounts: { frequent: 5 } });
    expect(result.find((item) => item.kind === "frequent")).toMatchObject({
      periodKey: "2026-10",
      reason: "4 visitas en los últimos 30 días",
    });
  });

  it("detects one first visit in three days and removes handled cycles", () => {
    const first = customer({ id: "new", last_seen_at: "2026-09-30T18:00:00Z" });
    const visits = [visit("new-visit", first.id, first.last_seen_at)];
    const active = buildFollowUpOpportunities({ ...business, now, customers: [first], visits, visitCounts: { new: 1 } });
    expect(active.find((item) => item.kind === "new")?.periodKey).toBe("first");
    const handled = buildFollowUpOpportunities({
      ...business,
      now,
      customers: [first],
      visits,
      visitCounts: { new: 1 },
      actions: [{ customer_id: first.id, kind: "new", period_key: "first" }],
    });
    expect(handled.some((item) => item.kind === "new")).toBe(false);
  });

  it("builds the suggested message with the first name and opt-out sentence", () => {
    const first = customer({ id: "message", full_name: "Elena María García", last_seen_at: "2026-10-03T18:00:00Z" });
    const opportunity = buildFollowUpOpportunities({
      ...business,
      now,
      customers: [first],
      visits: [visit("message-visit", first.id, first.last_seen_at)],
      visitCounts: { message: 1 },
    }).find((item) => item.kind === "new");
    expect(opportunity?.message).toBe("¡Gracias por tu primera visita a Café Luna, Elena! Esperamos verte pronto. Si prefieres no recibir mensajes, responde BAJA.");
    const url = buildWhatsAppUrl(first.phone_e164, opportunity!.message);
    expect(url).toMatch(/^https:\/\/wa\.me\/13055550101\?text=/);
    expect(decodeURIComponent(new URL(url).searchParams.get("text")!)).toBe(opportunity?.message);
  });
});
