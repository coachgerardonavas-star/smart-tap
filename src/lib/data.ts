import { assertBusinessAccess, enforcePlatformAdminMfa, type AuthIdentity } from "./auth";
import { buildFollowUpOpportunities, type FollowUpActionRecord, type FollowUpCustomer } from "./follow-up";
import { createSupabaseServiceClient } from "./supabase";
import { assertCurrentTermsAccepted } from "./terms-access";
import type { Business, Customer, Visit } from "./types";

export async function accessibleBusinesses(identity: AuthIdentity): Promise<Business[]> {
  const service = createSupabaseServiceClient();
  if (identity.isPlatformAdmin) {
    enforcePlatformAdminMfa(identity);
    const { data, error } = await service.from("businesses").select("*").order("display_name");
    if (error) throw error;
    return (data ?? []) as Business[];
  }

  const { data: memberships, error: membershipError } = await service
    .from("business_members")
    .select("business_id")
    .eq("user_id", identity.id)
    .eq("is_active", true);
  if (membershipError) throw membershipError;
  const ids = (memberships ?? []).map((row) => row.business_id);
  if (!ids.length) return [];
  const { data, error } = await service.from("businesses").select("*").in("id", ids).eq("is_active", true).order("display_name");
  if (error) throw error;
  return (data ?? []) as Business[];
}

export async function dashboardData(identity: AuthIdentity, requestedSlug?: string | null) {
  const businesses = await accessibleBusinesses(identity);
  const business = businesses.find((item) => item.slug === requestedSlug) ?? businesses[0] ?? null;
  if (!business) return { businesses, business: null, metrics: null };
  await assertBusinessAccess(identity, business.id);
  await assertCurrentTermsAccepted(identity, business.id);

  const service = createSupabaseServiceClient();
  const now = new Date();
  const inactiveBefore = new Date(now.getTime() - business.inactivity_days * 86_400_000).toISOString();
  const recentVisitCutoff = new Date(now.getTime() - 31 * 86_400_000).toISOString();
  const [
    customersResult,
    queueCustomersResult,
    customerCountResult,
    visitCountResult,
    inactiveCountResult,
    repeatResult,
    countsResult,
    recentVisitsResult,
    followUpsResult,
  ] = await Promise.all([
    service.from("customers").select("*").eq("business_id", business.id).order("last_seen_at", { ascending: false }).limit(250),
    service.from("customers").select("*").eq("business_id", business.id).order("last_seen_at", { ascending: false }).limit(1000),
    service.from("customers").select("id", { count: "exact", head: true }).eq("business_id", business.id),
    service.from("visits").select("id", { count: "exact", head: true }).eq("business_id", business.id),
    service.from("customers").select("id", { count: "exact", head: true }).eq("business_id", business.id).lt("last_seen_at", inactiveBefore),
    service.from("customer_visit_counts").select("customer_id", { count: "exact", head: true }).eq("business_id", business.id).gt("visit_count", 1),
    service.from("customer_visit_counts").select("customer_id,visit_count").eq("business_id", business.id).limit(1000),
    service.from("visits").select("*").eq("business_id", business.id).gte("visited_at", recentVisitCutoff).limit(10000),
    service.from("follow_ups").select("customer_id,kind,period_key").eq("business_id", business.id).limit(5000),
  ]);

  const results = [
    customersResult,
    queueCustomersResult,
    customerCountResult,
    visitCountResult,
    inactiveCountResult,
    repeatResult,
    countsResult,
    recentVisitsResult,
    followUpsResult,
  ];
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) throw firstError;

  const customers = (customersResult.data ?? []) as FollowUpCustomer[];
  const queueCustomers = (queueCustomersResult.data ?? []) as FollowUpCustomer[];
  const counts = new Map((countsResult.data ?? []).map((row) => [row.customer_id, Number(row.visit_count)]));
  const visitCounts = Object.fromEntries([...counts.entries()]);
  const followUps = buildFollowUpOpportunities({
    customers: queueCustomers,
    visits: (recentVisitsResult.data ?? []) as Visit[],
    actions: (followUpsResult.data ?? []) as FollowUpActionRecord[],
    visitCounts,
    businessName: business.display_name,
    timezone: business.timezone,
    inactivityDays: business.inactivity_days,
    now,
    offers: {
      inactive: business.offer_inactive,
      birthday: business.offer_birthday,
      frequent: business.offer_frequent,
      new: business.offer_new,
    },
  });

  function daysUntilBirthday(birthday: string): number {
    const [, month, day] = birthday.split("-").map(Number);
    if (!month || !day) return Number.POSITIVE_INFINITY;
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const current = Date.UTC(now.getUTCFullYear(), month - 1, day);
    const target = current >= today ? current : Date.UTC(now.getUTCFullYear() + 1, month - 1, day);
    return Math.floor((target - today) / 86_400_000);
  }
  const upcomingBirthdays = queueCustomers
    .filter((customer) => customer.birthday && daysUntilBirthday(customer.birthday) <= 30)
    .sort((a, b) => daysUntilBirthday(a.birthday!) - daysUntilBirthday(b.birthday!));

  return {
    businesses,
    business,
    metrics: {
      totalCustomers: customerCountResult.count ?? 0,
      totalVisits: visitCountResult.count ?? 0,
      inactiveCustomers: inactiveCountResult.count ?? 0,
      repeatCustomers: repeatResult.count ?? 0,
      upcomingBirthdays: upcomingBirthdays as Customer[],
      followUps,
      customers: customers.map((customer) => ({ ...customer, visitCount: counts.get(customer.id) ?? 0 })),
    },
  };
}
