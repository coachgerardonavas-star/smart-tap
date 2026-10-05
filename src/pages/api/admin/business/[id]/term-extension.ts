import type { APIRoute } from "astro";
import { requirePlatformAdmin } from "../../../../../lib/auth";
import { createSupabaseServiceClient } from "../../../../../lib/supabase";
import { businessIdSchema, termExtensionSchema } from "../../../../../lib/validation";

export const POST: APIRoute = async ({ request, cookies, params, redirect }) => {
  const identity = await requirePlatformAdmin(request, cookies);
  const parsedId = businessIdSchema.safeParse(params.id);
  const parsed = termExtensionSchema.safeParse(Object.fromEntries(await request.formData()));
  const id = parsedId.success ? parsedId.data : params.id ?? "";
  if (!parsedId.success || !parsed.success) {
    return redirect(`/admin/${id}?error=${encodeURIComponent("Indica una fecha posterior y confirma el Anexo de Extensión firmado.")}`, 303);
  }

  const termEndsAt = new Date(`${parsed.data.termEndsAt}T23:59:59.999Z`).toISOString();
  const { error } = await createSupabaseServiceClient().rpc("record_term_extension", {
    p_business_id: parsedId.data,
    p_term_ends_at: termEndsAt,
    p_actor_user_id: identity.id,
    p_annex_signed: true,
  });
  if (error) {
    const message = error.message.includes("invalid_term_extension")
      ? "La nueva fecha debe ampliar el plazo actual y estar en el futuro."
      : "No pudimos registrar la extensión.";
    return redirect(`/admin/${id}?error=${encodeURIComponent(message)}`, 303);
  }
  return redirect(`/admin/${id}?message=${encodeURIComponent("Anexo de Extensión registrado.")}`, 303);
};
