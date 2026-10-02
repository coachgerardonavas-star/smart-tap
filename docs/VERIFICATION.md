# Verification

Last full local gate: 2026-10-01.

## Automated

`npm run check` passed with zero errors. `npm test` passed 21 tests across four files. `npm run build` produced the standalone Node server.

The tests cover:

- consent and field validation;
- phone normalization;
- slug, color, and redirect rejection;
- dashboard counts, repeat visits, inactivity, and birthdays;
- RLS enabled on every exposed table;
- anonymous roles denied from the check-in function;
- security-invoker aggregate view;
- full migration execution in PostgreSQL;
- demo seed creation;
- atomic customer, consent, and visit insertion;
- real RLS isolation between two businesses.

## Browser

The local `/demo` dashboard was checked at desktop size. Layout, metrics, customer table, and birthdays rendered correctly.

The local `/demo/capture` flow was checked in the browser. The form initially exposed a React hydration error. The TypeScript JSX override was removed, the server was restarted, and the form then rendered. A fictitious customer completed the flow and reached the visit confirmation.

## Dependency and build checks

All runtime dependencies are exact versions in `package.json` and `package-lock.json`. `npm audit` reported zero known vulnerabilities during installation.

## Remaining verification

Supabase CLI and Docker are unavailable on this laptop, and no hosted Supabase credentials were supplied. The migration ran under embedded PostgreSQL, while Supabase-specific hosted behavior, SMTP delivery, token-hash invitation links, and the production deploy still need a live smoke test after credentials are connected.

## Independent review — Claude Code, 2026-10-02

Base reviewed: `f1ec5d3`. Environment: Linux, Node 22, clone of the GitHub repository at that commit.

Builder's gate reproduced: `npm ci`, `npm run verify` passed (0 check diagnostics, 21 tests, build complete) before any change.

New automated checks (`npm test`: 28 tests across 5 files):

- `tests/security.test.ts`: a spoofed `X-Forwarded-For` is ignored without `TRUSTED_IP_HEADER`; the trusted header uses its proxy-appended entry; the socket address is the fallback.
- `tests/validation.test.ts`: `/\evil.example`, a tab-prefixed path, and dot segments cannot leave the site through `next`.
- `tests/database-integration.test.ts` now applies every migration in order and checks: 20 customers on one shared IP all check in; a fourth submission for one phone inside ten minutes is rejected; a call without keyed identifiers is rejected; `anon` has no select on `customer_visit_counts` and no execute on the check-in function.
- `tests/migration-security.test.ts` reads all migrations.

Build output checks:

- Built with canary values in `.env`: no canary string remains anywhere in `dist/` (before the fix, `SUPABASE_SECRET_KEY` and `CHECK_IN_HASH_SECRET` were present in `dist/server/chunks`, and `redirectTo` compiled to `undefined/auth/callback`).
- Built server started with runtime-only variables: `/demo` and `/demo/capture` 200; `/dashboard` and `/admin` redirect anonymous users to `/login?next=…`; anonymous customer delete 401; cross-origin form POST to login 403; `next=/\evil.example` falls back to `/dashboard`; check-in without consent rejected; CSP, `X-Frame-Options` and `nosniff` present.

Not run here: hosted Supabase, SMTP, real invitations and recovery, HTTPS deploy, physical NFC, browser screenshots of the new pause buttons on the admin page.

## Hosted Supabase — Claude Code, 2026-10-02

Project `smart-tap` (ref `vrouyhxzxrfkuuqfslrc`, us-east-1, organization Automate IT, free plan). To fit the free-plan limit of two active projects, `automate-it-job-tracker` was paused at the CEO's request.

Applied:

- `initial_schema` — migration 1 unchanged.
- `review_hardening_rate_limit_helper` and `review_hardening_check_in_v2` — migration 2 without its first `drop function` line. The Supabase MCP connector stalled on the destructive statement, so the old eight-argument function was neutralized instead: `revoke all ... from public, anon, authenticated, service_role`. Dropping it in the SQL Editor is optional: `drop function public.record_public_check_in(text, text, text, text, date, text, text, text);`
- `supabase/seed.sql` — Café Luna, 3 customers, 7 visits.

Live checks, run inside one PL/pgSQL block that ends in an exception so every test row rolls back (confirmed afterwards: 3 customers, 7 visits, 0 Auth users, 0 limiter rows):

