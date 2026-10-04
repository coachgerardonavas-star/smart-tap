import type { APIRoute } from "astro";
import { requirePlatformAdmin } from "../../../../../lib/auth";
import { createSupabaseServiceClient } from "../../../../../lib/supabase";
import { statusChangeSchema } from "../../../../../lib/validation";

export const POST: APIRoute = async ({ request, cookies, params, redirect }) => {
  const identity = await requirePlatformAdmin(request, cookies);
  const id = params.id ?? "";
  const parsed = statusChangeSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) return redirect(`/admin/${id}?error=${encodeURIComponent("Solicitud no válida.")}`, 303);
  const service = createSupabaseServiceClient();
  const { error } = await service.rpc("set_business_member_active_with_limit", {
    p_business_id: id,
    p_user_id: parsed.data.targetId,
    p_active: parsed.data.active,
  });
  if (error) {
    const message = error.message.includes("active_member_limit")
      ? "Este negocio ya tiene 2 usuarios activos. Pausa uno antes de reactivar otro."
      : "No pudimos cambiar el acceso.";
    return redirect(`/admin/${id}?error=${encodeURIComponent(message)}`, 303);
  }
  await service.from("audit_log").insert({ actor_user_id: identity.id, business_id: id, action: parsed.data.active ? "member.activated" : "member.deactivated", entity_type: "business_member", entity_id: parsed.data.targetId });
  return redirect(`/admin/${id}?message=${encodeURIComponent(parsed.data.active ? "Acceso activado." : "Acceso pausado.")}`, 303);
};
