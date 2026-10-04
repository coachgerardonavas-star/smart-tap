import type { AstroCookies } from "astro";
import { serverEnv } from "./env";
import { createSupabaseServerClient, createSupabaseServiceClient } from "./supabase";

export type AuthIdentity = {
  id: string;
  email: string | null;
  isPlatformAdmin: boolean;
  aal: "aal1" | "aal2";
};

export type AuthorizationReason = "authentication_required" | "forbidden" | "mfa_required";

export class AuthorizationError extends Error {
  constructor(
    public readonly status: 401 | 403,
    public readonly reason: AuthorizationReason = status === 401 ? "authentication_required" : "forbidden",
  ) {
    super(reason === "mfa_required" ? "MFA required" : status === 401 ? "Authentication required" : "Forbidden");
  }
}

export async function getAuthIdentity(request: Request, cookies: AstroCookies): Promise<AuthIdentity | null> {
  const supabase = createSupabaseServerClient(request, cookies);
  const { data, error } = await supabase.auth.getClaims();
  const subject = data?.claims?.sub;
  if (error || typeof subject !== "string") return null;

  const service = createSupabaseServiceClient();
  let { data: profile } = await service
    .from("profiles")
    .select("platform_role")
    .eq("id", subject)
    .maybeSingle();

  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;
  const bootstrapEmail = serverEnv("ADMIN_BOOTSTRAP_EMAIL")?.trim().toLowerCase();
  if (email && bootstrapEmail && email.toLowerCase() === bootstrapEmail && profile?.platform_role !== "platform_admin"
    && await hasConfirmedEmail(subject, bootstrapEmail)) {
    const promoted = await service
      .from("profiles")
      .update({ platform_role: "platform_admin" })
      .eq("id", subject)
      .select("platform_role")
      .single();
    if (promoted.data) profile = promoted.data;
  }

  return {
    id: subject,
    email,
    isPlatformAdmin: profile?.platform_role === "platform_admin",
    // getClaims verifies the token signature before these claims are trusted.
    // Supabase treats a missing AAL claim as aal1.
    aal: data?.claims.aal === "aal2" ? "aal2" : "aal1",
  };
}

// Promotion relies on Auth having confirmed the address, not only on the email claim,
// so a misconfigured project with open signup cannot mint a platform admin.
async function hasConfirmedEmail(userId: string, expectedEmail: string): Promise<boolean> {
  const { data } = await createSupabaseServiceClient().auth.admin.getUserById(userId);
  const user = data?.user;
  return Boolean(user?.email_confirmed_at && user.email?.toLowerCase() === expectedEmail);
}

export async function requireAuth(request: Request, cookies: AstroCookies): Promise<AuthIdentity> {
  const identity = await getAuthIdentity(request, cookies);
  if (!identity) throw new AuthorizationError(401);
  return identity;
}

export async function requirePlatformAdminRole(request: Request, cookies: AstroCookies): Promise<AuthIdentity> {
  const identity = await requireAuth(request, cookies);
  if (!identity.isPlatformAdmin) throw new AuthorizationError(403);
  return identity;
}

export function enforcePlatformAdminMfa(identity: AuthIdentity): AuthIdentity {
  if (!identity.isPlatformAdmin) throw new AuthorizationError(403);
  if (identity.aal !== "aal2") throw new AuthorizationError(403, "mfa_required");
  return identity;
}

export async function requirePlatformAdmin(request: Request, cookies: AstroCookies): Promise<AuthIdentity> {
  return enforcePlatformAdminMfa(await requirePlatformAdminRole(request, cookies));
}

// Customer-data routes. A platform admin reaches every tenant through this path, so
// the same aal2 requirement as /admin applies; members are unaffected.
export async function requireDataAccess(request: Request, cookies: AstroCookies): Promise<AuthIdentity> {
  const identity = await requireAuth(request, cookies);
  if (identity.isPlatformAdmin) enforcePlatformAdminMfa(identity);
  return identity;
}

export async function assertBusinessAccess(identity: AuthIdentity, businessId: string, allowViewer = true) {
  if (identity.isPlatformAdmin) {
    enforcePlatformAdminMfa(identity);
    return { role: "platform_admin" as const };
  }

  const service = createSupabaseServiceClient();
  let query = service
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", identity.id)
    .eq("is_active", true);
  if (!allowViewer) query = query.in("role", ["owner", "manager"]);
  const { data } = await query.maybeSingle();
  if (!data) throw new AuthorizationError(403);
  return data;
}
