import { randomBytes } from "node:crypto";
import type { APIRoute } from "astro";
import { requirePlatformAdmin } from "../../../lib/auth";
import { createSupabaseServiceClient } from "../../../lib/supabase";
import { businessInputSchema } from "../../../lib/validation";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const identity = await requirePlatformAdmin(request, cookies);
  const form = await request.formData();
  const parsed = businessInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return redirect(`/admin?error=${encodeURIComponent("Revisa los datos del negocio.")}`, 303);

  const input = parsed.data;
  const service = createSupabaseServiceClient();
  const { data: business, error } = await service.from("businesses").insert({
    slug: input.slug,
    display_name: input.displayName,
    legal_name: input.legalName || null,
    logo_url: input.logoUrl || null,
    privacy_url: input.privacyUrl || "/privacy",
    primary_color: input.primaryColor,
    secondary_color: input.secondaryColor,
    timezone: input.timezone,
    default_country: input.defaultCountry,
    inactivity_days: input.inactivityDays,
  }).select("id,slug,display_name").single();

  if (error || !business) {
    const message = error?.code === "23505" ? "Esa URL corta ya está en uso." : "No pudimos crear el negocio.";
    return redirect(`/admin?error=${encodeURIComponent(message)}`, 303);
  }

  const code = randomBytes(18).toString("base64url");
  const { error: tagError } = await service.from("nfc_tags").insert({ business_id: business.id, label: "NFC principal", code });
  if (tagError) {
    await service.from("businesses").delete().eq("id", business.id);
    return redirect(`/admin?error=${encodeURIComponent("No pudimos generar el NFC inicial.")}`, 303);
  }

  let inviteWarning = "";
  if (input.ownerEmail) {
    const { data: invite, error: inviteError } = await service.auth.admin.inviteUserByEmail(input.ownerEmail, {
      redirectTo: `${import.meta.env.PUBLIC_SITE_URL}/auth/callback?next=/set-password`,
      data: { full_name: input.displayName },
    });
    let ownerUserId = invite?.user?.id;
    if (!ownerUserId && inviteError) {
      const listed = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
      ownerUserId = listed.data.users.find((user) => user.email?.toLowerCase() === input.ownerEmail.toLowerCase())?.id;
    }
    if (ownerUserId) {
      await service.from("business_members").upsert({ business_id: business.id, user_id: ownerUserId, role: "owner", is_active: true });
    } else {
      inviteWarning = " El negocio quedó creado; revisa la invitación del dueño.";
    }
  }

  await service.from("audit_log").insert({
    actor_user_id: identity.id,
    business_id: business.id,
    action: "business.created",
    entity_type: "business",
    entity_id: business.id,
    details: { slug: business.slug, initial_tag: true },
  });

  return redirect(`/admin/${business.id}?message=${encodeURIComponent(`Negocio creado.${inviteWarning}`)}`, 303);
};
