import { randomBytes } from "node:crypto";
import type { APIRoute } from "astro";
import { requirePlatformAdmin } from "../../../../../lib/auth";
import { createSupabaseServiceClient } from "../../../../../lib/supabase";
import { nfcTagInputSchema } from "../../../../../lib/validation";

export const POST: APIRoute = async ({ request, cookies, params, redirect }) => {
  const identity = await requirePlatformAdmin(request, cookies);
  const id = params.id ?? "";
  const form = await request.formData();
  const parsed = nfcTagInputSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return redirect(`/admin/${id}?error=${encodeURIComponent("Escribe un nombre para el NFC.")}`, 303);
  const service = createSupabaseServiceClient();
  const { error } = await service.from("nfc_tags").insert({ business_id: id, label: parsed.data.label, code: randomBytes(18).toString("base64url") });
  if (error) return redirect(`/admin/${id}?error=${encodeURIComponent("No pudimos generar el NFC.")}`, 303);
  await service.from("audit_log").insert({ actor_user_id: identity.id, business_id: id, action: "nfc_tag.created", entity_type: "nfc_tag", details: { label: parsed.data.label } });
  return redirect(`/admin/${id}?message=${encodeURIComponent("NFC generado.")}`, 303);
};
