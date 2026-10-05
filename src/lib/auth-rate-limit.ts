import { createSupabaseServiceClient } from "./supabase";
import { hashIdentifier, requestIp } from "./security";
import { recordSecurityAuditOnce } from "./security-alert-audit";

export type AuthRateLimitAction = "login" | "forgot_password";

export async function enforceAuthRateLimit(
  action: AuthRateLimitAction,
  email: string,
  request: Request,
  clientAddress?: string,
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase().slice(0, 254) || "invalid";
  const ip = requestIp(request, clientAddress);
  const ipHash = hashIdentifier(`auth:${action}:ip:${ip}`);
  const emailHash = hashIdentifier(`auth:${action}:email:${normalizedEmail}`);
  const service = createSupabaseServiceClient();
  const { error } = await service.rpc("enforce_auth_rate_limit", {
    p_action: action,
    p_ip_hash: ipHash,
    p_email_hash: emailHash,
  });
  if (!error) return true;
  if (error.message.includes("rate_limit_exceeded")) {
    await recordSecurityAuditOnce(service, `auth:${action}:${ipHash}:${emailHash}`, {
      action: "security.auth_rate_limit",
      entity_type: "auth",
      details: { action },
    });
  } else {
    console.error("auth rate limit failed", error.code);
  }
  return false;
}
