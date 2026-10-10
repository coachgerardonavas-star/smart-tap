export type ContractOverview = {
  state: "cancelled" | "missing" | "expired" | "due-soon" | "current";
  label: string;
};

// The contract end is not a Stripe billing date; an extension needs separate approval.
export function contractOverview(termEndsAt: string | null, cancelledAt: string | null, now = new Date()): ContractOverview {
  if (cancelledAt) return { state: "cancelled", label: "Servicio cancelado" };
  if (!termEndsAt) return { state: "missing", label: "Sin período contractual registrado" };
  const expiry = Date.parse(termEndsAt);
  if (!Number.isFinite(expiry)) return { state: "missing", label: "Fecha contractual no disponible" };
  const left = expiry - now.getTime();
  if (left < 0) return { state: "expired", label: "Período vencido" };
  if (left <= 15 * 86_400_000) return { state: "due-soon", label: "Por vencer · revisar renovación" };
  return { state: "current", label: "Período vigente" };
}
