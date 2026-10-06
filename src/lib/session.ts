import type { AstroCookies } from "astro";

// D-058: Auth errors that mean the browser holds a session the server no
// longer honors (revoked, logged out elsewhere, password changed, refresh
// token gone, expired JWT). These end in a clean sign-in, never a 500.
const invalidSessionCodes = new Set([
  "session_not_found", "session_expired", "refresh_token_not_found", "refresh_token_already_used",
  "bad_jwt", "user_not_found", "no_authorization",
]);
const invalidSessionNames = new Set(["AuthSessionMissingError", "AuthInvalidJwtError", "AuthInvalidTokenResponseError"]);

export function isInvalidSessionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, code, status } = error as { name?: unknown; code?: unknown; status?: unknown };
  if (typeof name === "string" && invalidSessionNames.has(name)) return true;
  if (typeof code === "string" && invalidSessionCodes.has(code)) return true;
  return name === "AuthApiError" && (status === 401 || status === 403 || status === 404);
}

// Supabase SSR stores the session in `sb-<ref>-auth-token`, split into `.0`,
// `.1`… chunks when large, plus a PKCE verifier during sign-in flows.
const supabaseSessionCookie = /^sb-[A-Za-z0-9-]+-auth-token(?:-code-verifier)?(?:\.\d+)?$/;

export function supabaseSessionCookieNames(cookieHeader: string | null): string[] {
  if (!cookieHeader) return [];
  return cookieHeader.split(";")
    .map((part) => part.split("=")[0]?.trim() ?? "")
    .filter((name) => supabaseSessionCookie.test(name));
}

export function clearSupabaseSessionCookies(request: Request, cookies: AstroCookies): string[] {
  const names = supabaseSessionCookieNames(request.headers.get("cookie"));
  for (const name of names) cookies.delete(name, { path: "/" });
  return names;
}
