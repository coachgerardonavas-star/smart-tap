import type { APIRoute } from "astro";
import { requirePlatformAdmin } from "../../../../../lib/auth";
import { createSupabaseServiceClient } from "../../../../../lib/supabase";
import { businessUpdateSchema } from "../../../../../lib/validation";

export const POST: APIRoute = async ({ request, cookies, params, redirect }) => {
  const identity = await requirePlatformAdmin(request, cookies);
  const id = params.id ?? "";
  const form = await request.formData();
  const parsed = businessUpdateSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return redirect(`/admin/${id}?error=${encodeURIComponent("Revisa los datos del negocio.")}`, 303);
  const input = parsed.data;
  const service = createSupabaseServiceClient();
  const { error } = await service.from("businesses").update({
    display_name: input.displayName, legal_name: input.legalName || null, slug: input.slug,
    logo_url: input.logoUrl || null, privacy_url: input.privacyUrl || "/privacy", primary_color: input.primaryColor, secondary_color: input.secondaryColor,
    timezone: input.timezone, default_country: input.defaultCountry, inactivity_days: input.inactivityDays,
    is_active: form.get("isActive") === "on",
  }).eq("id", id);
  if (error) return redirect(`/admin/${id}?error=${encodeURIComponent(error.code === "23505" ? "Esa URL corta ya está en uso." : "No pudimos guardar los cambios.")}`, 303);
  await service.from("audit_log").insert({ actor_user_id: identity.id, business_id: id, action: "business.updated", entity_type: "business", entity_id: id });
  return redirect(`/admin/${id}?message=${encodeURIComponent("Cambios guardados.")}`, 303);
};
