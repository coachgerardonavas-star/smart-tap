import type { APIRoute } from "astro";
import { createSupabaseServiceClient } from "../../../lib/supabase";
import { hashIdentifier, requestIp } from "../../../lib/security";
import { checkInInputSchema, normalizePhone } from "../../../lib/validation";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 12_000) return json(413, { error: "La solicitud es demasiado grande." });
  if (!request.headers.get("content-type")?.includes("application/json")) return json(415, { error: "Formato no válido." });

  let raw: Record<string, unknown>;
  try { raw = await request.json(); } catch { return json(400, { error: "Datos no válidos." }); }
  if (raw.website) return json(400, { error: "No pudimos registrar la visita." });

  const parsed = checkInInputSchema.safeParse(raw);
  if (!parsed.success) {
    const consentIssue = parsed.error.issues.some((issue) => issue.path[0] === "consent");
    return json(400, { error: consentIssue ? "Debes aceptar el consentimiento para continuar." : "Revisa los datos del formulario." });
  }

  try {
    const service = createSupabaseServiceClient();
    const { data: business } = await service
      .from("businesses")
      .select("default_country")
      .eq("slug", parsed.data.slug)
      .eq("is_active", true)
      .maybeSingle();
    if (!business) return json(404, { error: "Este negocio no está disponible." });

    const phone = normalizePhone(parsed.data.phone, business.default_country);
    if (!phone) return json(400, { error: "Ingresa un número de teléfono válido." });

    const { data, error } = await service.rpc("record_public_check_in", {
      p_slug: parsed.data.slug,
      p_tag_code: parsed.data.tagCode || null,
      p_full_name: parsed.data.fullName,
      p_phone_e164: phone,
      p_birthday: parsed.data.birthday || null,
      p_consent_version: parsed.data.consentVersion,
      p_ip_hash: hashIdentifier(`ip:${requestIp(request, clientAddress)}`),
      p_phone_hash: hashIdentifier(`phone:${phone}`),
      p_user_agent: request.headers.get("user-agent") || "unknown",
    });

    if (error) {
      if (error.message.includes("rate_limit_exceeded")) return json(429, { error: "Espera unos minutos antes de registrar otra visita." });
      if (error.message.includes("tag_not_found")) return json(404, { error: "Este NFC no está activo." });
      if (error.message.includes("business_not_found")) return json(404, { error: "Este negocio no está disponible." });
      console.error("check-in rpc failed", error.code);
      return json(500, { error: "No pudimos registrar la visita. Intenta de nuevo." });
    }

    return json(201, { data });
  } catch (error) {
    console.error("check-in failed", error instanceof Error ? error.message : "unknown");
    return json(500, { error: "No pudimos registrar la visita. Intenta de nuevo." });
  }
};