| Check | Result |
|---|---|
| Profile trigger on `auth.users` insert | 2 of 2 profiles created |
| Check-in creates customer, consent and visit | 1 visit |
| Unknown NFC code | `tag_not_found` |
| 4th submission for one phone in 10 minutes | `rate_limit_exceeded` |
| 20 customers from one shared IP | all accepted |
| Viewer of Café Luna reading another business's customers / view rows | 0 / 0 |
| Viewer total customers, businesses, memberships | own tenant only (4, 1, 1) |
| Owner of another business reading Café Luna customers / consents | 0 / 0 |
| Authenticated user sets own `platform_role` | permission denied |
| `anon` reading customers | permission denied |
| Execute check-in: anon / authenticated / service_role | false / false / true |
| Old check-in function for service_role | false |
| Supabase security advisor | 0 lints |

Note: `audit_log` has a platform-admin select policy but no table grant to `authenticated`, so audit rows are readable only through the server. This is safe; the policy is unused.

Not verified: the application against this project, because the secret key is not available to the connector. Auth settings, SMTP, email templates and redirect URLs are dashboard settings not reachable from the connector.

## One visit per day — 2026-10-02

- Migration `20261002010000_one_visit_per_day.sql`; `npm run verify`: 0 diagnostics, 30 tests.
- Tests: second same-day check-in returns `alreadyCounted: true` and keeps `visitCount` at 1 while appending a second consent record; a visit moved to the previous day lets the next check-in count again.
- Hosted Supabase: migration applied as `one_visit_per_day`; live call pair returned `{visitCount: 1, alreadyCounted: false}` then `{visitCount: 1, alreadyCounted: true}`; anon cannot execute, service_role can. Test rows rolled back.

## Glasswing Secure Build Gate (Manual Maestro §10.1) — status 2026-10-02

| Control | Status | Evidence or gap |
|---|---|---|
| Secrets and credentials | PASS | Runtime `astro:env` (D-013); canary build has no secrets in `dist/`; `.env` git-ignored; secret key never in chat. |
| Authentication | PASS (live pending) | Supabase Auth, `getClaims`, token-hash invite/recovery; live flow in Codex smoke test. |
| Authorization and least privilege | PASS | Platform admin on every admin route; owner/manager for deletion; viewer read-only; hosted grants verified. |
| Input validation | PASS | Zod schemas, E.164 phone, slug, colors, URLs, birthday, `next` path. |
| Rate limiting | PASS | 40/IP and 3/phone per 10 min, spoof-proof IP (D-014). |
| RLS and access control | PASS | Hosted cross-tenant checks: 0 rows across tenants; self-promotion denied. |
| Tenant isolation | PASS | Server never trusts a client `business_id`; delete filters by tenant and customer. |
| Webhooks and replay | N/A | No webhooks. |
| Once-only operations, atomicity, races | PASS | One visit per day under row lock (D-017); check-in atomic; invitation links single-use (Supabase). |
| Dependencies | PASS | `npm audit` 0 vulnerabilities; exact versions. |
| CI/CD | ADDED | `.github/workflows/verify.yml` runs audit + verify on PRs and `main`. Branch protection on `main` must be enabled in GitHub settings. |
| CORS and headers | PASS (HSTS pending) | Same-origin only, CSP, frame deny, nosniff, origin check; HSTS at the HTTPS host. |
| Storage | N/A | No file storage. |
| Logs and sensitive data | PASS | Logs carry error codes only; IP stored as keyed hash; no secrets logged. |
| Backups and recovery | OPEN | Free plan offers no project backups. CEO decision: Pro plan (daily backups) before real customer data, or a scheduled export. |
| Monitoring | OPEN | No uptime or error monitoring. Add the Smart Tap URL to the `health-check` Worker once deployed. |
| MFA | OPEN — critical | Platform admins see every tenant's personal data and have no second factor. Required by §10.2 before real customer data: Supabase TOTP MFA, `aal2` enforced for `/admin` and admin APIs. Supabase dashboard account also needs MFA. |
| AI endpoints | N/A | No AI in the MVP. |

Gate result: not passed yet. Three items stay open (MFA, backups, monitoring); MFA is the only one that blocks loading real customer data.
