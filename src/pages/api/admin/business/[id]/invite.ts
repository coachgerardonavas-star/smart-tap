import type { APIRoute } from "astro";
import { siteUrl } from "../../../../../lib/env";
import { requirePlatformAdmin } from "../../../../../lib/auth";
import { createSupabaseServiceClient } from "../../../../../lib/supabase";
import { memberInviteSchema } from "../../../../../lib/validation";

export const POST: APIRoute = async ({ request, cookies, params, redirect }) => {
  const identity = await requirePlatformAdmin(request, cookies);
  const id = params.id ?? "";
  const form = await request.formData();
  const parsed = memberInviteSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return redirect(`/admin/${id}?error=${encodeURIComponent("Revisa el correo y el rol.")}`, 303);
  const service = createSupabaseServiceClient();
  const { data: business } = await service.from("businesses").select("display_name").eq("id", id).maybeSingle();
  if (!business) return redirect("/admin?error=Negocio%20no%20encontrado", 303);

  let userId: string | undefined;
  const invited = await service.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/set-password`,
    data: { full_name: business.display_name },
  });
  userId = invited.data.user?.id;

  if (!userId) {
    const listed = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
    userId = listed.data.users.find((user) => user.email?.toLowerCase() === parsed.data.email.toLowerCase())?.id;
  }
  if (!userId) return redirect(`/admin/${id}?error=${encodeURIComponent("No pudimos invitar ese correo.")}`, 303);

  const { error } = await service.rpc("upsert_business_member_with_limit", {
    p_business_id: id,
    p_user_id: userId,
    p_role: parsed.data.role,
  });
  if (error) {
    const message = error.message.includes("active_member_limit")
      ? "Este negocio ya tiene 2 usuarios activos. Pausa uno antes de agregar otro."
      : "No pudimos asignar el usuario.";
    return redirect(`/admin/${id}?error=${encodeURIComponent(message)}`, 303);
  }
  await service.from("audit_log").insert({ actor_user_id: identity.id, business_id: id, action: "member.invited", entity_type: "business_member", entity_id: userId, details: { role: parsed.data.role } });
  // Supabase only sends the invitation email to NEW accounts. An existing account
  // makes inviteUserByEmail return an error and no email goes out.
  const text = invited.error
    ? "Usuario asignado. Ese correo ya tenía cuenta, así que NO se envió invitación: la persona entra directo en /login con su contraseña."
    : "Invitación enviada. Si no llega, revisa spam.";
  return redirect(`/admin/${id}?message=${encodeURIComponent(text)}`, 303);
};
