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
  const wantsActive = form.get("isActive") === "on";
  if (wantsActive) {
    const { data: current, error: currentError } = await service.from("businesses")
      .select("owner_approved_at").eq("id", id).maybeSingle();
    if (currentError || !current) return redirect(`/admin/${id}?error=${encodeURIComponent("Negocio no encontrado.")}`, 303);
    if (!current.owner_approved_at) {
      return redirect(`/admin/${id}?error=${encodeURIComponent("Registra la aprobación del dueño antes de activar el negocio.")}`, 303);
    }
  }
  const { error } = await service.from("businesses").update({
    display_name: input.displayName, legal_name: input.legalName || null, slug: input.slug,
    logo_url: input.logoUrl || null, privacy_url: input.privacyUrl || "/privacy", primary_color: input.primaryColor, secondary_color: input.secondaryColor,
    timezone: input.timezone, default_country: input.defaultCountry, inactivity_days: input.inactivityDays,
    offer_inactive: input.offerInactive, offer_birthday: input.offerBirthday,
    offer_frequent: input.offerFrequent, offer_new: input.offerNew,
    google_review_url: input.googleReviewUrl,
    is_active: wantsActive,
  }).eq("id", id);
  if (error) {
    const message = error.code === "23505" ? "Esa URL corta ya está en uso."
      : error.code === "23514" ? "Registra la aprobación del dueño antes de activar el negocio."
        : "No pudimos guardar los cambios.";
    return redirect(`/admin/${id}?error=${encodeURIComponent(message)}`, 303);
  }
  await service.from("audit_log").insert({ actor_user_id: identity.id, business_id: id, action: "business.updated", entity_type: "business", entity_id: id });
  return redirect(`/admin/${id}?message=${encodeURIComponent("Cambios guardados.")}`, 303);
};
