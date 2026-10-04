import { describe, expect, it } from "vitest";
import { buildDashboardMetrics } from "../src/lib/dashboard";
import type { Customer, Visit } from "../src/lib/types";

const now = new Date("2026-10-01T12:00:00Z");
const baseCustomer = { business_id: "business-a", phone_e164: "+13055550101", consent_current: true, consent_at: "2026-01-01T00:00:00Z", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-09-01T00:00:00Z", whatsapp_opt_in: false, whatsapp_opt_in_at: null };

describe("dashboard metrics", () => {
  it("counts visits, repeat clients, inactivity and birthdays", () => {
    const customers: Customer[] = [
      { ...baseCustomer, id: "customer-1", full_name: "Elena", birthday: "1992-10-15", last_seen_at: "2026-09-29T00:00:00Z" },
      { ...baseCustomer, id: "customer-2", full_name: "Marco", birthday: "1987-03-01", last_seen_at: "2026-07-01T00:00:00Z" },
    ];
    const visits: Visit[] = [
      { id: "visit-1", business_id: "business-a", customer_id: "customer-1", tag_id: null, source: "nfc", visited_at: "2026-09-20T00:00:00Z" },
      { id: "visit-2", business_id: "business-a", customer_id: "customer-1", tag_id: null, source: "nfc", visited_at: "2026-09-29T00:00:00Z" },
      { id: "visit-3", business_id: "business-a", customer_id: "customer-2", tag_id: null, source: "manual", visited_at: "2026-07-01T00:00:00Z" },
    ];
    const metrics = buildDashboardMetrics(customers, visits, 45, now);
    expect(metrics.totalCustomers).toBe(2);
    expect(metrics.totalVisits).toBe(3);
    expect(metrics.repeatCustomers).toBe(1);
    expect(metrics.inactiveCustomers).toBe(1);
    expect(metrics.upcomingBirthdays.map((customer) => customer.id)).toEqual(["customer-1"]);
    expect(metrics.customers[0]?.visitCount).toBe(2);
  });
});
