# Verification

Updated: 2026-10-04. Sections below are chronological; the Reviewer's reconciliation at the end is the current state.

## PR #4 D-045 alignment and Terms of Service — ChatGPT Codex, 2026-10-04

Base: `codex/privacy-notice` merged with `origin/claude/launch-prep` through `6aec739`. No rebase, force-push, deploy, hosted migration or `db push` occurred.

| Requirement | Result | Evidence |
|---|---|---|
| Approved privacy text | PASSED | `tests/privacy.test.ts` reconstructs both rendered languages and compares them word for word with `docs/PRIVACY_NOTICE.md`; the cancellation sentence now states a 30-day download window and deletion at 90 days. |
| Cancellation purge | PASSED | PGlite deletes customer data at 91 days, preserves it at 31 days, cascades visits/consents/follow-ups and writes count-only audits. |
| Export beyond 1,000 | PASSED | `fetchAllPages` retrieved and serialized 2,105 customer-shaped rows over three ranges; the route pages both customers and visit-count rows with stable ordering. |
| Export window | PASSED | Active businesses and the exact 30-day boundary pass; one second beyond the boundary fails. The route returns HTTP 410 with `La ventana de descarga de 30 días terminó.` |
| E.164 CSV phone | PASSED | `+13055550100` remains unchanged; formula-like customer names still receive the spreadsheet-neutralizing prefix. |
| Approved Terms text | PASSED | `tests/terms.test.ts` reconstructs `/terms` in Spanish and English and compares it word for word with `docs/TERMS_OF_SERVICE.md`. |
| Acceptance before dashboard | PASSED | Missing current acceptance redirects HTML to `/terms/accept` and returns 403 JSON for dashboard APIs. Every current dashboard data/API route has the gate; platform admins are exempt. |
| Current server version | PASSED | The POST route sends `TERMS_VERSION`; the browser form has no version field and its required checkbox starts unchecked. |
| Idempotency and new version | PASSED | PGlite records the same user/business/version once; an older row does not satisfy the current version and the current version creates a separate row. |
| Cross-tenant and RLS | PASSED | The service-only function rejects another business, authenticated direct insert is denied, and another tenant reads zero acceptance rows. |
| Audit data | PASSED | Each first acceptance writes one `terms.accepted` audit; `details` contains only `version`. |

Commands and results:

- Targeted gate: 4 files, 59/59 tests; Astro check 0 errors, warnings or hints.
- Full pre-clean-install suite: 12 files, 107/107 tests; the final privilege regression raised the suite to 108 tests.
- `npm ci`: 326 packages installed; 0 vulnerabilities.
- `npm run audit:prod`: strict production audit; 0 vulnerabilities.
- Final `npm run verify`: 0 Astro errors, warnings or hints; 12 files and 108/108 tests; standalone Node build complete.
- Screenshots: `docs/evidence/privacy-cafe-luna-390x844.png` and `docs/evidence/terms-accept-390x844.png`, each measured at exactly 390×844 and visually checked without horizontal clipping. The production components were rendered with local data fixtures because the migration intentionally remains unapplied; all fixture routes and capture scripts were removed afterward.
- GitHub Actions: PR #4 implementation commit `acf0459` passed `verify` in 37 seconds, run `37225896122`, job `111505352601`.

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

- Migration now reconciled as `20261002072441_one_visit_per_day.sql`; `npm run verify`: 0 diagnostics, 30 tests at the time of that change.
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

## Hosted application smoke test — ChatGPT Codex, 2026-10-03

Target: hosted Supabase project `vrouyhxzxrfkuuqfslrc` with the standalone Node build running locally from runtime environment variables at `127.0.0.1:4321`. No production deployment was made.

