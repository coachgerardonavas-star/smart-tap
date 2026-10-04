import type { APIRoute } from "astro";
import { requirePlatformAdmin } from "../../../../../lib/auth";
import { createSupabaseServiceClient } from "../../../../../lib/supabase";
import { ownerApprovalSchema } from "../../../../../lib/validation";

export const POST: APIRoute = async ({ request, cookies, params, redirect }) => {
  const identity = await requirePlatformAdmin(request, cookies);
  const id = params.id ?? "";
  const parsed = ownerApprovalSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) {
    return redirect(`/admin/${id}?error=${encodeURIComponent("Escribe el nombre del dueño que aprobó la configuración.")}`, 303);
  }

  const service = createSupabaseServiceClient();
  const { error } = await service.rpc("record_business_owner_approval", {
    p_business_id: id,
    p_owner_name: parsed.data.ownerName,
    p_actor_user_id: identity.id,
  });
  if (error) {
    const message = error.message.includes("approval_active_member_required")
      ? "Asigna al menos un usuario activo antes de registrar la aprobación."
      : error.message.includes("approval_configuration_incomplete")
        ? "Completa la marca, las cuatro ofertas, los días de inactividad y la URL de Google Review."
        : "No pudimos registrar la aprobación del dueño.";
    return redirect(`/admin/${id}?error=${encodeURIComponent(message)}`, 303);
  }

  return redirect(`/admin/${id}?message=${encodeURIComponent("Aprobación del dueño registrada.")}`, 303);
};
