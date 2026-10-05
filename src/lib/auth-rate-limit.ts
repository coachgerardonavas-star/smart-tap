import { createSupabaseServiceClient } from "./supabase";
import { hashIdentifier, requestIp } from "./security";

export type AuthRateLimitAction = "login" | "forgot_password";

export async function enforceAuthRateLimit(
  action: AuthRateLimitAction,
  email: string,
  request: Request,
  clientAddress?: string,
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase().slice(0, 254) || "invalid";
  const ip = requestIp(request, clientAddress);
  const { error } = await createSupabaseServiceClient().rpc("enforce_auth_rate_limit", {
    p_action: action,
    p_ip_hash: hashIdentifier(`auth:${action}:ip:${ip}`),
    p_email_hash: hashIdentifier(`auth:${action}:email:${normalizedEmail}`),
  });
  if (!error) return true;
  if (!error.message.includes("rate_limit_exceeded")) console.error("auth rate limit failed", error.code);
  return false;
}
