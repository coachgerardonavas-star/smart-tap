import type { APIRoute } from "astro";
import { changedFieldNames } from "../../../../../lib/audit";
import { requirePlatformAdmin } from "../../../../../lib/auth";
import { createSupabaseServiceClient } from "../../../../../lib/supabase";
import { businessUpdateSchema, heroImageFromForm } from "../../../../../lib/validation";
import { TERMS_VERSION } from "../../../../../lib/terms";

export const POST: APIRoute = async ({ request, cookies, params, redirect }) => {
  const identity = await requirePlatformAdmin(request, cookies);
  const id = params.id ?? "";
  const form = await request.formData();
  const raw: Record<string, unknown> = Object.fromEntries(form);
  const parsed = businessUpdateSchema.safeParse({ ...raw, heroImageUrl: heroImageFromForm(raw) });
  if (!parsed.success) return redirect(`/admin/${id}?error=${encodeURIComponent("Revisa los datos del negocio.")}`, 303);
  const input = parsed.data;
  const service = createSupabaseServiceClient();
  const wantsActive = form.get("isActive") === "on";
  const { data: current, error: currentError } = await service.from("businesses")
    .select("owner_approved_at,owner_approved_terms_version,cancelled_at,display_name,legal_name,slug,logo_url,privacy_url,contact_phone,contact_email,primary_color,timezone,default_country,inactivity_days,offer_inactive,offer_birthday,offer_frequent,offer_new,google_review_url,theme,tagline,benefits,hero_image_url,business_type,instagram_url,is_active")
    .eq("id", id).maybeSingle();
  if (currentError || !current) return redirect(`/admin/${id}?error=${encodeURIComponent("Negocio no encontrado.")}`, 303);
  if (wantsActive && !current.is_active && (!current.owner_approved_at || current.owner_approved_terms_version !== TERMS_VERSION)) {
    return redirect(`/admin/${id}?error=${encodeURIComponent("Registra la firma vigente y la aprobación del dueño antes de activar el negocio.")}`, 303);
  }
  if (wantsActive && current.cancelled_at) {
    return redirect(`/admin/${id}?error=${encodeURIComponent("Un servicio cancelado no se puede reactivar.")}`, 303);
  }

  const updates = {
    display_name: input.displayName, legal_name: input.legalName || null, slug: input.slug,
    logo_url: input.logoUrl || null, privacy_url: input.privacyUrl || null,
    contact_phone: input.contactPhone, contact_email: input.contactEmail,
    primary_color: input.primaryColor,
    timezone: input.timezone, default_country: input.defaultCountry, inactivity_days: input.inactivityDays,
    offer_inactive: input.offerInactive, offer_birthday: input.offerBirthday,
    offer_frequent: input.offerFrequent, offer_new: input.offerNew,
    google_review_url: input.googleReviewUrl,
    theme: input.theme,
    tagline: input.tagline,
    benefits: input.benefits,
    hero_image_url: input.heroImageUrl,
    business_type: input.businessType,
    instagram_url: input.instagramUrl,
    is_active: wantsActive,
  };
  const changedFields = changedFieldNames(current, updates);
  const { error } = await service.from("businesses").update(updates).eq("id", id);
  if (error) {
    const message = error.code === "23505" ? "Esa URL corta ya está en uso."
      : error.code === "23514" ? "Registra la firma vigente, la aprobación del dueño y un contacto antes de activar el negocio."
        : "No pudimos guardar los cambios.";
    return redirect(`/admin/${id}?error=${encodeURIComponent(message)}`, 303);
  }
  await service.from("audit_log").insert({
    actor_user_id: identity.id,
    business_id: id,
    action: "business.updated",
    entity_type: "business",
    entity_id: id,
    details: { changedFields },
  });
  return redirect(`/admin/${id}?message=${encodeURIComponent("Cambios guardados.")}`, 303);
};
