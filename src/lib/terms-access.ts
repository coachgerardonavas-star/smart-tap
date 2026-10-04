import type { AuthIdentity } from "./auth";
import { createSupabaseServiceClient } from "./supabase";
import { TERMS_VERSION } from "./terms";

export class TermsAcceptanceRequiredError extends Error {
  readonly status = 403;

  constructor(public readonly businessId: string) {
    super("terms_acceptance_required");
  }
}

export async function hasAcceptedCurrentTerms(identity: AuthIdentity, businessId: string): Promise<boolean> {
  if (identity.isPlatformAdmin) return true;
  const { data, error } = await createSupabaseServiceClient()
    .from("terms_acceptances")
    .select("accepted_at")
    .eq("user_id", identity.id)
    .eq("business_id", businessId)
    .eq("terms_version", TERMS_VERSION)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function assertCurrentTermsAccepted(identity: AuthIdentity, businessId: string): Promise<void> {
  if (!await hasAcceptedCurrentTerms(identity, businessId)) throw new TermsAcceptanceRequiredError(businessId);
}

export async function pendingOwnerSignatureBusiness(identity: AuthIdentity): Promise<string | null> {
  if (identity.isPlatformAdmin) return null;
  const service = createSupabaseServiceClient();
  const { data: memberships, error: membershipError } = await service.from("business_members")
    .select("business_id")
    .eq("user_id", identity.id)
    .eq("role", "owner")
    .eq("is_active", true);
  if (membershipError) throw membershipError;
  const ids = (memberships ?? []).map((row) => row.business_id);
  if (!ids.length) return null;
  const [{ data: businesses, error: businessError }, { data: signatures, error: signatureError }] = await Promise.all([
    service.from("businesses").select("id").in("id", ids).eq("is_active", false).is("cancelled_at", null),
    service.from("terms_signatures").select("business_id").eq("user_id", identity.id).eq("terms_version", TERMS_VERSION).in("business_id", ids),
  ]);
  if (businessError || signatureError) throw businessError || signatureError;
  const signed = new Set((signatures ?? []).map((row) => row.business_id));
  return (businesses ?? []).find((business) => !signed.has(business.id))?.id ?? null;
}
