# Setup and activation

## Requirements

- Node.js 22 or newer
- npm 11 or newer
- A Supabase project
- A Node-compatible HTTPS host for production

## Local application

```powershell
cd C:\automate-it\smart-tap
Copy-Item .env.example .env
npm install
npm run dev
```

Generate `CHECK_IN_HASH_SECRET` with at least 32 random characters. Keep `.env` outside Git.

## Supabase

Apply every file in `supabase/migrations/` in name order (`20261001000000_initial_schema.sql`, then `20261002000000_review_hardening.sql`), then `supabase/seed.sql`. The Supabase CLI can run them after the project is linked. The SQL Editor can also apply each file in order.

Set these values in `.env` and in the production host:

```text
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
PUBLIC_SITE_URL=
CHECK_IN_HASH_SECRET=
ADMIN_BOOTSTRAP_EMAIL=
TRUSTED_IP_HEADER=
```

The server reads these values at runtime. Set them in the host's environment; a rebuild is not required after changing them, and the build output contains none of them.

Set `TRUSTED_IP_HEADER` only to a header your proxy overwrites: `cf-connecting-ip` behind Cloudflare, `x-forwarded-for` behind a single reverse proxy. With no proxy, leave it empty. A wrong value lets a client choose its own rate-limit identity.

Create the bootstrap email in Supabase Auth and confirm it. On its first authenticated request with a confirmed email, the server sets its `profiles.platform_role` to `platform_admin`.

In Supabase Auth settings:

1. Disable public signup.
2. Keep email confirmation enabled.
3. Add `{PUBLIC_SITE_URL}/auth/callback` to allowed redirect URLs.
4. Set the Site URL to `PUBLIC_SITE_URL`.
5. Configure custom SMTP before inviting commercial users.
6. Replace the hosted **Invite user** template with `supabase/templates/invite.html`.
7. Replace the hosted **Reset password** template with `supabase/templates/recovery.html`.
8. Require a password length of at least 12 and enable leaked-password protection when the plan supports it.

## First live test

1. Sign in as the bootstrap admin.
2. Open `/admin` and create a business.
3. Copy its NFC URL from the business page.
4. Open the URL in a private browser window and submit a test customer.
5. Open `/dashboard` and confirm the customer, consent, and visit.
6. Submit the same phone again and confirm the visit count rises.
7. Delete the test customer from the dashboard.
8. Create a second business user and confirm it cannot see the first business.

## NFC writing

Write the exact HTTPS URL shown beside each tag in the admin page. Lock the tag only after one phone opens the URL and completes a real test visit.

## Production command

```powershell
npm ci
npm run verify
npm run build
node dist/server/entry.mjs
```
