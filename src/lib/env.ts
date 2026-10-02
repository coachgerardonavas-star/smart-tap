import { getSecret } from "astro:env/server";

export type ServerEnvName =
  | "PUBLIC_SUPABASE_URL"
  | "PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  | "SUPABASE_SECRET_KEY"
  | "PUBLIC_SITE_URL"
  | "CHECK_IN_HASH_SECRET"
  | "ADMIN_BOOTSTRAP_EMAIL"
  | "TRUSTED_IP_HEADER";

// Read at request time. `import.meta.env` is inlined by Vite at build time:
// it bakes secrets into dist/ and ignores the host's runtime variables.
export function serverEnv(name: ServerEnvName): string | undefined {
  const value = getSecret(name);
  return value ? value : undefined;
}

export function requiredEnv(name: ServerEnvName): string {
  const value = serverEnv(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function siteUrl(): string {
  return requiredEnv("PUBLIC_SITE_URL").replace(/\/+$/, "");
}
