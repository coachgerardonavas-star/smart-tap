# Setup and activation

## Current production backend

A Supabase project already exists and is active:

- Project: `smart-tap`
- Ref: `vrouyhxzxrfkuuqfslrc`
- Region: `us-east-1`

Do **not** create a second Supabase project for this app unless there is an explicit environment-separation decision.

## Requirements

- Node.js 22 or newer
- npm 11 or newer
- access to the existing Supabase project
- a Node-compatible HTTPS host for production

## Local application

```powershell
cd C:\automate-it\smart-tap
Copy-Item .env.example .env
npm install
npm run dev
```

Generate `CHECK_IN_HASH_SECRET` with at least 32 random characters. Keep `.env` outside Git.

## Environment

Set these values locally and in the production host:

```text
PUBLIC_SUPABASE_URL=
PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
PUBLIC_SITE_URL=
CHECK_IN_HASH_SECRET=
ADMIN_BOOTSTRAP_EMAIL=
```

Never commit the secret key or `CHECK_IN_HASH_SECRET`.

## Migration state

The production Supabase database already contains these migrations:

1. `20261002005131_initial_schema`
2. `20261002014439_review_hardening_rate_limit_helper`
3. `20261002014453_review_hardening_check_in_v2`
4. `20261002072441_one_visit_per_day`
5. `20261004010900_admin_rls_requires_aal2`

Use the reconciled migration history before any future `db push`. Do not apply the stale `20261001000000_initial_schema` filename against production.

## Supabase Auth production configuration

Before commercial use:

1. Disable public signup.
2. Keep email confirmation enabled.
3. Set Site URL to the final `PUBLIC_SITE_URL`.
4. Add `{PUBLIC_SITE_URL}/auth/callback` to allowed redirect URLs.
5. Configure custom SMTP before inviting commercial users.
6. Use `supabase/templates/invite.html` for Invite user.
7. Use `supabase/templates/recovery.html` for Reset password.
8. Require password length of at least 12.
9. Enroll the platform administrator in MFA so admin authorization reaches AAL2.
10. Leaked-password protection is Pro-and-above only. Enable it after a Pro upgrade; its absence on Free is not an activation blocker.

## Production command

```powershell
npm ci
npm run verify
npm run build
node dist/server/entry.mjs
```

## Go-live

After deployment, run `docs/PRODUCTION_SMOKE_TEST.md` rather than repeating the complete local audit.

## NFC

Follow `docs/NFC_OPERATIONS.md`. Write the exact HTTPS URL shown for the intended tag and lock the physical NFC only after a phone opens it and completes a real test check-in.

## Client activation

Follow `docs/CLIENT_ONBOARDING.md` so each new customer is configured without custom development.
