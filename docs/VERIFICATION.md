# Verification

Updated: 2026-10-04. Sections below are chronological; the Reviewer's reconciliation at the end is the current state.

## Existing local gate

Last recorded full local gate: 2026-10-01.

- `npm run check` passed with zero errors.
- `npm test` passed 21 tests across four files.
- `npm run build` produced the standalone Node server.
- `npm audit` reported zero known vulnerabilities during installation.

Existing tests cover consent/field validation, phone normalization, slug/color/redirect rejection, dashboard metrics, RLS enabled on exposed tables, anonymous denial from check-in, security-invoker aggregate view, migration execution, seed data, atomic writes, and cross-tenant isolation.

## Existing browser verification

- `/demo` dashboard rendered correctly at desktop size.
- `/demo/capture` was exercised through confirmation after fixing a React hydration issue.

## Live Supabase verification — 2026-10-03

Project:
- name: `smart-tap`
- ref: `vrouyhxzxrfkuuqfslrc`
- region: `us-east-1`
- status: ACTIVE_HEALTHY

Observed public application tables all have RLS enabled:
`profiles`, `businesses`, `business_members`, `nfc_tags`, `customers`, `consent_records`, `visits`, `audit_log`.

Observed live migration history:
1. `20261002005131_initial_schema`
2. `20261002014439_review_hardening_rate_limit_helper`
3. `20261002014453_review_hardening_check_in_v2`
4. `20261002072441_one_visit_per_day`
5. `20261004010900_admin_rls_requires_aal2`

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

## Glasswing Shield

The control matrix (GS-01 to GS-60) lives in `docs/security/CONTROL_MATRIX.md`; it replaces the shorter §10.1 table recorded here earlier on 2026-10-02.

## Body limit — 2026-10-02

`readJsonLimited` counts the bytes actually read; a streamed 20 KB body without `Content-Length` is rejected (`tests/security.test.ts`). Before, the check relied on the header alone.

## Platform-admin MFA — local gate, 2026-10-02

Implementation follows the Supabase TOTP enrollment, challenge and verification flow. `getAuthIdentity` reads `aal` only after `getClaims` verifies the session token. A missing or different claim is treated as `aal1`.

Targeted tests in `tests/admin-mfa.test.ts` prove:

- an `aal1` platform admin is rejected by the shared admin guard with `mfa_required`;
- an `aal2` platform admin passes the guard;
- every protected admin page and API source uses the shared `requirePlatformAdmin` guard;
- middleware returns JSON HTTP 403 for an admin API request at `aal1`;
- middleware redirects an admin page request at `aal1` to `/admin/mfa` and preserves its local path.

Hosted enrollment, QR scanning, TOTP challenge, cookie refresh and the complete live smoke test remain pending until the local `.env` contains the Supabase secret key and the dashboard settings are complete.

The first PR run found two Gitleaks false positives in commit `6d53ba9`: the same Supabase publishable browser key documented twice in `docs/CODEX_NEXT.md`. `.gitleaksignore` contains only those two exact historical fingerprints. New findings, different files, lines, commits or rules continue to fail CI.

## Review of PR #1 (MFA) — Claude Code, 2026-10-04

Reviewed `3de6fac` and `f08ff95`. Two MFA bypasses found and fixed (D-020):

1. HIGH — `/dashboard` and `/api/dashboard/customer/[id]/delete` used `requireAuth`; a platform admin at `aal1` listed and deleted customers of every business. Now `requireDataAccess` + `assertBusinessAccess(identity)`; tests in `tests/admin-mfa.test.ts`.
2. HIGH — `private.is_platform_admin()` ignored AAL; an `aal1` admin token read all tenants through PostgREST. Hosted proof before the fix: aal1 admin saw 3 customers of a business it is not a member of. After the fix (hosted): aal1 → 0 customers and 0 businesses; aal2 → 3. Regression test `grants the platform-admin bypass only with a second factor` fails without the migration and passes with it.

`npm run verify`: 0 diagnostics, 41 of 41 tests. Migration applied to hosted Supabase as `admin_rls_requires_aal2`; test rows rolled back.

Accepted for this phase: an admin who has never enrolled a factor can enroll one at `aal1`, so the first enrollment must happen right after the account is created.

Function privilege inspection confirms the current nine-argument `public.record_public_check_in` is SECURITY DEFINER and executable by `service_role`, not by `anon`/`authenticated`. Private authorization helpers remain in the `private` schema; platform-admin authorization has a live AAL2 requirement.

## Supabase advisors

Security Advisor:
- WARN: leaked-password protection disabled.
- Classification: expected Free-plan limitation, not a release blocker. Supabase currently documents leaked-password protection as Pro-and-above only.
- Compensating controls: strong password policy, MFA/AAL2 for platform admin, restricted signup/invitations.

Performance Advisor:
- INFO only: five foreign keys lack covering indexes (`audit_log.actor_user_id`, `audit_log.business_id`, `consent_records.business_id`, `nfc_tags.business_id`, `visits.tag_id`).
- Decision: do not add indexes solely to silence INFO-level advice. Revisit if query plans or production workload show a need.

## Git/live drift found and reconciled

Before this verification, GitHub `main` contained only `20261001000000_initial_schema.sql`, while live Supabase had five migrations with different history/version numbers. The branch `ops/reconcile-live-2026-10-03` reconstructs the live migration sequence and replaces the stale initial migration version. Do not run `db push` from unreconciled `main` against production.

## Still requiring hosted verification

- production host/domain;
- production environment values;
- Auth Site URL and redirect URL;
- custom SMTP;
- actual invite/recovery delivery;
- hosted end-to-end flow;
- physical NFC read/write test;
- tenant A/B test using real authenticated business users.

Use `docs/PRODUCTION_SMOKE_TEST.md` once deployment is available. Do not repeat the full local audit unless intervening code changes affect previously verified surfaces.

## Reviewer reconciliation — Claude Code, 2026-10-04

Reviewed `ops/reconcile-live-2026-10-03` (13 commits by the CEO's ChatGPT session).

- Correct: migration files reproduce the live history; contents compared with the applied SQL — identical apart from transaction wrappers. Live state checked: 5 migrations, Café Luna demo only, admin confirmed with one MFA factor.
- Defect: the branch was cut from `main`, whose code calls the old 8-argument check-in function that the live database no longer lets any role execute. Deploying that branch would break every check-in. It was merged into `claude/mfa-review`, which has the matching code.
- Defect: with both branches merged, the migrations folder would hold two copies of three migrations, and a rebuild would fail on duplicate objects. The duplicates under the old names were removed; the live names were kept.
- Gap: the manual revoke of the old function was not in any file. Added `20261004021305_revoke_legacy_check_in.sql`, the version the live database assigned when it was applied.
- The handoff instruction "Codex should continue implementation on main" was replaced: work continues on the PR branch.
