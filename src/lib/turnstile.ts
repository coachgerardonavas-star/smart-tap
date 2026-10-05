import { serverEnv } from "./env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
let warnedMissingConfiguration = false;

function configuration(): { siteKey: string; secretKey: string } | null {
  const siteKey = serverEnv("TURNSTILE_SITE_KEY")?.trim();
  const secretKey = serverEnv("TURNSTILE_SECRET_KEY")?.trim();
  return siteKey && secretKey ? { siteKey, secretKey } : null;
}

export function turnstileSiteKey(): string | null {
  return configuration()?.siteKey ?? null;
}

export async function verifyTurnstile(token: unknown, remoteIp?: string): Promise<boolean> {
  const configured = configuration();
  if (!configured) {
    if (!warnedMissingConfiguration) {
      warnedMissingConfiguration = true;
      console.warn("Turnstile is disabled because its environment variables are incomplete.");
    }
    return true;
  }
  if (typeof token !== "string" || !token.trim()) return false;

  const body = new URLSearchParams({ secret: configured.secretKey, response: token.trim() });
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);
  try {
    const response = await fetch(VERIFY_URL, { method: "POST", body });
    if (!response.ok) return false;
    const result = await response.json() as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
