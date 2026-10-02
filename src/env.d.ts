/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  readonly SUPABASE_SECRET_KEY: string;
  readonly PUBLIC_SITE_URL: string;
  readonly CHECK_IN_HASH_SECRET: string;
  readonly ADMIN_BOOTSTRAP_EMAIL?: string;
  readonly TRUSTED_IP_HEADER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
