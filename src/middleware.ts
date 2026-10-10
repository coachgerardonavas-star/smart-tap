import { defineMiddleware } from "astro:middleware";
import { AuthorizationError } from "./lib/auth";
import { TermsAcceptanceRequiredError } from "./lib/terms-access";
import { errorPageResponse, htmlContentType, jsonErrorResponse } from "./lib/error-page";
import { clearSupabaseSessionCookies } from "./lib/session";

export const onRequest = defineMiddleware(async (context, next) => {
  const isApi = context.url.pathname.startsWith("/api/");
  let response: Response;
  try {
    response = await next();
  } catch (error) {
    if (error instanceof TermsAcceptanceRequiredError) {
      if (context.url.pathname.startsWith("/api/dashboard")) {
        response = new Response(JSON.stringify({ error: "Debes aceptar los Términos de servicio vigentes." }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      } else {
        const accept = new URL("/terms/accept", context.url);
        accept.searchParams.set("business", error.businessId);
        accept.searchParams.set("next", `${context.url.pathname}${context.url.search}`);
        response = context.redirect(accept.toString(), 302);
      }
    } else if (!(error instanceof AuthorizationError)) {
      // D-058: an unexpected error never leaves as an empty, untyped 500.
      console.error("request failed", context.url.pathname, error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 200) : "unknown");
      response = isApi ? jsonErrorResponse(500, "No pudimos completar la solicitud.") : errorPageResponse(500);
    } else {
      if (error.status === 401) {
        // A missing, revoked or expired session: drop the stale Supabase
        // cookies so the next sign-in starts clean.
        clearSupabaseSessionCookies(context.request, context.cookies);
        if (isApi) {
          response = new Response(JSON.stringify({ error: "Debes iniciar sesión." }), { status: 401, headers: { "content-type": "application/json" } });
        } else {
          const login = new URL("/login", context.url);
          login.searchParams.set("next", `${context.url.pathname}${context.url.search}`);
          response = context.redirect(login.toString(), 302);
        }
      } else if (error.reason === "mfa_required" && !context.url.pathname.startsWith("/api/")) {
        const mfa = new URL("/mfa", context.url);
        mfa.searchParams.set("next", `${context.url.pathname}${context.url.search}`);
        response = context.redirect(mfa.toString(), 302);
      } else if (error.reason === "mfa_required") {
        response = new Response(JSON.stringify({ error: "Debes confirmar el segundo factor." }), {
          status: 403,
          headers: { "content-type": "application/json" },
        });
      } else {
        response = isApi ? jsonErrorResponse(403, "Acceso denegado.") : errorPageResponse(403);
      }
    }
  }
  // Safety net: a page error without a content type would be downloaded.
  if (!isApi && response.status >= 400 && !response.headers.get("content-type")) {
    const replacement = errorPageResponse(response.status === 404 || response.status === 403 ? response.status : 500);
    response = new Response(replacement.body, { status: response.status, headers: response.headers });
    response.headers.set("content-type", htmlContentType);
    response.headers.set("cache-control", "no-store");
  }
  response.headers.set("X-Content-Type-Options", "nosniff");
  const isPreview = context.url.pathname.startsWith("/preview/");
  response.headers.set("X-Frame-Options", isPreview ? "SAMEORIGIN" : "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Strict-Transport-Security", "max-age=31536000");
  response.headers.set(
    "Content-Security-Policy",
    `default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; frame-src https://challenges.cloudflare.com; base-uri 'self'; form-action 'self'; frame-ancestors ${isPreview ? "'self'" : "'none'"}`,
  );
  if (context.url.pathname.startsWith("/dashboard") || context.url.pathname.startsWith("/admin") || context.url.pathname.startsWith("/mfa") || isPreview) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
});