| Step | Result | Evidence |
|---|---|---|
| Admin login and MFA | PASSED | TOTP factor enrolled and verified; `/admin` opened only after AAL2. |
| Create `review-live` | PASSED | Business, one NFC tag and admin page created through the application. |
| Public check-in | PASSED | Fictitious customer created with one visit and one birthday. Repeating the phone returned `alreadyCounted: true`; visit count stayed at 1 and consent history reached 2. |
| Dashboard | PASSED | `Review Live` showed 1 customer, 1 visit and the October 15 birthday. |
| NFC emergency stop | PASSED | Paused tag made the check-in API answer 404 `Este NFC no está activo.`; reactivation restored it. |
| Viewer isolation | PASSED | Second account accepted the invite, saw only `Review Live`, had no Delete action and received `Acceso denegado` at `/admin`. |
| Viewer pause | PASSED | Membership changed from active to paused; refresh displayed `Aún no tienes un negocio asignado`. |
| Password recovery | PARTIAL / EXTERNAL BLOCKER | Three default email links immediately returned `otp_expired`. A fresh server-generated one-time recovery token reached `/set-password`, changed the password and cleared the recovery marker. D-022 records the production email fix. |
| Customer deletion | PASSED | Before: 1 visit and 2 consent records. After: customer 0, visits 0, consents 0. Audit event retained. |
| Cleanup | PASSED | `review-live`, membership, NFC, customers, consents and visits count 0; viewer Auth user absent. Café Luna count 1 and platform admin present. |

Hosted Auth configuration observed: signup disabled, email confirmation enabled, Site URL `http://localhost:4321`, callback redirect allowed, TOTP enrolled and enforced. The default mailer remains in use; the dashboard requires custom SMTP before templates can be edited. Supabase dashboard-account MFA and the minimum password policy were not independently observable.

## Post-merge local gate — ChatGPT Codex, 2026-10-04

The merged migration-security test now normalizes CRLF to LF before checking SQL, so the same assertion works on Windows and Linux. The first post-merge run exposed this test-only portability defect; application and migration code were unchanged.

`npm audit` reported `GHSA-ch52-4w7c-c8xp` through `http-cache-semantics@4.2.0`, Astro and `@astrojs/node`. The upstream advisory has no patched version as of 2026-10-04. Smart Tap does not use a shared HTTP response cache; the installed Astro distribution imports this package for remote asset build caching. D-023 adds a fail-closed audit gate limited to the exact advisory, dependency chain and version. Any other high or critical finding still fails CI.

Final local result after the merge: `npm run audit:prod` passed the narrow exception; `npm run verify` reported 0 Astro diagnostics, 41/41 tests and a complete standalone Node build. GitHub Actions run `37172436364` passed the same PR gate for commit `9dd0116`.
## Follow-up Queue local verification — ChatGPT Codex, 2026-10-04

Migration `20261004035554_follow_up_queue.sql` executed only inside PGlite as part of the automated suite. It was not applied to hosted Supabase and no `db push` ran.

Evidence:
- unchecked WhatsApp consent records the visit, leaves `whatsapp_opt_in = false` and creates no WhatsApp consent row;
- checked consent records version `whatsapp-2026-10-04`; a later unchecked visit preserves the opt-in;
- inactive, birthday, frequent and new rules pass, including New York date edges and the 30-day boundary;
- viewer, another-business member, foreign customer, no opt-in, stale opportunity and AAL1 platform admin paths are rejected; a pre-gate defect that converted guard errors to 500 was fixed so shared middleware returns 403;
- repeated contact actions keep one database row for the opportunity cycle;
- the redirect contains an E.164 digits-only path and the encoded server-built message; browser forms contain no phone or message fields;
- opt-out changes the current flag and appends consent plus audit records in one database function;
- RLS and grants keep follow-up writes and opt-out service-only.

Final local gate: `npm run audit:prod` passed D-023; `npm run verify` reported 0 Astro diagnostics, 63/63 tests and a complete standalone Node build. The synchronized baseline CI passed in GitHub Actions run `37173173020`. Feature CI passed for commit `48c6e9b` in GitHub Actions run `37174554236`.

## Reviewer pass on PR #1 up to 84ca9ae — 2026-10-04

- Merge resolution of `claude/mfa-review` (22cebbb): intent preserved; D-020 guards, live migration names and branch map intact.
- CRLF normalisation in `tests/migration-security.test.ts`: correct.
- D-023: the upstream fix shipped the same day; dependency updated, exception removed, audit 0.
- New: prefetch-safe `/auth/callback` (GET shows "Continuar", POST verifies), `tests/auth-callback.test.ts` (3 tests).
- Merged `claude/mfa-review` again to bring the Follow-up Queue scope (the Builder numbered it D-021; recovery prefetch became D-022 and the audit exception D-023).
- Reviewer gate before the Follow-up Queue integration: `npm run verify` reported 0 diagnostics and 44 tests; `npm audit --omit=dev` reported 0 vulnerabilities.

## Reviewer integration gate — ChatGPT Codex, 2026-10-04

