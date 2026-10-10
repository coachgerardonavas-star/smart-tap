import type { APIRoute } from "astro";
import { requirePlatformAdmin } from "../../../../../lib/auth";
import { createSupabaseServiceClient } from "../../../../../lib/supabase";
import { ownerApprovalSchema } from "../../../../../lib/validation";
import { TERMS_VERSION } from "../../../../../lib/terms";

export const POST: APIRoute = async ({ request, cookies, params, redirect }) => {
  const identity = await requirePlatformAdmin(request, cookies);
  const id = params.id ?? "";
  const parsed = ownerApprovalSchema.safeParse(Object.fromEntries(await request.formData()));
  if (!parsed.success) {
    return redirect(`/admin/${id}?error=${encodeURIComponent("Escribe el nombre del dueño que aprobó la configuración.")}#aprobacion`, 303);
  }

  const service = createSupabaseServiceClient();
  const { error } = await service.rpc("record_business_owner_approval", {
    p_business_id: id,
    p_owner_name: parsed.data.ownerName,
    p_actor_user_id: identity.id,
    p_terms_version: TERMS_VERSION,
  });
  if (error) {
    const message = error.message.includes("business_cancelled")
      ? "El servicio cancelado no admite una nueva aprobación."
      : error.message.includes("approval_current_owner_signature_required")
      ? "Un dueño activo debe firmar la versión vigente de los Términos antes de aprobar la activación."
      : error.message.includes("approval_active_member_required")
      ? "Asigna al menos un usuario activo antes de registrar la aprobación."
      : error.message.includes("approval_configuration_incomplete")
        ? "Faltan datos: revisa la lista «Antes de marcar Negocio activo». Necesita enlace del logo, contacto, las cuatro ofertas, días de inactividad y enlace de reseñas de Google. Guarda los cambios antes de aprobar."
        : "No pudimos registrar la aprobación del dueño.";
    return redirect(`/admin/${id}?error=${encodeURIComponent(message)}#aprobacion`, 303);
  }

  return redirect(`/admin/${id}?message=${encodeURIComponent("Aprobación del dueño registrada.")}#aprobacion`, 303);
};
