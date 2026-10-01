import type { AstroCookies } from "astro";
import { createSupabaseServerClient, createSupabaseServiceClient } from "./supabase";

export type AuthIdentity = {
  id: string;
  email: string | null;
  isPlatformAdmin: boolean;
};

export class AuthorizationError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "Authentication required" : "Forbidden");
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
  const bootstrapEmail = import.meta.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  if (email && bootstrapEmail && email.toLowerCase() === bootstrapEmail && profile?.platform_role !== "platform_admin") {
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
  };
}

export async function requireAuth(request: Request, cookies: AstroCookies): Promise<AuthIdentity> {
  const identity = await getAuthIdentity(request, cookies);
  if (!identity) throw new AuthorizationError(401);
  return identity;
}

export async function requirePlatformAdmin(request: Request, cookies: AstroCookies): Promise<AuthIdentity> {
  const identity = await requireAuth(request, cookies);
  if (!identity.isPlatformAdmin) throw new AuthorizationError(403);
  return identity;
}

export async function assertBusinessAccess(userId: string, businessId: string, allowViewer = true) {
  const service = createSupabaseServiceClient();
  const { data: profile } = await service.from("profiles").select("platform_role").eq("id", userId).maybeSingle();
  if (profile?.platform_role === "platform_admin") return { role: "platform_admin" as const };

  let query = service
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .eq("is_active", true);
  if (!allowViewer) query = query.in("role", ["owner", "manager"]);
  const { data } = await query.maybeSingle();
  if (!data) throw new AuthorizationError(403);
  return data;
}
