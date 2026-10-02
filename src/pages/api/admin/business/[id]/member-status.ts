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
  const { data, error } = await service.from("business_members")
    .update({ is_active: parsed.data.active })
    .eq("business_id", id).eq("user_id", parsed.data.targetId)
    .select("user_id");
  if (error || !data?.length) return redirect(`/admin/${id}?error=${encodeURIComponent("No pudimos cambiar el acceso.")}`, 303);
  await service.from("audit_log").insert({ actor_user_id: identity.id, business_id: id, action: parsed.data.active ? "member.activated" : "member.deactivated", entity_type: "business_member", entity_id: parsed.data.targetId });
  return redirect(`/admin/${id}?message=${encodeURIComponent(parsed.data.active ? "Acceso activado." : "Acceso pausado.")}`, 303);
};
