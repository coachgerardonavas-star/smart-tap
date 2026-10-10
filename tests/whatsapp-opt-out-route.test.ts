import { readFileSync } from "node:fs";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(), authorize: vi.fn(), terms: vi.fn(), from: vi.fn(), rpc: vi.fn(),
}));
vi.mock("../src/lib/auth", () => ({ requireDataAccess: mocks.auth, assertBusinessAccess: mocks.authorize }));
vi.mock("../src/lib/terms-access", () => ({ assertCurrentTermsAccepted: mocks.terms }));
vi.mock("../src/lib/supabase", () => ({ createSupabaseServiceClient: () => ({ from: mocks.from, rpc: mocks.rpc }) }));
import { POST } from "../src/pages/api/dashboard/customer/[id]/whatsapp-opt-out";

const businessId = "10000000-0000-4000-8000-000000000001";
const customerId = "30000000-0000-4000-8000-000000000001";
function context(confirmation?: string) {
  const form = new FormData(); form.set("businessId", businessId);
  if (confirmation !== undefined) form.set("confirmOptOut", confirmation);
  return {
    request: new Request("https://smart-tap.test/api/dashboard/customer/" + customerId + "/whatsapp-opt-out", { method: "POST", body: form }),
    cookies: {}, params: { id: customerId },
    redirect: (url: string, status: number) => new Response(null, { status, headers: { location: url } }),
  } as unknown as Parameters<typeof POST>[0];
}
function setup(customer: { id: string; whatsapp_opt_in: boolean } | null = { id: customerId, whatsapp_opt_in: true }) {
  const filters: Array<[string, string, unknown]> = [];
  mocks.from.mockImplementation((table: string) => {
    const chain = {
      select: () => chain,
      eq: (key: string, value: unknown) => { filters.push([table, key, value]); return chain; },
      maybeSingle: async () => ({ data: table === "customers" ? customer : { slug: "business-a" }, error: null }),
    };
    return chain;
  });
  return filters;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ id: "actor" });
  mocks.authorize.mockResolvedValue({ role: "owner" });
  mocks.terms.mockResolvedValue(undefined);
  mocks.rpc.mockResolvedValue({ error: null });
});
describe("WhatsApp opt-out needs an explicit confirmation", () => {
  it.each([undefined, "", "no", "true"])("rejects unconfirmed submission %s without a write", async (value) => {
    const response = await POST(context(value));
    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("records a confirmed opt-out only for the scoped customer and preserves the business", async () => {
    const filters = setup();
    const response = await POST(context("yes"));
    expect(mocks.authorize).toHaveBeenCalledWith({ id: "actor" }, businessId, false);
    expect(mocks.terms).toHaveBeenCalledWith({ id: "actor" }, businessId);
    expect(filters).toContainEqual(["customers", "business_id", businessId]);
    expect(filters).toContainEqual(["customers", "id", customerId]);
    expect(mocks.rpc).toHaveBeenCalledWith("record_whatsapp_opt_out", expect.objectContaining({ p_business_id: businessId, p_customer_id: customerId, p_actor_user_id: "actor" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/dashboard?business=business-a");
  });
  it("does not write when the customer belongs to another tenant", async () => {
    setup(null);
    expect((await POST(context("yes"))).status).toBe(404);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not write twice when the customer is already opted out", async () => {
    setup({ id: customerId, whatsapp_opt_in: false });
    expect((await POST(context("yes"))).status).toBe(303);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each(["authentication", "viewer", "other tenant", "terms"])("does not write when %s is denied", async (reason) => {
    setup();
    const failure = new Error(reason);
    if (reason === "authentication") mocks.auth.mockRejectedValue(failure);
    else if (reason === "terms") mocks.terms.mockRejectedValue(failure);
    else mocks.authorize.mockRejectedValue(failure);
    await expect(POST(context("yes"))).rejects.toBe(failure);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("reports a failed database write without a success redirect", async () => {
    setup(); mocks.rpc.mockResolvedValue({ error: { code: "test_failure" } });
    expect((await POST(context("yes"))).status).toBe(500);
  });
  it("uses a separate read-only screen with an unchecked required box", () => {
    const page = readFileSync("src/pages/dashboard/customer/[id]/whatsapp-opt-out.astro", "utf8");
    expect(page).toContain('name="confirmOptOut" value="yes" required');
    expect(page).not.toMatch(/\bchecked(?:\s|[=>])/);
    expect(page).not.toContain(".rpc(");
    expect(page).toContain("assertBusinessAccess(identity, businessId, false)");
    const dashboard = readFileSync("src/pages/dashboard/index.astro", "utf8");
    expect(dashboard).not.toContain('action={`/api/dashboard/customer/${customer.id}/whatsapp-opt-out`}');
  });
});
