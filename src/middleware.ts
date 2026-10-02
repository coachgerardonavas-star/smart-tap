import { defineMiddleware } from "astro:middleware";
import { AuthorizationError } from "./lib/auth";

export const onRequest = defineMiddleware(async (context, next) => {
  let response: Response;
  try {
    response = await next();
  } catch (error) {
    if (!(error instanceof AuthorizationError)) throw error;
    if (error.status === 401) {
      if (context.url.pathname.startsWith("/api/")) {
        response = new Response(JSON.stringify({ error: "Debes iniciar sesión." }), { status: 401, headers: { "content-type": "application/json" } });
      } else {
        const login = new URL("/login", context.url);
        login.searchParams.set("next", `${context.url.pathname}${context.url.search}`);
        response = context.redirect(login.toString(), 302);
      }
    } else if (error.reason === "mfa_required" && !context.url.pathname.startsWith("/api/")) {
      const mfa = new URL("/admin/mfa", context.url);
      mfa.searchParams.set("next", `${context.url.pathname}${context.url.search}`);
      response = context.redirect(mfa.toString(), 302);
    } else if (error.reason === "mfa_required") {
      response = new Response(JSON.stringify({ error: "Debes confirmar el segundo factor." }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    } else {
      response = new Response("Acceso denegado", { status: 403 });
    }
  }
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  );
  if (context.url.pathname.startsWith("/dashboard") || context.url.pathname.startsWith("/admin")) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
});