Merged `origin/claude/pr1-review` at `a2dc700` into `codex/live-smoke-mfa`. The merge conflict in this file was resolved by retaining both the Follow-up Queue evidence and the Reviewer pass. The modify/delete conflict for `scripts/audit-dependencies.mjs` was resolved in favor of the Reviewer: `http-cache-semantics@4.3.0` closes the advisory and `audit:prod` is strict again. D-021, D-022 and D-023 retain their assigned topics.

Final local results before push:
- `npm ci`: completed; audit found 0 vulnerabilities;
- `npm run audit:prod`: passed; 0 vulnerabilities;
- `npm run verify`: 0 Astro errors, warnings or hints; 9 files and 66/66 tests passed; standalone Node build completed;
- `20261004035554_follow_up_queue.sql` remains unapplied to hosted Supabase;
- no Supabase or deployment changes were made in this integration.

GitHub Actions run `37174959751` passed for integration commit `cbf817b`; the `verify` job completed npm install, strict audit, the 66-test gate, SBOM generation and artifact upload.

## Reviewer: Follow-up Queue review and hosted migration — 2026-10-04

Reviewed `a6526f2` (PR #1). Code matches `docs/FOLLOW_UP_QUEUE.md` §1–8: optional unchecked WhatsApp box; opportunities recomputed on the server before any action; phone and message built from the database; composite FK keeps follow-ups inside the tenant; opt-out atomic with consent and audit rows. `npm run audit:prod` 0 vulnerabilities; `npm run verify` 0 diagnostics, 66/66.

Migration applied to `vrouyhxzxrfkuuqfslrc` as `20261004035554_follow_up_queue` (file renamed to that live version). Hosted checks inside a rolled-back block:

| Check | Result |
|---|---|
| Check-in without the WhatsApp box | opt-in false, 0 WhatsApp consent rows |
| With the box, then a later visit without it | opt-in stays true, 1 WhatsApp consent row |
| Opt-out | opt-in false, 1 audit row |
| Opt-out with another business id | `customer_not_found` |
| Follow-up row pointing at another tenant's customer | rejected by the composite foreign key |
| Owner of another business reading follow-ups | 0 rows |
| anon executes check-in v10 / service_role executes old v9 / authenticated executes opt-out / authenticated inserts follow-ups | false / false / false / false |
| Security advisor | only the known leaked-password WARN (Pro feature) |

Residual risks accepted for the MVP:
- Anyone who knows a customer's phone can tick the WhatsApp box for that number (same root as D-003: no phone verification). The owner's first message carries "responde BAJA", and the opt-out is one click. Phone verification (OTP) would close it; out of MVP scope.
- A later check-in with the box ticked re-enables a customer who opted out. This is a new explicit consent, recorded with its own row.
- The queue loads at most 1,000 customers per business (most recent first), so very large tenants could miss the oldest inactive customers. Move selection into SQL when a business passes ~800 customers.

## Hosted Follow-up Queue UI smoke — ChatGPT Codex, 2026-10-04

Target: standalone Node build at `http://127.0.0.1:4321` using runtime `.env` values and hosted Supabase `vrouyhxzxrfkuuqfslrc`. The Reviewer had already applied `20261004035554_follow_up_queue`; Codex ran no migration, `db push`, deploy or Render action.

| Step | Result | Evidence |
|---|---|---|
| Final local gates | PASSED | On `0eb3b6d`: `npm ci` and strict audit found 0 vulnerabilities; `npm run verify` reported 0 diagnostics and 66/66 tests; separate build passed; server returned HTTP 200. |
| Unchecked WhatsApp consent | PASSED | Visit recorded; New queue showed `Sin permiso para WhatsApp`, no send button, `whatsapp_opt_in=false`, 0 WhatsApp consent rows. |
| Checked WhatsApp consent | PASSED | Visit recorded with `whatsapp_opt_in=true` and consent version `whatsapp-2026-10-04`; owner UI showed `Enviar WhatsApp`. |
| Assisted WhatsApp | PASSED | Owner click wrote one `contacted/new/first` action. Endpoint returned 303 to `https://wa.me/12025550102` with encoded text `¡Gracias por tu primera visita a Review FQ, WhatsApp! Esperamos verte pronto. Si prefieres no recibir mensajes, responde BAJA.` Reload reduced active opportunities from 4 to 3. |
| Dismiss | PASSED | `Descartar` wrote one `dismissed/new/first` action; reload reduced active opportunities from 3 to 2. |
| Explicit opt-out | PASSED | Flag became false; consent history contains landing true plus admin false `whatsapp-optout-2026-10-04`; one `customer.whatsapp_opt_out` audit row; UI immediately removed send and opt-out controls and showed the no-permission label. |
| Viewer | PASSED | Viewer saw two active queue rows and all four customers with no contact, dismiss, opt-out or delete buttons. |
| Cleanup | PASSED | Temporary business, 4 customers, 4 visits, consent rows, 2 follow-up actions, NFC tag and 2 Auth users all removed. Café Luna remains at 3 customers/7 visits; only the platform admin remains; no business memberships remain. |

The smoke ran on `face24b`; the subsequent fast-forward to `0eb3b6d` changed only `docs/CHATGPT_COORDINATION_NOTE.md`, `docs/CLIENT_ONBOARDING.md` and `docs/DECISIONS.md`. The complete gates and build were repeated on `0eb3b6d`, proving the final executable tree remains the tested one.

## Onboarding configuration — ChatGPT Codex, 2026-10-04

Branch: `codex/onboarding-config`, created from `main` after confirming merge `7a6310a` for PR #1.

Migration `20261004130503_onboarding_config.sql` ran only in PGlite as part of the automated suite. It was not applied to hosted Supabase and no `db push` ran.

| Requirement | Result | Evidence |
|---|---|---|
| Offer present/absent | PASSED | Unit tests preserve the old message without an offer and insert only the matching category offer before the BAJA sentence. |
| Cross-business offer isolation | PASSED | The action handler loads the authorized business by id; route tests prove the selected business offer is used and an unrelated offer is absent. |
| Two active users | PASSED | PGlite rejects a third active member and rejects reactivation at the limit. Pausing frees a slot. |
| Parallel invitations | PASSED | Two concurrent membership function calls competing for one slot finish with one success, one `active_member_limit` failure and exactly two active rows. |
| Google Review validation | PASSED | All four approved HTTPS hosts pass; HTTP, other hosts, host suffix attacks and `javascript:` fail. |
| Activation and approval | PASSED | Database constraint blocks activation without approval. Approval rejects missing config and no active member, then records the owner, timestamp and one audit row after all checks pass. |
| Existing Café Luna | PASSED | Seeded Café Luna remains active with a preserved approval marker. |
| Birthday copy | PASSED | Source regression checks the exact approved label and help text. |
| Direct review NFC | PASSED | Admin and operations doc expose the stored Google URL for direct chip programming; no new public route exists. |

Commands and results:

- `npm ci`: 326 packages installed; 0 vulnerabilities.
- Targeted Vitest gate: 5 files, 58/58 tests.
- Additional database test after coverage expansion: 16/16 tests.
- `npm run audit:prod`: strict production audit, 0 vulnerabilities.
- `npm run verify`: 0 Astro errors, warnings or hints; 9 files and 75/75 tests; standalone Node build complete.
- GitHub Actions run `37203888837`: `verify` passed in 35 seconds for PR #3 implementation commit `4f864d7`.

## Reviewer: PR #3 onboarding configuration — 2026-10-04

Reviewed `b885958`. Code matches `docs/ONBOARDING_CONFIG.md`; `npm run audit:prod` 0 vulnerabilities; `npm run verify` 0 diagnostics, 75/75.

Migration applied to `vrouyhxzxrfkuuqfslrc` as `20261004130503_onboarding_config` (file renamed to that live version). Hosted checks in a rolled-back block:

| Check | Result |
|---|---|
| Café Luna after migration | active and approved |
| New business default | inactive |
| Activate without approval | rejected by `businesses_activation_requires_approval_check` |
| Third active member / reactivation with 2 active | `active_member_limit` / `active_member_limit` |
| Pausing a member frees a slot | yes |
| Approval with missing offers, logo or review URL | `approval_configuration_incomplete` |
| Review URL on another host | rejected by `businesses_google_review_url_check` |
| Approval complete, then activation | active; 1 `business.owner_approved` audit row |
| authenticated / anon execute the new functions | false / false |
| Security advisor | only the known leaked-password WARN |

Residual (accepted for MVP): an approval stays valid if the admin later edits offers or branding; those edits are normal support changes (D-027). The next Builder task adds the changed field names to the `business.updated` audit row so every post-approval change is traceable.

## Builder finish of PR #3 — ChatGPT Codex, 2026-10-04

### NFC mobile page

- Captured the demo capture page before and after at an exact 390×844 Chrome viewport.
- Before: `docs/evidence/nfc-mobile-before-390x844.png`.
- After: `docs/evidence/nfc-mobile-after-390x844.png`.
- After the mobile-only header change, the Nombre label and complete input render inside the first viewport without scrolling. Desktop CSS outside the existing mobile media query is unchanged.
- The WhatsApp checkbox remains unchecked and optional. Its exact visible text is: `Recibe ofertas y sorpresas de cumpleaños de {negocio} por WhatsApp. Puedes pedir que paren cuando quieras.`

### Audit detail

- `business.updated` stores `details.changedFields` as an array of database column names.
- `tests/admin-update.test.ts` proves unchanged fields are omitted and changed values are absent from the audit data.
- Hosted configuration update recorded only these five changed names: `offer_inactive`, `offer_birthday`, `offer_frequent`, `offer_new`, `google_review_url`.

### Hosted admin smoke and cleanup

Target: local Astro dev server at `127.0.0.1:4322` using hosted test Supabase `vrouyhxzxrfkuuqfslrc`. No deploy, migration or `db push` ran.

| Step | Result | Evidence |
|---|---|---|
| Temporary AAL2 platform admin | PASSED | Created for the smoke, enrolled and verified TOTP, then `/admin` rendered. |
| New business secure default | PASSED | Created through `/api/admin/businesses`; hosted row started with `is_active=false`. |
| First and second users | PASSED | Existing temporary Auth users were assigned through the live invite route as owner and manager. |
| Third user | PASSED | Live route redirected with `ya tiene 2 usuarios activos`; hosted active count remained 2. |
| Admin detail screen | PASSED | Rendered `Usuarios: 2 de 2`. |
| Configuration and audit | PASSED | Four offers and Google URL saved; audit contained the five field names and none of their values. |
| Owner approval | PASSED | Live approval route succeeded and the detail page rendered `Aprobado por Dueña Smoke`. |
| Activation | PASSED | Live update route set the approved business active. |
| WhatsApp suggestion | PASSED | A real hosted check-in returned HTTP 201; the server-built 303 `wa.me` redirect included `Recibe 10% en tu próxima visita.` and the BAJA footer. |
| Cleanup | PASSED | Temporary business, customers, memberships and four Auth users all count zero. |
| Preserved state | PASSED | Exactly one business remains: active Café Luna; one expected platform admin; 0 memberships; Café Luna has 3 customers and 7 visits; follow-ups count 0. |

The first smoke attempt stopped after the check-in because the temporary harness expected HTTP 200 while the endpoint correctly returns 201. Its scoped cleanup passed. The expectation was fixed and the full second smoke passed with the same cleanup checks.

### Final local gate

- `npm ci`: 326 packages installed; 0 vulnerabilities.
- `npm run audit:prod`: 0 vulnerabilities.
- `npm run verify`: 0 Astro errors, warnings or hints; 10 files and 78/78 tests; standalone Node build complete.

## Reviewer final pass — PR #3 (Claude Code, 2026-10-04)

| Check | Result |
|---|---|
| Diff `aa7fd2d` (WhatsApp text, mobile header, `changedFields`) | Correct; audit stores column names only |
| `npm ci` / `npm run audit:prod` / `npm run verify` | 0 vulnerabilities; 0 diagnostics; 10 files, 78/78 tests; build complete |
| Mobile layout re-measured at a true 390×844 viewport (Playwright, built server, `/demo/capture`) | No horizontal overflow (scrollWidth 390); Nombre input ends at y=420 of 844 |
| Committed captures | Cropped on the right by the capture tool; the page itself does not overflow |
| Hosted state after Builder smoke | 1 business (`cafe-luna`, active, approved), 1 Auth user, 0 members, 3 customers, 7 visits, 0 follow-ups, 1 NFC tag |
| CI on `aa7fd2d` | `verify` success (run 37205381829) |

Note: the temporary business's `business.updated` audit rows were removed with the smoke cleanup, so the hosted `changedFields` evidence is the Builder's recorded observation; the behavior is covered by `tests/admin-update.test.ts`.

Verdict: **PR #3 approved by the Reviewer.** The CEO merges.

## Custom SMTP — test project (Claude Code + CEO, 2026-10-04)

| Check | Result |
|---|---|
| Sending domain | `yourbizupgraded.com` verified in Resend (DKIM `resend._domainkey`, SPF/MX on `send.`); click and open tracking not configured |
| Resend key | `smart-tap-supabase-pruebas`, Sending access restricted to the domain; pasted by the CEO directly into Supabase, never shared |
| Supabase SMTP (`vrouyhxzxrfkuuqfslrc`) | `smtp.resend.com:465`, user `resend`, sender `Smart Tap <smarttap@yourbizupgraded.com>`, 60 s per-user interval; auth log shows the email limiter moved from 2/h to 30/h |
| Templates | Invite and Reset password replaced with `supabase/templates/*.html` (prefetch-safe callback) |
| Delivery test | Recovery email to the admin arrived in the primary inbox, sender Smart Tap, Spanish template |
| Replies | CEO adding `smarttap@` as a Google Workspace alias of the admin mailbox (not yet confirmed) |

Pending: the link inside the email points to the Supabase Site URL; test the full click-through after the Render deploy sets Site URL to `https://smarttap.yourbizupgraded.com`. Repeat key + SMTP + templates in the production project (D-024).

## D-044 customer privacy notice — ChatGPT Codex, 2026-10-04

### Page and approved copy

- `src/lib/privacy.ts` holds version `2026-10-04`, dates and all approved Spanish/English text with server substitutions.
- `/privacy/[slug]` selects an active, uncancelled business and requires a configured phone or email; every other path returns 404.
- `/privacy` renders the same copy with `el negocio donde te registraste` / `the business where you registered`.
- Live landing links use `/privacy/{slug}` unless `privacy_url` contains an override.
- `tests/privacy.test.ts` checks approved retention, rights, age and fallback language.
- `docs/evidence/privacy-cafe-luna-390x844.png`: exact 390×844 local CDP capture. Source business response was local and temporary; Supabase was not changed.

### Contact, consent and age

- Contact phone is accepted only in canonical E.164 form through libphonenumber-js; contact email uses Zod email validation. Database checks provide a second layer.
- Owner approval requires at least one contact. Activation requires approval, contact and a null cancellation timestamp.
- Browser payload no longer contains `consentVersion`; Zod strips an injected value; `/api/public/check-in` always sends `PRIVACY_NOTICE_VERSION` to PostgreSQL.
- The required consent adds `Tengo 13 años o más.` The date input limits selection and the server returns `Debes tener 13 años o más.` for younger birthdays.

### Retention, cancellation and export

| Rule | Evidence | Result |
|---|---|---|
| 24 months from latest visit, or creation with no visit | PGlite inserts stale and recent customers, executes `private.purge_inactive_customers()` | PASSED |
| Cascade visits, consent and follow-ups | Counts after purge are all zero for deleted customers | PASSED |
| One count-only audit per affected business | Exact JSON is `{\"deletedCount\": 1}` for retention and cancellation actions | PASSED |
| Cancelled business deletion after 30 days | Recent customer under a 31-day cancelled business is deleted | PASSED |
| Private function permissions | `has_function_privilege` is false for anon, authenticated and service_role | PASSED |
| Cancellation cannot reactivate | Database activation constraint rejects the update | PASSED |
| CSV fields and formula safety | Unit test covers six columns and leading `=`, `+` neutralization | PASSED |
| AAL2 admin routes | Automatic admin-route guard test covers cancel and export; export uses POST | PASSED |

### Migration and cron

- One new file: `supabase/migrations/20261004190428_privacy_notice.sql`.
- The SQL ran to completion in PGlite. The availability guard skips extension installation there because PGlite does not provide `pg_cron`.
- On Supabase, the migration creates `pg_cron` when available and schedules `smart-tap-daily-privacy-purge` at `17 3 * * *`.
- Migration remains unapplied; Codex ran no migration and no `db push`.

### Gate

- Targeted privacy, validation, migration and database suite: 59/59 passed.
- `npm ci`: 326 packages; 0 vulnerabilities.
- `npm run audit:prod`: 0 vulnerabilities.
- `npm run verify`: 0 Astro errors, warnings or hints; 11 files and 94/94 tests; standalone Node build complete.
- PR #4 implementation commit `fc84603`: GitHub Actions `verify` passed in run `37212786746`.

## Reviewer pass — PR #4 privacy notice + Terms (Claude Code, 2026-10-04)

Diff reviewed at `08486a0`. Local gate: `npm ci` / `audit:prod` 0 vulnerabilities, `astro check` 0 diagnostics, 12 files and 108/108 tests.

Migration applied to `vrouyhxzxrfkuuqfslrc` as `20261004190428_privacy_notice` (file renamed). Hosted checks, each inside a transaction that was rolled back (no data left behind):

| Check | Result |
|---|---|
| Café Luna after migration | active, contact `automateit@yourbizupgraded.com`, `privacy_url` null (uses `/privacy/cafe-luna`), not cancelled, 3 customers kept |
| pg_cron | job `smart-tap-daily-privacy-purge`, `17 3 * * *`, active, runs `private.purge_inactive_customers()` as `postgres` |
| Purge: customer of business cancelled 91 days ago | deleted |
| Purge: customer of business cancelled 89 days ago | kept |
| Purge: last visit 25 months ago | deleted, visits cascaded |
| Purge: created 26 months ago, visit 1 month ago | kept |
| Purge: new customer | kept |
| Purge audit | one row per business, `details` = `{"deletedCount": 1}` only |
| `record_terms_acceptance` for a non-member | rejected `terms_business_access_denied` |
| First acceptance / duplicate / new version | inserted / no-op / inserted; 2 rows and 2 audits with `{"version": …}` only |
| Function privileges | purge: no execute for anon, authenticated, service_role; terms: service_role only |
| `terms_acceptances` | RLS on; authenticated has no insert |
| Security advisor | only the known leaked-password WARN |

Defect found and fixed: `service_role` still had INSERT/UPDATE/DELETE on `terms_acceptances` through Supabase default grants (PGlite has no such defaults, so the local test did not see it). Revoked live as `20261004190717_terms_acceptances_write_via_function_only` (file added); after the revoke `service_role` direct insert is rejected and the security-definer function still records acceptances.

Not exercised against the hosted project: the HTTP routes (`/privacy/[slug]`, `/terms/accept`, CSV export, 410 after the window), because the Reviewer environment holds no server key. They are covered by the 108 local tests; repeat as part of the post-deploy smoke on Render.

Verdict: **PR #4 approved by the Reviewer.** The CEO merges.

## First Render deploy — production smoke (Claude Code + CEO, 2026-10-04)

| Check | Result |
|---|---|
| Render Blueprint `render-smart-tap`, service `smart-tap` (Virginia, `0.5c-512mb`), deploys `main` | Live at `smart-tap-y8gd.onrender.com` |
| DNS `smarttap` CNAME → `smart-tap-y8gd.onrender.com`, DNS only (Cloudflare API) | Resolves; Render domain Verified, certificate issued |
| `/demo`, `/b/cafe-luna`, `/privacy/cafe-luna`, `/terms`, `/login` over HTTPS on the custom domain | 200; CSP, X-Frame-Options DENY, nosniff present |
| Form POSTs behind Render's TLS proxy | Were 403 for every form; fixed by `security.allowedDomains` (PR #5). After redeploy: same-origin 303, cross-site 403 |
| Supabase Auth URL configuration | Site URL `https://smarttap.yourbizupgraded.com`, redirect `https://smarttap.yourbizupgraded.com/**` |
| Recovery template | Was still Supabase's default (`ConfirmationURL`, consumed on GET). Replaced with `supabase/templates/recovery.html`; Invite template confirmed as the repository version |
| Recovery email requested by the CEO from `/forgot-password` | Arrived in the inbox (not spam), Spanish template; Gmail's scan of the link did not consume the token (no `/verify` in the auth log) |
| DMARC | `_dmarc` CNAME to `dmarc.ionos.com` (`p=none`) was proxied, so TXT did not resolve; set to DNS only, now resolves |

Pending on the deployed app: click-through of the recovery button, the IP-identity check for rate limits (two phones on different networks), and physical NFC tests. The app uses the test Supabase project until the first client (D-047).

## D-046 / D-048 customer styles — ChatGPT Codex, 2026-10-04

Target: local branch `codex/customer-styles` from `origin/claude/deploy-evidence` at `534da86`. No deploy, Supabase migration or `db push` ran.

PR #6: `https://github.com/coachgerardonavas-star/smart-tap/pull/6`. GitHub Actions `verify` passed on implementation commit `ad2d0eb` in run `37235632682`.

### Automated gate

| Check | Result |
|---|---|
| `npm ci` | 334 packages installed; 0 vulnerabilities |
| `npm run audit:prod` | 0 vulnerabilities |
| `npm run verify` | 0 Astro errors, warnings or hints; 13 files and 121/121 tests; standalone Node build complete |
| Database migration | All migrations, including `20261004212542_customer_styles.sql`, ran in PGlite; valid style data saved; invalid theme, partial benefits and HTTP hero URL were rejected |
| Button contrast | Sampled 4,096 RGB colors; computed black/white label reached at least 4.5:1 for every sample |
| Fixed body palettes | Every approved foreground/background pair tested at 4.5:1 or higher |
| Approved copy | Exact birthday, required consent, optional WhatsApp and confirmation strings covered; WhatsApp input has no `checked` state |
| Font delivery | Latin WOFF2 assets come from local `@fontsource-variable` packages; page CSS emits only the selected style's two families; no Google Fonts or CSP change |

### Viewport and visual evidence

The repeatable CDP runner is `scripts/capture-customer-styles.mjs`. It uses the production demo component, submits the real React form in demo mode and captures the resulting confirmation state.

| Style | Nombre input bottom at 390×844 | Hero height | Form capture | Confirmation capture |
|---|---:|---:|---|---|
| elegante | 417 px | 209 px | `docs/evidence/customer-elegante-form-390x844.png` | `docs/evidence/customer-elegante-confirmation-390x844.png` |
| calido | 425 px | 221 px | `docs/evidence/customer-calido-form-390x844.png` | `docs/evidence/customer-calido-confirmation-390x844.png` |
| moderno | 414 px | 209 px | `docs/evidence/customer-moderno-form-390x844.png` | `docs/evidence/customer-moderno-confirmation-390x844.png` |
| colorido | 425 px | 219 px | `docs/evidence/customer-colorido-form-390x844.png` | `docs/evidence/customer-colorido-confirmation-390x844.png` |

Desktop evidence: `docs/evidence/customer-elegante-form-1440x900.png`, with hero and form side by side. All nine images were opened and visually checked. The review link appears in the confirmation captures because the demo config includes a valid Google Review URL; source and regression coverage confirm it is omitted when the value is null.

### Data and admin path

- One migration adds `theme`, `tagline`, `benefits` and `hero_image_url` with database checks. It remains unapplied.
- `/admin/[id]` exposes all fields. The existing update route validates them, updates the row and includes their database column names in `business.updated.details.changedFields`.
- `/b/[slug]` and `/demo/capture` both render `CustomerCapture.astro`; the demo can select all four styles.

## Reviewer pass — PR #6 customer styles (Claude Code, 2026-10-04)

Diff reviewed at `9dcd07c`: user-supplied URLs render only through React-escaped `src`/`href`; `primary_color` stays a validated hex used as a CSS variable; button label color computed for contrast; fonts self-hosted, CSP unchanged. Local gate: 13 files, 121/121 tests, build complete, `audit:prod` 0 vulnerabilities.

Reviewer screenshots at 390×844 of `/demo/capture?theme=` for the four styles (built server): no horizontal overflow; Nombre input bottom at 417 / 425 / 414 / 425 px; each page loaded only its two font families.

Migration applied to `vrouyhxzxrfkuuqfslrc` as `20261004212542_customer_styles` (file renamed). Hosted checks inside a rolled-back transaction: Café Luna defaulted to `calido` and stayed active; a valid style update passed; unknown theme, two benefits, `http://` and `javascript:` hero URLs and an 81-character tagline were rejected.

Verdict: **PR #6 approved by the Reviewer.** After merge, Render redeploys and the Reviewer checks `/demo/capture` on the production domain.

## Physical NFC test — production domain (CEO + Claude Code, 2026-10-04)

| Check | Result |
|---|---|
| Tag written with `https://smarttap.yourbizupgraded.com/b/cafe-luna?t=<Mostrador principal code>` (not locked) | Opened the Café Luna page in the `calido` style on the CEO's iPhone |
| Check-in from the tag | Visit recorded at 21:33 UTC against tag "Mostrador principal"; new customer; consent `text_version` = `2026-10-04` (server-set); WhatsApp opt-in recorded as chosen |
| Confirmation screen | "¡Listo!" shown (CEO) |
| Cleanup at the CEO's request | The test customer was deleted (visits and consent cascaded); Café Luna back to 3 customers and 7 visits, 0 follow-ups |

Still open before the first client: second-device test (Android), rate-limit IP identity on two networks, tag write-lock after final URL, production Supabase project (D-024/D-047).
