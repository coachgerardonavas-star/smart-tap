import type { APIRoute } from "astro";
import { assertBusinessAccess, requireDataAccess } from "../../../../../lib/auth";
import { createSupabaseServiceClient } from "../../../../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies, params, redirect }) => {
  const identity = await requireDataAccess(request, cookies);
  const form = await request.formData();
  const businessId = String(form.get("businessId") || "");
  const customerId = params.id ?? "";
  await assertBusinessAccess(identity, businessId, false);
  const service = createSupabaseServiceClient();
  const { data: customer } = await service.from("customers").select("id").eq("id", customerId).eq("business_id", businessId).maybeSingle();
  if (!customer) return new Response("Cliente no encontrado", { status: 404 });
  const { error } = await service.from("customers").delete().eq("id", customerId).eq("business_id", businessId);
  if (error) return new Response("No pudimos eliminar el cliente", { status: 500 });
  await service.from("audit_log").insert({ actor_user_id: identity.id, business_id: businessId, action: "customer.deleted", entity_type: "customer", entity_id: customerId });
  return redirect("/dashboard", 303);
};
