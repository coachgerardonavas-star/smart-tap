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
