import type { APIRoute } from "astro";
import { siteUrl } from "../../../lib/env";
import { createSupabaseServerClient } from "../../../lib/supabase";
import { enforceAuthRateLimit } from "../../../lib/auth-rate-limit";
import { requestIp } from "../../../lib/security";
import { verifyTurnstile } from "../../../lib/turnstile";

export const POST: APIRoute = async ({ request, cookies, redirect, clientAddress }) => {
  const form = await request.formData();
  const email = String(form.get("email") || "").trim();
  if (!await verifyTurnstile(form.get("cf-turnstile-response"), requestIp(request, clientAddress))) {
    return new Response("No pudimos procesar la solicitud.", { status: 400 });
  }
  if (!await enforceAuthRateLimit("forgot_password", email, request, clientAddress)) {
    return redirect("/forgot-password?sent=1", 303);
  }
  if (email.includes("@") && email.length <= 254) {
    const supabase = createSupabaseServerClient(request, cookies);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/set-password`,
    });
  }
  return redirect("/forgot-password?sent=1", 303);
};
