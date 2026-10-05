import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  buildSecurityAlertMessage,
  calculateSecurityAlertSince,
  filterSecurityAlertEvents,
  lastSecurityAlertTimestamp,
  SECURITY_ALERT_LIMIT,
  SECURITY_ALERT_QUERY_ACTIONS,
} from "../src/lib/security-alerts-core.mjs";

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

async function loadLatestCursor(supabase) {
  const { data, error } = await supabase
    .from("audit_log")
    .select("details,created_at")
    .eq("action", "alerts.digest_sent")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`cursor query failed: ${error.code || "unknown"}`);
  return data;
}

async function loadSecurityEvents(supabase, since) {
  const { data, error } = await supabase
    .from("audit_log")
    .select("action,details,created_at")
    .in("action", SECURITY_ALERT_QUERY_ACTIONS)
    .gt("created_at", since)
    .order("created_at", { ascending: true })
    .limit(SECURITY_ALERT_LIMIT);
  if (error) throw new Error(`audit_log query failed: ${error.code || "unknown"}`);
  return data || [];
}

async function sendTelegram(fetchImpl, telegramToken, telegramChatId, text) {
  const response = await fetchImpl(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: telegramChatId, text, disable_web_page_preview: true }),
  });
  if (!response.ok) throw new Error(`Telegram delivery failed: HTTP ${response.status}`);
}

async function writeCursor(supabase, until, count) {
  const { error } = await supabase.from("audit_log").insert({
    actor_user_id: null,
    business_id: null,
    action: "alerts.digest_sent",
    entity_type: "system",
    entity_id: null,
    details: { until, count },
  });
  if (error) throw new Error(`cursor write failed: ${error.code || "unknown"}`);
}

export async function runSecurityAlerts({
  supabase,
  telegramToken,
  telegramChatId,
  fetchImpl = fetch,
  now = Date.now(),
  log = console.log,
}) {
  const cursor = await loadLatestCursor(supabase);
  const since = calculateSecurityAlertSince(cursor, now);
  const rows = await loadSecurityEvents(supabase, since);
  const events = filterSecurityAlertEvents(rows);
  if (!events.length) {
    log("GS-49: no security events after the current cursor.");
    return { sent: false, count: 0, since };
  }

  const limitReached = rows.length === SECURITY_ALERT_LIMIT;
  const until = lastSecurityAlertTimestamp(events);
  if (!until) throw new Error("Security events have no valid created_at cursor");

  await sendTelegram(
    fetchImpl,
    telegramToken,
    telegramChatId,
    buildSecurityAlertMessage(events, limitReached),
  );
  await writeCursor(supabase, until, events.length);
  log(`GS-49: sent ${limitReached ? "1000+" : events.length} security event(s) to Telegram.`);
  return { sent: true, count: events.length, since, until, limitReached };
}

async function main() {
  const supabase = createClient(required("PUBLIC_SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  await runSecurityAlerts({
    supabase,
    telegramToken: required("TELEGRAM_BOT_TOKEN"),
    telegramChatId: required("TELEGRAM_CHAT_ID"),
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error("GS-49 runner failed:", error instanceof Error ? error.message : "unknown");
    process.exitCode = 1;
  });
}
