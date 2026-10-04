export type PageResult<T> = {
  data: T[] | null;
  error: unknown;
};

export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = 1000,
): Promise<T[]> {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new Error("invalid_page_size");

  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const result = await fetchPage(from, from + pageSize - 1);
    if (result.error) throw result.error;
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

export function customerExportIsAvailable(cancelledAt: string | null, now = new Date()): boolean {
  if (!cancelledAt) return true;
  const cancelledTime = Date.parse(cancelledAt);
  if (!Number.isFinite(cancelledTime)) return false;
  return now.getTime() <= cancelledTime + 30 * 86_400_000;
}
