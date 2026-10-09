// D-057 shows "Esta es tu visita número N" after a check-in. D-052 removed
// the count from the public response because anyone who knows a phone number
// could read that person's history. The count is therefore returned only when
// the submitted name matches the name already stored for that phone; a new
// customer always matches their own record.
export function normalizeCustomerName(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-US").replace(/\s+/g, " ").trim();
}

export type PublicCheckInResponse = { ok: true; businessName: string; visitCount?: number };

export function publicCheckInResponse(rpcResult: unknown, submittedName: string, businessName: string): PublicCheckInResponse {
  const response: PublicCheckInResponse = { ok: true, businessName };
  if (!rpcResult || typeof rpcResult !== "object") return response;
  const { customerName, visitCount } = rpcResult as { customerName?: unknown; visitCount?: unknown };
  const count = Number(visitCount);
  if (typeof customerName !== "string" || !Number.isInteger(count) || count < 1) return response;
  if (normalizeCustomerName(customerName) !== normalizeCustomerName(submittedName)) return response;
  return { ...response, visitCount: count };
}
