import { createClient } from "@supabase/supabase-js";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function positiveInt(name, fallback) {
  const parsed = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const supabaseUrl = required("PUBLIC_SUPABASE_URL");
const supabaseKey = required("SUPABASE_SECRET_KEY");
const telegramToken = required("TELEGRAM_BOT_TOKEN");
const telegramChatId = required("TELEGRAM_CHAT_ID");
const windowMinutes = positiveInt("SECURITY_ALERT_WINDOW_MINUTES", 20);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
const { data, error } = await supabase
  .from("audit_log")
  .select("action,business_id,entity_type,entity_id,details,created_at")
  .gte("created_at", since)
  .order("created_at", { ascending: true })
  .limit(250);

if (error) throw new Error(`audit_log query failed: ${error.code || "unknown"}`);

const events = (data || []).filter((row) => {
  if (["business.cancelled", "member.invited", "member.activated", "member.deactivated"].includes(row.action)) return true;
  if (row.action === "business.updated") {
    const changed = Array.isArray(row.details?.changedFields) ? row.details.changedFields : [];
    return changed.includes("is_active");
  }
  if (row.action.startsWith("security.")) return true;
  if (row.action.startsWith("platform_admin.")) return true;
  return false;
});

if (!events.length) {
  console.log(`GS-49: no security events in the last ${windowMinutes} minutes.`);
  process.exit(0);
}

const counts = new Map();
for (const event of events) counts.set(event.action, (counts.get(event.action) || 0) + 1);
const lines = [...counts.entries()].map(([action, count]) => `• ${action}: ${count}`);
const latest = events.at(-1)?.created_at || since;
const text = [
  "⚠️ Smart Tap — alerta de seguridad",
  `Ventana: últimos ${windowMinutes} min`,
  ...lines,
  `Último evento: ${latest}`,
].join("\n");

const response = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ chat_id: telegramChatId, text, disable_web_page_preview: true }),
});
if (!response.ok) throw new Error(`Telegram delivery failed: HTTP ${response.status}`);
console.log(`GS-49: sent ${events.length} security event(s) to Telegram.`);
