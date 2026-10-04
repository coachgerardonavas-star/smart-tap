import type { APIRoute } from "astro";
import { assertBusinessAccess, requireDataAccess } from "../../../lib/auth";
import { createSupabaseServiceClient } from "../../../lib/supabase";
import { TERMS_VERSION } from "../../../lib/terms";
import { businessIdSchema, safeNextPath } from "../../../lib/validation";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const identity = await requireDataAccess(request, cookies);
  const form = await request.formData();
  const next = safeNextPath(form.get("next"));
  if (identity.isPlatformAdmin) return redirect(next, 303);

  const parsedBusinessId = businessIdSchema.safeParse(form.get("businessId"));
  if (!parsedBusinessId.success || form.get("accepted") !== "on") {
    const business = parsedBusinessId.success ? `&business=${encodeURIComponent(parsedBusinessId.data)}` : "";
    return redirect(`/terms/accept?error=1${business}&next=${encodeURIComponent(next)}`, 303);
  }

  const businessId = parsedBusinessId.data;
  await assertBusinessAccess(identity, businessId);
  const service = createSupabaseServiceClient();
  const { data: business, error: businessError } = await service.from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("is_active", true)
    .is("cancelled_at", null)
    .maybeSingle();
  if (businessError || !business) return new Response("Negocio no disponible.", { status: 404 });

  const { error } = await service.rpc("record_terms_acceptance", {
    p_user_id: identity.id,
    p_business_id: businessId,
    p_terms_version: TERMS_VERSION,
  });
  if (error) return new Response("No pudimos guardar la aceptación.", { status: 500 });
  return redirect(next, 303);
};
