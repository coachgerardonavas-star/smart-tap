import type { APIRoute } from "astro";
import { assertBusinessAccess, requireDataAccess } from "../../../lib/auth";
import { hashIdentifier, requestIp } from "../../../lib/security";
import { createSupabaseServiceClient } from "../../../lib/supabase";
import { TERMS_VERSION } from "../../../lib/terms";
import { safeNextPath, termsSignatureSchema } from "../../../lib/validation";

export const POST: APIRoute = async ({ request, cookies, clientAddress, redirect }) => {
  const identity = await requireDataAccess(request, cookies);
  if (identity.isPlatformAdmin) return new Response("Acceso denegado", { status: 403 });
  const form = await request.formData();
  const next = safeNextPath(form.get("next"));
  const parsed = termsSignatureSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const business = typeof form.get("businessId") === "string" ? `&business=${encodeURIComponent(String(form.get("businessId")))}` : "";
    return redirect(`/terms/sign?error=1${business}&next=${encodeURIComponent(next)}`, 303);
  }

  const { businessId, legalName, title } = parsed.data;
  const membership = await assertBusinessAccess(identity, businessId);
  if (membership.role !== "owner") return new Response("Acceso denegado", { status: 403 });
  const service = createSupabaseServiceClient();
  const { data: business, error: businessError } = await service.from("businesses")
    .select("id")
    .eq("id", businessId)
    .is("cancelled_at", null)
    .maybeSingle();
  if (businessError || !business) return new Response("Negocio no disponible.", { status: 404 });

  const { error } = await service.rpc("record_terms_signature", {
    p_user_id: identity.id,
    p_business_id: businessId,
    p_terms_version: TERMS_VERSION,
    p_signer_name: legalName,
    p_signer_title: title,
    p_ip_hash: hashIdentifier(`terms-signature:${requestIp(request, clientAddress)}`),
    p_user_agent: request.headers.get("user-agent") ?? "unknown",
  });
  if (error) return new Response("No pudimos guardar la firma.", { status: 500 });
  return redirect(next, 303);
};
