import type { APIRoute } from "astro";
import { assertBusinessAccess, requireDataAccess } from "../../../../../lib/auth";
import { createSupabaseServiceClient } from "../../../../../lib/supabase";
import { businessIdSchema } from "../../../../../lib/validation";

export const POST: APIRoute = async ({ request, cookies, params, redirect }) => {
  const identity = await requireDataAccess(request, cookies);
  const form = await request.formData();
  const parsedBusinessId = businessIdSchema.safeParse(form.get("businessId"));
  if (!parsedBusinessId.success) return new Response("Solicitud no válida", { status: 400 });
  const businessId = parsedBusinessId.data;
  const customerId = params.id ?? "";
  await assertBusinessAccess(identity, businessId, false);

  const service = createSupabaseServiceClient();
  const [{ data: customer, error: customerError }, { data: business, error: businessError }] = await Promise.all([
    service.from("customers").select("id,whatsapp_opt_in").eq("business_id", businessId).eq("id", customerId).maybeSingle(),
    service.from("businesses").select("slug").eq("id", businessId).maybeSingle(),
  ]);
  if (customerError || businessError) return new Response("No pudimos actualizar el permiso", { status: 500 });
  if (!customer || !business) return new Response("Cliente no encontrado", { status: 404 });
  if (customer.whatsapp_opt_in) {
    const { error } = await service.rpc("record_whatsapp_opt_out", {
      p_business_id: businessId,
      p_customer_id: customerId,
      p_actor_user_id: identity.id,
      p_user_agent: request.headers.get("user-agent") || "unknown",
    });
    if (error) {
      console.error("whatsapp opt-out failed", error.code);
      return new Response("No pudimos actualizar el permiso", { status: 500 });
    }
  }
  return redirect(`/dashboard?business=${encodeURIComponent(business.slug)}`, 303);
};
