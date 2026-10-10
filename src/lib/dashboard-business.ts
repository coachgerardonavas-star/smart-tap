// Only select a default when it is unambiguous. An unknown explicit slug must
// never silently switch the user to another business. Authorization remains
// in dashboardData and assertBusinessAccess.
export function selectDashboardBusiness<T extends { slug: string }>(
  businesses: T[], requestedSlug?: string | null,
): T | null {
  if (requestedSlug != null) return businesses.find((item) => item.slug === requestedSlug) ?? null;
  return businesses.length === 1 ? businesses[0]! : null;
}
