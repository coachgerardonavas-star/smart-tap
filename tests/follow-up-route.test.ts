import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { AuthorizationError, assertBusinessAccess, type AuthIdentity } from "../src/lib/auth";
import { executeFollowUpAction, FollowUpActionError } from "../src/lib/follow-up-handler";
import type { FollowUpCustomer } from "../src/lib/follow-up";
import type { Visit } from "../src/lib/types";

vi.mock("astro:env/server", () => ({ getSecret: () => undefined }));

const identity: AuthIdentity = { id: "40000000-0000-4000-8000-000000000001", email: "owner@example.test", isPlatformAdmin: false, aal: "aal1" };
const now = new Date("2026-10-04T12:00:00Z");
const baseCustomer: FollowUpCustomer = {
  id: "30000000-0000-4000-8000-000000000001",
  business_id: "10000000-0000-4000-8000-000000000001",
  full_name: "Ana Torres",
  phone_e164: "+13055550103",
  birthday: null,
  consent_current: true,
  consent_at: "2026-10-03T12:00:00Z",
  whatsapp_opt_in: true,
  whatsapp_opt_in_at: "2026-10-03T12:00:00Z",
  whatsapp_opted_out_at: null,
  created_at: "2026-10-03T12:00:00Z",
  updated_at: "2026-10-03T12:00:00Z",
  last_seen_at: "2026-10-03T12:00:00Z",
};
const visit: Visit = { id: "50000000-0000-4000-8000-000000000001", business_id: baseCustomer.business_id, customer_id: baseCustomer.id, tag_id: null, source: "nfc", untagged: true, visited_at: baseCustomer.last_seen_at };
type TestBusiness = {
  id: string;
  slug: string;
  display_name: string;
  timezone: string;
  inactivity_days: number;
  offer_inactive: string | null;
  offer_birthday: string | null;
  offer_frequent: string | null;
  offer_new: string | null;
};
const baseBusiness: TestBusiness = {
  id: baseCustomer.business_id,
  slug: "cafe-luna",
  display_name: "Café Luna",
  timezone: "America/New_York",
  inactivity_days: 30,
  offer_inactive: null,
  offer_birthday: null,
  offer_frequent: null,
  offer_new: null,
};

function dependencies(options: { customer?: FollowUpCustomer | null; visits?: Visit[]; count?: number; authorize?: () => Promise<unknown>; business?: TestBusiness } = {}) {
  const actions = new Map<string, unknown>();
  const recordAction = vi.fn(async (action: { business_id: string; customer_id: string; kind: string; period_key: string }) => {
    actions.set(`${action.business_id}:${action.customer_id}:${action.kind}:${action.period_key}`, action);
  });
  return {
    actions,
    recordAction,
    value: {
      authorize: options.authorize ?? (async () => ({ role: "owner" })),
      now,
      store: {
        async getBusiness() { return options.business ?? baseBusiness; },
        async getCustomer() { return options.customer === undefined ? baseCustomer : options.customer; },
        async getVisits() { return options.visits ?? [visit]; },
        async getVisitCount() { return options.count ?? 1; },
        recordAction,
      },
    },
  };
}

