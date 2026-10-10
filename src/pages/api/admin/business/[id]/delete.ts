import type { APIRoute } from "astro";
import { requirePlatformAdmin } from "../../../../../lib/auth";
import { createSupabaseServiceClient } from "../../../../../lib/supabase";
import { businessIdSchema } from "../../../../../lib/validation";

// D-060: removes a business registered by mistake or for testing. It refuses any
// business that has customers or visits (those go through "Cancelar servicio" and
// the retention purge), and requires the admin to type the business's web address.
export const POST: APIRoute = async ({ request, cookies, params, redirect }) => {
  const identity = await requirePlatformAdmin(request, cookies);
  const parsedId = businessIdSchema.safeParse(params.id);
  if (!parsedId.success) return redirect("/admin?error=Negocio%20no%20encontrado", 303);
  const id = parsedId.data;
  const back = (key: "error" | "message", text: string) => redirect(`/admin/${id}?${key}=${encodeURIComponent(text)}`, 303);

  const form = await request.formData();
  const typed = String(form.get("confirmSlug") ?? "").trim();
  const service = createSupabaseServiceClient();
  const { data: business, error } = await service.from("businesses").select("id,slug,display_name").eq("id", id).maybeSingle();
  if (error || !business) return redirect("/admin?error=Negocio%20no%20encontrado", 303);
  if (typed !== business.slug) return back("error", "La dirección web escrita no coincide. No se eliminó nada.");

  const [customers, visits] = await Promise.all([
    service.from("customers").select("id", { count: "exact", head: true }).eq("business_id", id),
    service.from("visits").select("id", { count: "exact", head: true }).eq("business_id", id),
  ]);
  if (customers.error || visits.error) return back("error", "No pudimos comprobar si el negocio tiene clientes. No se eliminó nada.");
  if ((customers.count ?? 0) > 0 || (visits.count ?? 0) > 0) {
    return back("error", "Este negocio ya tiene clientes o visitas. Usa «Cancelar servicio» en su lugar.");
  }

  const { error: auditError } = await service.from("audit_log").insert({
    actor_user_id: identity.id,
    business_id: id,
    action: "business.deleted",
    entity_type: "business",
    entity_id: id,
    details: { slug: business.slug, displayName: business.display_name },
  });
  if (auditError) return back("error", "No pudimos registrar la auditoría. No se eliminó nada.");

  const { error: deleteError } = await service.from("businesses").delete().eq("id", id);
  if (deleteError) return back("error", "No pudimos eliminar el negocio.");
  return redirect(`/admin?message=${encodeURIComponent(`Negocio «${business.display_name}» eliminado.`)}`, 303);
};
