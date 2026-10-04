import type { APIRoute } from "astro";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "../../lib/supabase";
import { safeNextPath } from "../../lib/validation";

const OTP_TYPES = ["invite", "recovery", "email", "signup", "magiclink"] as const;
const TOKEN_HASH = /^[A-Za-z0-9_-]{8,200}$/;

function isOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (OTP_TYPES as readonly string[]).includes(value);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

// D-021 / GS-42: email scanners prefetch links with GET. A single-use token_hash is
// therefore only consumed by the POST that a person sends with the button below.
function confirmationPage(tokenHash: string, type: EmailOtpType, next: string): Response {
  const title = type === "recovery" ? "Crea tu nueva contraseña" : "Activa tu acceso";
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${title} | Smart Tap</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#f8fafc;color:#101828}main{width:min(100% - 32px,420px);padding:32px;border:1px solid #e4e7ec;border-radius:16px;background:#fff}h1{font-size:1.6rem;margin:0 0 12px}p{color:#475467;line-height:1.6}button{width:100%;min-height:48px;border:0;border-radius:10px;background:#155eef;color:#fff;font-size:1rem;font-weight:700;cursor:pointer}</style></head>
<body><main><h1>${title}</h1><p>Pulsa el botón para continuar. El enlace funciona una sola vez.</p>
<form method="post" action="/auth/callback"><input type="hidden" name="token_hash" value="${escapeHtml(tokenHash)}"><input type="hidden" name="type" value="${escapeHtml(type)}"><input type="hidden" name="next" value="${escapeHtml(next)}"><button type="submit">Continuar</button></form></main></body></html>`;
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "referrer-policy": "no-referrer" },
  });
}

export const GET: APIRoute = async ({ request, cookies, url, redirect }) => {
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const next = safeNextPath(url.searchParams.get("next"));
  if (tokenHash && TOKEN_HASH.test(tokenHash) && isOtpType(type)) return confirmationPage(tokenHash, type, next);

  // PKCE code exchange needs the verifier cookie of the browser that started the flow,
  // so a prefetching scanner cannot consume it.
  const code = url.searchParams.get("code");
  if (!code) return redirect("/login?error=1", 303);
  const supabase = createSupabaseServerClient(request, cookies);
  const flowId = url.searchParams.get("sb_flow_id");
  const { error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);
  return redirect(error ? "/login?error=1" : next, 303);
};

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const tokenHash = String(form.get("token_hash") ?? "");
  const type = form.get("type");
  const next = safeNextPath(form.get("next"));
  if (!TOKEN_HASH.test(tokenHash) || typeof type !== "string" || !isOtpType(type)) return redirect("/login?error=1", 303);
  const supabase = createSupabaseServerClient(request, cookies);
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  return redirect(error ? "/login?error=1" : next, 303);
};
