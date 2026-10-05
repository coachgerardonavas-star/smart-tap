import type { createSupabaseServiceClient } from "./supabase";

type ServiceClient = ReturnType<typeof createSupabaseServiceClient>;

type SecurityAuditEvent = {
  business_id?: string | null;
  action: "security.auth_rate_limit" | "security.check_in_rate_limit" | "platform_admin.promoted";
  entity_type: "auth" | "business" | "profile";
  entity_id?: string | null;
  details?: Record<string, string | number | boolean>;
};

const cooldowns = new Map<string, number>();
const DEFAULT_COOLDOWN_MS = 5 * 60_000;
const MAX_KEYS = 500;
const SENSITIVE_KEY = /(^|_)(ip|email|phone|hash)($|_)/i;

function safeDetails(details: Record<string, string | number | boolean> = {}) {
  return Object.fromEntries(Object.entries(details).filter(([key, value]) => {
    if (SENSITIVE_KEY.test(key)) return false;
    if (typeof value !== "string") return true;
    if (value.includes("@")) return false;
    if (/^(?:\+?\d[\d\s().-]{6,}|\d{1,3}(?:\.\d{1,3}){3}|[a-f0-9]{32,})$/i.test(value)) return false;
    return true;
  }));
}

export async function recordSecurityAuditOnce(
  service: ServiceClient,
  key: string,
  event: SecurityAuditEvent,
  now = Date.now(),
) {
  const until = cooldowns.get(key) ?? 0;
  if (until > now) return false;

  if (cooldowns.size >= MAX_KEYS) {
    for (const [storedKey, expiry] of cooldowns) {
      if (expiry <= now) cooldowns.delete(storedKey);
    }
    if (cooldowns.size >= MAX_KEYS) cooldowns.clear();
  }

  cooldowns.set(key, now + DEFAULT_COOLDOWN_MS);
  try {
    const { error } = await service.from("audit_log").insert({
      actor_user_id: null,
      business_id: event.business_id ?? null,
      action: event.action,
      entity_type: event.entity_type,
      entity_id: event.entity_id ?? null,
      details: safeDetails(event.details),
    });
    if (!error) return true;
    cooldowns.delete(key);
    console.error("security audit write failed", error.code);
    return false;
  } catch {
    cooldowns.delete(key);
    console.error("security audit write failed", "unexpected");
    return false;
  }
}
