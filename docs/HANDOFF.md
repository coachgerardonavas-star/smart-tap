# Smart Tap handoff

Updated: 2026-10-03 (hosted smoke test and cleanup complete)

## Project identity

- Absolute path: `C:\automate-it\smart-tap`
- Git repository: local repository initialized in the project root
- Branch: `codex/live-smoke-mfa`, based on `origin/claude/review-hardening`
- Pull request: #1, `https://github.com/coachgerardonavas-star/smart-tap/pull/1`, open against `main`
- Builder: ChatGPT Codex
- Reviewer: Claude Code
- Stack: Astro 7, React 19, Supabase JS/SSR, PostgreSQL, Supabase Auth, Vitest

## Current state

The complete executable MVP is implemented and the main hosted data path was exercised against Supabase. Mandatory TOTP MFA for `platform_admin`, public capture, same-day idempotency, dashboard reads, NFC pause/reactivation, invitations, viewer isolation, member pause and customer cascade deletion all passed live. Test data and the viewer account were removed after verification; Café Luna and the administrator remain.

The default recovery email path is blocked by link prefetch: three new messages reached Supabase as already consumed. Recovery itself passed with a fresh server-generated one-time token. D-020 and `docs/VERIFICATION.md` record the production requirement for custom SMTP, disabled tracking and a two-step recovery template.

Estimated completion: 96% of the demonstration MVP and 82% of production readiness. Code and hosted application behavior are verified. Commercial launch still needs SMTP/recovery hardening, backups, a separate production project, a host/domain decision, business privacy text and physical NFC writing.

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

Project `smart-tap`, URL `https://vrouyhxzxrfkuuqfslrc.supabase.co`. Three migrations and the seed are applied. Live RLS, rate-limit, privilege, Auth, MFA and application smoke checks passed as recorded in `docs/VERIFICATION.md`. The Site URL and callback redirect are configured. The platform admin remains; the `review-live` business and viewer user were removed. Custom SMTP and editable prefetch-safe templates remain open.

## Real blockers

- GS-25: the Supabase free plan has no managed backups; choose Pro or implement and restore-test scheduled exports before real customer data.
- GS-29: staging and production still share one Supabase project; provision a separate production project before real customer data.
- Configure production SMTP, disable link tracking and install the prefetch-safe recovery template from D-020.
- Enable `main` branch protection with required pull requests and the `verify` status check.
- Production host/domain, business privacy text and physical NFC programming remain outside this no-deploy task.
- Optional cleanup: drop the revoked eight-argument `record_public_check_in` function in the Supabase SQL Editor.
