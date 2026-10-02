import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";
import { requiredEnv, serverEnv } from "./env";

export function createSupabaseServerClient(request: Request, cookies: AstroCookies) {
  return createServerClient(
    requiredEnv("PUBLIC_SUPABASE_URL"),
    requiredEnv("PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return parseCookieHeader(request.headers.get("Cookie") ?? "").map(({ name, value }) => ({ name, value }));
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookies.set(name, value, { ...options, httpOnly: true, secure: secureCookies() });
          }
        },
      },
    },
  );
}

export function createSupabaseServiceClient() {
  return createClient(
    requiredEnv("PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SECRET_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}

export function hasSupabaseConfiguration(): boolean {
  return Boolean(
    serverEnv("PUBLIC_SUPABASE_URL") &&
      serverEnv("PUBLIC_SUPABASE_PUBLISHABLE_KEY") &&
      serverEnv("SUPABASE_SECRET_KEY"),
  );
}

// The browser never uses a Supabase client, so session cookies can be HTTP-only.
function secureCookies(): boolean {
  return serverEnv("PUBLIC_SITE_URL")?.startsWith("https://") ?? false;
}
