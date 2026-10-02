# Smart Tap handoff

Updated: 2026-10-02 (Builder implementation of platform-admin MFA in progress)

## Project identity

- Absolute path: `C:\automate-it\smart-tap`
- Git repository: local repository initialized in the project root
- Branch: `codex/live-smoke-mfa`, based on `origin/claude/review-hardening`
- Builder: ChatGPT Codex
- Reviewer: Claude Code
- Stack: Astro 7, React 19, Supabase JS/SSR, PostgreSQL, Supabase Auth, Vitest

## Current state

The complete executable MVP is implemented. Public demo routes work without credentials. The live data path, Auth, invitations, dashboard, and admin require a Supabase project and environment values. No production project or deploy was changed because credentials and a target were not supplied.

The current Builder branch adds mandatory TOTP MFA for `platform_admin`. All protected `/admin` pages and `/api/admin` routes require a server-verified `aal2` claim. `/admin/mfa` handles enrollment and challenge at `aal1`. Local policy and response tests pass; the hosted QR flow and live smoke test still require the dashboard configuration listed in `docs/CODEX_NEXT.md`.

Estimated completion: 90% of the commercial MVP. Code review is complete; the remaining work is live activation, hosted verification, SMTP, domain deployment, and physical NFC writing. The earlier 92% estimate did not account for a build defect that would have prevented any live deploy (see review below).

## What works

- branded NFC landing, validation, consent, repeat identification, and confirmation;
- atomic customer, consent, and visit writes;
- database rate limiting and opaque NFC codes;
- strict tenant RLS and exact count dashboard;
- customers, visits per customer, latest visit, inactivity, and birthdays;
- Auth login, invitations, password setup, recovery, and logout;
- Automate IT business, branding, NFC, and member setup;
- audited admin changes and controlled customer deletion;
- responsive demo dashboard and capture flow;
- deterministic database seed.

## Key files

- Product scope: `specs/smart-tap.md`, `docs/PRODUCT.md`
- Architecture and decisions: `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`
- Database: `supabase/migrations/20261001000000_initial_schema.sql`
- Demo data: `supabase/seed.sql`
- Public capture: `src/pages/b/[slug].astro`, `src/pages/api/public/check-in.ts`
- Dashboard: `src/pages/dashboard/index.astro`
- Admin: `src/pages/admin/index.astro`, `src/pages/admin/[id].astro`
- Tests: `tests/`, `supabase/tests/`
- Activation: `docs/SETUP.md`
- Test record: `docs/VERIFICATION.md`

## Directory map

```text
smart-tap/
  docs/          product, architecture, decisions, setup, verification, handoff
  specs/         accepted MVP specification
  public/        static public assets
  src/
    components/  React and Astro UI
    layouts/     shared page layout
    lib/         Auth, tenant access, validation, metrics, Supabase clients
    pages/       public, Auth, dashboard, admin, and API routes
  supabase/
    migrations/  reproducible schema and security
    tests/       pgTAP catalog checks
    seed.sql     Café Luna demo data
  tests/         unit, security, and embedded PostgreSQL tests
```

## Review result — 2026-10-02

Verdict: approved with conditions. Code is ready for the live smoke test; it is not yet proven against hosted Supabase.

Fixed in the review commit:

1. Critical — `import.meta.env` compiled secrets into `dist/server` and ignored runtime host variables. Now `src/lib/env.ts` reads them at request time (D-013).
2. High — the check-in limiter trusted a client-supplied `X-Forwarded-For`, so one sender could rotate identities without limit, while customers behind one venue Wi-Fi shared an eight-per-ten-minutes bucket. New migration `20261002000000_review_hardening.sql` adds per-phone limiting and raises the per-IP window; `TRUSTED_IP_HEADER` controls proxy trust (D-014).
3. Medium — `safeNextPath` allowed `/\host`, an open redirect after login. Fixed and tested.
4. Medium — no way to remove a member's access or retire an NFC tag without SQL. Admin pause/activate added (D-016).
5. Low — bootstrap admin now requires a confirmed email (D-015); session cookies HTTP-only and `Secure` on HTTPS; `anon` lost its default grants on the aggregate view; explicit `service_role` grants.

Residual risks accepted for the MVP:

- Anyone who knows a customer's phone can submit under that phone: the name is overwritten and the confirmation shows the visit count. This follows D-003 (no phone verification).
- A customer who submits twice within ten minutes records two visits (up to three).
- When Supabase is unreachable, the landing and API answer "business not available" instead of a temporary error.
- The CSP keeps `'unsafe-inline'` for scripts; Astro output is escaped and no user HTML is rendered.
- HSTS must be set by the HTTPS host.

## Reviewer instructions

Open the existing folder directly. Do not scaffold another project or create a worktree.

```powershell
cd C:\automate-it\smart-tap
git status --short --branch
git log -1 --oneline
npm ci
npm run verify
```

Review these risks first:

1. RLS membership helpers and cross-tenant isolation.
2. Service-only execution of `record_public_check_in`.
3. Admin bootstrap, token-hash email templates, and invitation callback behavior against a live Supabase project.
4. Tenant authorization before every service-role query.
5. Production privacy notice and retention choices.

Use `docs/VERIFICATION.md` to avoid repeating settled checks unless a later change touches them.

## Glasswing Shield

Smart Tap is under Glasswing Shield v1.0 (ADN `Glasswing_Shield.md`). Matrix: `docs/security/CONTROL_MATRIX.md`. Gate NOT APPROVED: open HIGH controls GS-03 (admin MFA), GS-25 (backups), GS-29 (separate production project). Next Builder task: `docs/CODEX_NEXT.md`.

## Hosted Supabase status

Project `smart-tap`, URL `https://vrouyhxzxrfkuuqfslrc.supabase.co`. Both migrations and the seed are applied, and the live RLS, rate-limit and privilege checks passed (see `docs/VERIFICATION.md`). Three migrations are applied (the third is `one_visit_per_day`). Pending in the dashboard: Auth settings, SMTP, templates, redirect URLs, bootstrap admin user, and copying the secret key to the host.

## Real blockers

Apply `supabase/migrations/` in name order — there are now two files.

- Supabase project URL, publishable key, secret key, and Auth access.
- Production SMTP configuration.
- Production host, domain, and deployment credentials.
- Business-specific logo, colors, privacy notice, and NFC hardware.

Continue with `docs/SETUP.md` when these inputs are available.