describe("follow-up action route policy", () => {
  it.each(["viewer", "other-business"])("returns 403 when authorization rejects %s", async () => {
    const deps = dependencies({ authorize: async () => { throw new AuthorizationError(403); } });
    await expect(executeFollowUpAction(identity, {
      businessId: baseCustomer.business_id, customerId: baseCustomer.id, kind: "new", action: "contact",
    }, deps.value)).rejects.toMatchObject({ status: 403 });
    expect(deps.recordAction).not.toHaveBeenCalled();
  });

  it("returns 404 for a customer outside the authorized business", async () => {
    const deps = dependencies({ customer: null });
    await expect(executeFollowUpAction(identity, {
      businessId: baseCustomer.business_id, customerId: "30000000-0000-4000-8000-000000000099", kind: "new", action: "contact",
    }, deps.value)).rejects.toEqual(expect.objectContaining<Partial<FollowUpActionError>>({ status: 404 }));
  });

  it("rejects contact without WhatsApp opt-in", async () => {
    const deps = dependencies({ customer: { ...baseCustomer, whatsapp_opt_in: false, whatsapp_opt_in_at: null } });
    await expect(executeFollowUpAction(identity, {
      businessId: baseCustomer.business_id, customerId: baseCustomer.id, kind: "new", action: "contact",
    }, deps.value)).rejects.toMatchObject({ status: 409 });
  });

  it("rejects an opportunity that no longer applies", async () => {
    const stale = { ...baseCustomer, last_seen_at: "2026-09-20T12:00:00Z" };
    const deps = dependencies({ customer: stale, visits: [visit], count: 2 });
    await expect(executeFollowUpAction(identity, {
      businessId: baseCustomer.business_id, customerId: baseCustomer.id, kind: "new", action: "contact",
    }, deps.value)).rejects.toMatchObject({ status: 409 });
  });

  it("creates one action on repeated clicks and redirects with server-built content", async () => {
    const deps = dependencies();
    const input = { businessId: baseCustomer.business_id, customerId: baseCustomer.id, kind: "new" as const, action: "contact" as const };
    const first = await executeFollowUpAction(identity, input, deps.value);
    const second = await executeFollowUpAction(identity, input, deps.value);
    expect(deps.actions.size).toBe(1);
    expect(deps.recordAction).toHaveBeenCalledTimes(2);
    expect(first).toEqual(second);
    const url = new URL(first.redirectUrl);
    expect(url.hostname).toBe("wa.me");
    expect(url.pathname).toBe("/13055550103");
    expect(url.searchParams.get("text")).toContain("Café Luna");
    expect(first.redirectUrl).not.toContain(" ");
    expect(first.redirectUrl).toContain("%C3%A9");
    expect(Object.keys(input)).not.toContain("phone");
    expect(Object.keys(input)).not.toContain("message");
  });

  it("uses only the offer loaded for the authorized business", async () => {
    const deps = dependencies({ business: { ...baseBusiness, offer_new: "Recibe un café gratis." } });
    const result = await executeFollowUpAction(identity, {
      businessId: baseCustomer.business_id, customerId: baseCustomer.id, kind: "new", action: "contact",
    }, deps.value);
    const message = new URL(result.redirectUrl).searchParams.get("text");
    expect(message).toContain("Recibe un café gratis.");
    expect(message).not.toContain("Oferta del otro negocio");
  });

  it("redirects dismiss to the server-loaded business slug", async () => {
    const deps = dependencies();
    await expect(executeFollowUpAction(identity, {
      businessId: baseCustomer.business_id, customerId: baseCustomer.id, kind: "new", action: "dismiss",
    }, deps.value)).resolves.toEqual({ redirectUrl: "/dashboard?business=cafe-luna" });
  });

  it("rejects an aal1 platform admin through the existing D-020 guard", async () => {
    const admin: AuthIdentity = { ...identity, isPlatformAdmin: true, aal: "aal1" };
    const deps = dependencies({ authorize: (async () => assertBusinessAccess(admin, baseCustomer.business_id, false)) });
    await expect(executeFollowUpAction(admin, {
      businessId: baseCustomer.business_id, customerId: baseCustomer.id, kind: "new", action: "contact",
    }, deps.value)).rejects.toMatchObject({ status: 403, reason: "mfa_required" });
  });

  it("keeps phone and message out of dashboard form fields and uses data guards", () => {
    const dashboard = readFileSync(join(process.cwd(), "src/pages/dashboard/index.astro"), "utf8");
    const route = readFileSync(join(process.cwd(), "src/pages/api/dashboard/follow-up.ts"), "utf8");
    expect(dashboard).not.toMatch(/name="(?:phone|message)"/);
    expect(dashboard).toContain("canManage && opportunity.customer.whatsapp_opt_in");
    expect(dashboard).toContain("customer.whatsapp_opt_in &&");
    expect(route).toContain("requireDataAccess(request, cookies)");
    expect(route).toContain("assertBusinessAccess(currentIdentity, businessId, false)");
    expect(route).toContain("offer_inactive,offer_birthday,offer_frequent,offer_new");
    expect(route).toContain("if (error instanceof AuthorizationError) throw error");
    expect(route).toContain("whatsappLaunchResponse(result.redirectUrl)");
    const optOutRoute = readFileSync(join(process.cwd(), "src/pages/api/dashboard/customer/[id]/whatsapp-opt-out.ts"), "utf8");
    expect(optOutRoute).toContain("requireDataAccess(request, cookies)");
    expect(optOutRoute).toContain("assertBusinessAccess(identity, businessId, false)");
    expect(optOutRoute).toContain('.eq("business_id", businessId).eq("id", customerId)');
  });
});
