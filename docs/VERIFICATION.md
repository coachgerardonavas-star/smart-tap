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
