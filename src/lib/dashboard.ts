import type { Customer, DashboardCustomer, Visit } from "./types";

export type DashboardMetrics = {
  totalCustomers: number;
  totalVisits: number;
  repeatCustomers: number;
  inactiveCustomers: number;
  upcomingBirthdays: Customer[];
  customers: DashboardCustomer[];
};

function daysUntilBirthday(birthday: string, now: Date): number {
  const [, month, day] = birthday.split("-").map(Number);
  if (!month || !day) return Number.POSITIVE_INFINITY;
  const thisYear = Date.UTC(now.getUTCFullYear(), month - 1, day);
  const nextYear = Date.UTC(now.getUTCFullYear() + 1, month - 1, day);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const target = thisYear >= today ? thisYear : nextYear;
  return Math.floor((target - today) / 86_400_000);
}

export function buildDashboardMetrics(
  customers: Customer[],
  visits: Visit[],
  inactivityDays: number,
  now = new Date(),
): DashboardMetrics {
  const visitsByCustomer = new Map<string, number>();
  for (const visit of visits) {
    visitsByCustomer.set(visit.customer_id, (visitsByCustomer.get(visit.customer_id) ?? 0) + 1);
  }
  const inactiveBefore = now.getTime() - inactivityDays * 86_400_000;
  const decorated = customers
    .map((customer) => ({ ...customer, visitCount: visitsByCustomer.get(customer.id) ?? 0 }))
    .sort((a, b) => Date.parse(b.last_seen_at) - Date.parse(a.last_seen_at));

  return {
    totalCustomers: customers.length,
    totalVisits: visits.length,
    repeatCustomers: decorated.filter((customer) => customer.visitCount > 1).length,
    inactiveCustomers: customers.filter((customer) => Date.parse(customer.last_seen_at) < inactiveBefore).length,
    upcomingBirthdays: customers
      .filter((customer) => customer.birthday && daysUntilBirthday(customer.birthday, now) <= 30)
      .sort((a, b) => daysUntilBirthday(a.birthday!, now) - daysUntilBirthday(b.birthday!, now)),
    customers: decorated,
  };
}
