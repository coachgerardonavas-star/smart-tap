import type { APIRoute } from "astro";
import { requirePlatformAdmin } from "../../../../../lib/auth";
import { createSupabaseServiceClient } from "../../../../../lib/supabase";
import { businessIdSchema } from "../../../../../lib/validation";

export const POST: APIRoute = async ({ request, cookies, params, redirect }) => {
  const identity = await requirePlatformAdmin(request, cookies);
  const parsedId = businessIdSchema.safeParse(params.id);
  if (!parsedId.success) return redirect("/admin?error=Negocio%20no%20encontrado", 303);

  const service = createSupabaseServiceClient();
  const cancelledAt = new Date().toISOString();
  const { data: business, error } = await service.from("businesses")
    .update({ cancelled_at: cancelledAt, is_active: false })
    .eq("id", parsedId.data)
    .is("cancelled_at", null)
    .select("id")
    .maybeSingle();
  if (error) return redirect(`/admin/${parsedId.data}?error=${encodeURIComponent("No pudimos cancelar el servicio.")}`, 303);
  if (!business) return redirect(`/admin/${parsedId.data}?message=${encodeURIComponent("El servicio ya estaba cancelado.")}`, 303);

  const { error: auditError } = await service.from("audit_log").insert({
    actor_user_id: identity.id,
    business_id: parsedId.data,
    action: "business.cancelled",
    entity_type: "business",
    entity_id: parsedId.data,
    details: {},
  });
  if (auditError) return redirect(`/admin/${parsedId.data}?error=${encodeURIComponent("El servicio se canceló, pero no pudimos registrar la auditoría.")}`, 303);
  return redirect(`/admin/${parsedId.data}?message=${encodeURIComponent("Servicio cancelado. La lista se puede descargar durante 30 días y los datos de clientes se borrarán a los 90 días.")}`, 303);
};
