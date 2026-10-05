export const SECURITY_ALERT_LIMIT = 1_000;
export const SECURITY_ALERT_MAX_LENGTH = 3_500;
export const SECURITY_ALERT_FALLBACK_MINUTES = 20;

const ALWAYS_INCLUDED_ACTIONS = new Set([
  "business.cancelled",
  "business.created",
  "business.customers_exported",
  "business.owner_approved",
  "business.term_extended",
  "customer.deleted",
  "member.activated",
  "member.deactivated",
  "member.invited",
  "nfc_tag.activated",
  "nfc_tag.created",
  "nfc_tag.deactivated",
  "platform_admin.promoted",
  "security.auth_rate_limit",
  "security.check_in_rate_limit",
]);

export const SECURITY_ALERT_QUERY_ACTIONS = [...ALWAYS_INCLUDED_ACTIONS, "business.updated"];

function validDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function calculateSecurityAlertSince(cursorRow, now = Date.now()) {
  const until = cursorRow?.details?.until;
  if (validDate(until)) return new Date(until).toISOString();
  return new Date(now - SECURITY_ALERT_FALLBACK_MINUTES * 60_000).toISOString();
}

export function isSecurityAlertEvent(row) {
  if (!row || typeof row.action !== "string" || row.action === "alerts.digest_sent") return false;
  if (ALWAYS_INCLUDED_ACTIONS.has(row.action)) return true;
  if (row.action === "business.updated") {
    const changedFields = Array.isArray(row.details?.changedFields) ? row.details.changedFields : [];
    return changedFields.includes("is_active");
  }
  return false;
}

export function filterSecurityAlertEvents(rows) {
  return Array.isArray(rows) ? rows.filter(isSecurityAlertEvent) : [];
}

export function aggregateSecurityAlertEvents(events) {
  const counts = new Map();
  for (const event of events) counts.set(event.action, (counts.get(event.action) || 0) + 1);
  return [...counts.entries()]
    .map(([action, count]) => ({ action, count }))
    .sort((left, right) => left.action.localeCompare(right.action));
}

export function lastSecurityAlertTimestamp(events) {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    if (validDate(events[index]?.created_at)) return new Date(events[index].created_at).toISOString();
  }
  return null;
}

export function buildSecurityAlertMessage(events, limitReached = false) {
  const aggregates = aggregateSecurityAlertEvents(events);
  const lines = [
    "⚠️ Smart Tap — alerta de seguridad",
    ...aggregates.map(({ action, count }) => `• ${action}: ${count}`),
  ];
  if (limitReached) lines.push("• Eventos leídos: 1000+");
  const message = lines.join("\n");
  if (message.length <= SECURITY_ALERT_MAX_LENGTH) return message;
  const suffix = "\n… resumen truncado";
  return `${message.slice(0, SECURITY_ALERT_MAX_LENGTH - suffix.length)}${suffix}`;
}
