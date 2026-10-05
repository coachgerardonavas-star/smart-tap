import type { APIRoute } from "astro";
import { createSupabaseServerClient } from "../../../lib/supabase";
import { loginInputSchema, safeNextPath } from "../../../lib/validation";
import { enforceAuthRateLimit } from "../../../lib/auth-rate-limit";
import { requestIp } from "../../../lib/security";
import { verifyTurnstile } from "../../../lib/turnstile";

export const POST: APIRoute = async ({ request, cookies, redirect, clientAddress }) => {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  const next = safeNextPath(form.get("next"));
  if (!await verifyTurnstile(form.get("cf-turnstile-response"), requestIp(request, clientAddress))) {
    return new Response("No pudimos procesar la solicitud.", { status: 400 });
  }
  if (!await enforceAuthRateLimit("login", email, request, clientAddress)) {
    return redirect(`/login?error=1&next=${encodeURIComponent(next)}`, 303);
  }
  const parsed = loginInputSchema.safeParse({ email, password: form.get("password") });
  if (!parsed.success) return redirect(`/login?error=1&next=${encodeURIComponent(next)}`, 303);

  const supabase = createSupabaseServerClient(request, cookies);
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return redirect(`/login?error=1&next=${encodeURIComponent(next)}`, 303);
  return redirect(next, 303);
};
