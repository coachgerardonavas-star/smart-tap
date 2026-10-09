import type { APIRoute } from "astro";
import { createSupabaseServiceClient } from "../../../lib/supabase";
import { BodyTooLargeError, hashIdentifier, readJsonLimited, requestIp } from "../../../lib/security";
import { recordSecurityAuditOnce } from "../../../lib/security-alert-audit";
import { PRIVACY_NOTICE_VERSION } from "../../../lib/privacy";
import { checkInInputSchema, normalizePhone } from "../../../lib/validation";
import { verifyTurnstile } from "../../../lib/turnstile";
import { publicCheckInResponse } from "../../../lib/check-in-result";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!request.headers.get("content-type")?.includes("application/json")) return json(415, { error: "Formato no válido." });

  let raw: Record<string, unknown>;
  try {
    const body = await readJsonLimited(request, 12_000);
    if (!body || typeof body !== "object" || Array.isArray(body)) return json(400, { error: "Datos no válidos." });
    raw = body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof BodyTooLargeError) return json(413, { error: "La solicitud es demasiado grande." });
    return json(400, { error: "Datos no válidos." });
  }
  if (raw.website) return json(400, { error: "No pudimos registrar la visita." });

  const ip = requestIp(request, clientAddress);
  if (!await verifyTurnstile(raw.turnstileToken, ip)) {
    return json(400, { error: "No pudimos procesar la solicitud." });
  }

  const parsed = checkInInputSchema.safeParse(raw);
  if (!parsed.success) {
    const consentIssue = parsed.error.issues.some((issue) => issue.path[0] === "consent");
    const ageIssue = parsed.error.issues.find((issue) => issue.path[0] === "birthday" && issue.message === "Debes tener 13 años o más.");
    return json(400, { error: consentIssue ? "Debes aceptar el consentimiento para continuar." : ageIssue?.message || "Revisa los datos del formulario." });
  }

  try {
    const service = createSupabaseServiceClient();
    const { data: business } = await service
      .from("businesses")
      .select("id, default_country, display_name")
      .eq("slug", parsed.data.slug)
      .eq("is_active", true)
      .is("cancelled_at", null)
      .maybeSingle();
    if (!business) return json(404, { error: "Este negocio no está disponible." });

    const phone = normalizePhone(parsed.data.phone, business.default_country);
    if (!phone) return json(400, { error: "Ingresa un número de teléfono válido." });

    const ipHash = hashIdentifier(`ip:${ip}`);
    const phoneHash = hashIdentifier(`phone:${phone}`);
    const { data: checkIn, error } = await service.rpc("record_public_check_in", {
      p_slug: parsed.data.slug,
      p_tag_code: parsed.data.tagCode || null,
      p_full_name: parsed.data.fullName,
      p_phone_e164: phone,
      p_birthday: parsed.data.birthday || null,
      p_consent_version: PRIVACY_NOTICE_VERSION,
      p_whatsapp_opt_in: parsed.data.whatsappOptIn,
      p_ip_hash: ipHash,
      p_phone_hash: phoneHash,
      p_user_agent: request.headers.get("user-agent") || "unknown",
    });

    if (error) {
      if (error.message.includes("rate_limit_exceeded")) {
        await recordSecurityAuditOnce(service, `check-in:${business.id}:${ipHash}`, {
          business_id: business.id,
          action: "security.check_in_rate_limit",
          entity_type: "business",
          entity_id: business.id,
          details: { surface: "public-check-in" },
        });
        return json(429, { error: "Espera unos minutos antes de registrar otra visita." });
      }
      if (error.message.includes("tag_not_found")) return json(404, { error: "Este NFC no está activo." });
      if (error.message.includes("business_not_found")) return json(404, { error: "Este negocio no está disponible." });
      console.error("check-in rpc failed", error.code);
      return json(500, { error: "No pudimos registrar la visita. Intenta de nuevo." });
    }

    return json(201, publicCheckInResponse(checkIn, parsed.data.fullName, business.display_name));
  } catch (error) {
    console.error("check-in failed", error instanceof Error ? error.message : "unknown");
    return json(500, { error: "No pudimos registrar la visita. Intenta de nuevo." });
  }
};
