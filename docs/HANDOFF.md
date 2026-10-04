# Smart Tap handoff

Updated: 2026-10-04 by ChatGPT Codex (Builder), after implementing D-044 on `codex/privacy-notice`.

## Project identity

- Local path: `C:\automate-it\smart-tap` · GitHub: `coachgerardonavas-star/smart-tap`
- Builder: ChatGPT Codex · Reviewer: Claude Code
- Stack: Astro 7, React 19, Supabase JS/SSR, PostgreSQL, Supabase Auth, Vitest
- Security standard: Glasswing Shield v1.0 — matrix `docs/security/CONTROL_MATRIX.md`
- **CEO-approved commercial/product decisions D-025 through D-044:** `docs/DECISIONS.md`, `docs/CHATGPT_COORDINATION_NOTE.md` and `docs/PRIVACY_NOTICE.md`.

## Branches — which one is current

| Branch | State |
|---|---|
| `main` | Reviewed onboarding MVP at merge `a9ebc37`; PR #3 is merged. All later changes still require a pull request because technical branch protection remains deferred under D-043. |
| `claude/mfa-review` | Reviewer source integrated through `eeea77d`; contains MFA fixes, ops reconciliation and the approved Follow-up Queue specification. |
| `claude/pr1-review` | Reviewer pass integrated through `a2dc700`; adds the prefetch-safe callback and closes D-023 with http-cache-semantics 4.3.0. |
| `codex/live-smoke-mfa` | Merged through PR #1. Historical source for the hosted Follow-up Queue smoke and reviewed MVP. |
| `codex/onboarding-config` | Merged through PR #3 at `a9ebc37`. |
| `codex/privacy-notice` | **Current Builder branch.** Implements D-044. Migration `20261004143000_privacy_notice.sql` remains unapplied for Reviewer inspection. |
| `ops/reconcile-live-2026-10-03` | Merged into `claude/mfa-review`. Its docs and live migration names are kept. Can be deleted after PR #1 merges. |
| `claude/review-hardening` | Superseded; already contained in the branches above. |

## Live Supabase (`vrouyhxzxrfkuuqfslrc`, us-east-1, free plan)

Migration history matches `supabase/migrations/` file names exactly:
`20261002005131_initial_schema`, `20261002014439_review_hardening_rate_limit_helper`, `20261002014453_review_hardening_check_in_v2`, `20261002072441_one_visit_per_day`, `20261004010900_admin_rls_requires_aal2`, `20261004021305_revoke_legacy_check_in`, `20261004035554_follow_up_queue`, `20261004130503_onboarding_config`.

Data on 2026-10-04: Café Luna demo only (3 customers, 7 visits); one Auth user `automateit@yourbizupgraded.com`, confirmed, `platform_admin`, one MFA factor enrolled; no business members.

Advisors: Security — one WARN, leaked-password protection, Pro-plan feature (compensated by 12-character minimum and admin MFA). Performance — five INFO unindexed foreign keys, deferred until workload evidence.

## Current state

MVP implemented. Security hardening, one visit per customer per day (D-017), admin MFA at `aal2` for `/admin`, `/dashboard`, customer deletion and the Data API (D-019, D-020). The Follow-up Queue (D-021) adds separate optional WhatsApp consent, four server-computed opportunity kinds, owner-assisted `wa.me` actions, dismissal and an audited opt-out. Smart Tap never sends a message.

Glasswing Shield gate: **NOT APPROVED FOR REAL CUSTOMER DATA.** Open HIGH: GS-25 backups and GS-29 separate production project. GS-03 MFA passed live enrollment and challenge.

Estimated completion: 98% of the demonstration MVP and 82% of production readiness.

Current local gate on `codex/privacy-notice`: `npm ci` found 0 vulnerabilities; strict `npm run audit:prod` found 0 vulnerabilities; `npm run verify` passed with 0 diagnostics, 94/94 tests and a complete standalone Node build.

## Customer privacy notice — Builder implementation, 2026-10-04

- Implemented D-044 from `docs/PRIVACY_NOTICE.md` without changing the approved Spanish or English wording. `/privacy/[slug]` renders both languages from the active, uncancelled business row; unknown, inactive, cancelled or contactless records return 404. `/privacy` keeps the generic fallback.
- Real check-in pages use `/privacy/{slug}` by default. A configured `privacy_url` still overrides it.
- Added nullable `contact_phone` and `contact_email`, E.164/email validation, admin fields and database-backed owner-approval/activation requirements. The Café Luna seed uses `automateit@yourbizupgraded.com` as its demo contact.
- Added private `security definer` retention function: customer data older than 24 months by latest visit, or creation when no visit exists, is deleted with cascades. Cancelled-business customer data is deleted after 30 days. Each affected business receives one count-only audit row.
- Added a daily `pg_cron` schedule at 03:17 UTC. `anon`, `authenticated` and `service_role` have no execute permission on the purge function.
- Added a distinct AAL2 platform-admin cancellation action and a POST-only CSV export with name, phone, birthday, visit count, last visit and WhatsApp opt-in. Export auditing stores empty details; CSV cells neutralize spreadsheet formulas.
- The server now sets `PRIVACY_NOTICE_VERSION = 2026-10-04` and strips any browser-supplied version. The required consent says `Tengo 13 años o más`; the form and server reject a birthday younger than 13.
- New migration: `20261004143000_privacy_notice.sql`. It has not been applied and no `db push` ran.
- Local evidence: migration and cascade tests passed in PGlite; exact 390×844 capture at `docs/evidence/privacy-cafe-luna-390x844.png` was produced with a local mock business, without Supabase changes.
- PR #4: `https://github.com/coachgerardonavas-star/smart-tap/pull/4`, open from `codex/privacy-notice` to `main`; implementation commit `fc84603` passed GitHub Actions `verify`.

## Onboarding configuration — Builder implementation, 2026-10-04

- Implemented all eight sections of `docs/ONBOARDING_CONFIG.md` on `codex/onboarding-config`.
- Added one nullable offer per follow-up kind. The server loads only the selected business's offers and adds the matching offer to the WhatsApp suggestion when present.
- Replaced the optional birthday label and added the approved benefit text without a promised reward.
- Enforced two active business members through row-locked PostgreSQL functions used by invite and reactivation routes. Pausing frees a slot; parallel activation attempts cannot exceed two.
- Added a validated direct Google Review URL for the four approved hosts and displayed it in the admin for direct NFC programming. No review interstitial or new public route was added.
- Kept the inactivity threshold per business and changed its admin label to state that the owner defines it.
- New businesses default to inactive. Activation has an app check plus a database constraint requiring recorded owner approval. The approval function checks branding, four offers, inactivity days, Google Review URL and an active member, then writes the approval and audit row atomically. The migration preserves already active rows such as Café Luna.
- Updated `docs/NFC_OPERATIONS.md` to specify two Smart Tap capture tags and one direct Google Review tag.
- Onboarding migration: `20261004130503_onboarding_config.sql`. Claude Code applied it to hosted Supabase under that exact name. Codex ran no migration and no `db push`.
- Targeted gate: 58/58 tests. Final local gate: 75/75 tests, zero Astro diagnostics, complete build and zero production audit findings.
- PR #3: `https://github.com/coachgerardonavas-star/smart-tap/pull/3`, open from `codex/onboarding-config` to `main`, non-draft and mergeable. GitHub Actions run `37203888837` passed `verify` for implementation commit `4f864d7`.

## PR #3 finish — Builder, 2026-10-04

- The optional unchecked WhatsApp box now leads with the approved benefit text and promises no specific gift.
- Mobile-only header styles were compacted in the live and demo NFC pages. At an exact 390×844 viewport, the Nombre label and full input are visible without scrolling. Desktop rules were left unchanged.
- Before/after evidence: `docs/evidence/nfc-mobile-before-390x844.png` and `docs/evidence/nfc-mobile-after-390x844.png` (both verified at 390×844).
- `business.updated` now stores `details.changedFields` with column names only. Unit coverage rejects audit values; the hosted smoke recorded exactly `offer_inactive`, `offer_birthday`, `offer_frequent`, `offer_new` and `google_review_url` for the configuration update.
- Hosted admin smoke against test project `vrouyhxzxrfkuuqfslrc`: temporary platform admin with AAL2 opened `/admin`; a temporary business started inactive; owner and manager became active; a third viewer was rejected at the two-user limit; detail page showed `Usuarios: 2 de 2`; four offers and the direct Google Review URL saved; owner approval rendered; activation passed; a new WhatsApp-enabled check-in produced a server-built `wa.me` suggestion containing the approved New offer and BAJA footer.
- Cleanup passed after both smoke attempts: temporary businesses, customers, memberships and Auth users all count zero. Final hosted state is one active `cafe-luna`, one expected platform admin, zero memberships, 3 Café Luna customers, 7 visits and zero follow-ups.
- First smoke attempt reached the check-in and received the correct HTTP 201 response; the temporary harness expected 200. The harness expectation was corrected, cleanup was confirmed, and the complete second run passed. Product code required no correction for that response.

## Follow-up Queue implementation — 2026-10-04

- Sections 1–8 of `docs/FOLLOW_UP_QUEUE.md` are implemented locally on PR #1.
- Capture has a separate optional unchecked WhatsApp consent; the 10-argument check-in preserves a prior opt-in and records consent purpose/version.
- The dashboard groups inactive, birthday, frequent and new opportunities. Viewer access is read-only. Owner, manager and AAL2 platform admin can contact or dismiss.
- `/api/dashboard/follow-up` scopes every customer read by business, recomputes the opportunity and builds the `wa.me` URL only from database values. Authorization errors propagate as 403 through the shared middleware.
- The explicit opt-out is atomic through `record_whatsapp_opt_out`; it updates the customer and appends consent and audit records.
- Follow-up migration: `20261004035554_follow_up_queue.sql`. Claude Code applied it to hosted Supabase as `20261004035554_follow_up_queue`; Codex did not run a migration or `db push`.
- Follow-up Queue gate remains complete: all sections 1–8 are covered by 66/66 tests and the hosted UI smoke below. Strict `npm run audit:prod` reports 0 vulnerabilities.

## Hosted Follow-up Queue UI smoke and cleanup — 2026-10-04

- Ran the standalone Node build locally at `127.0.0.1:4321` against hosted Supabase; no deployment was created.
- Temporary business `review-fq`, one NFC tag, one owner and one viewer were created only for this smoke test.
- Unchecked WhatsApp box: visit recorded; customer entered the New queue with `Sin permiso para WhatsApp`, no WhatsApp button and zero WhatsApp consent rows.
- Checked box: `Enviar WhatsApp` appeared. Clicking it wrote one `contacted/new/first` row. The live endpoint returned HTTP 303 to `wa.me/12025550102` with the server-built Review FQ message and BAJA footer; after reload the customer left the queue.
- `Descartar` wrote one `dismissed/new/first` row and removed that customer from the queue.
- `Pidió no recibir WhatsApp` changed the flag to false, appended a negative admin consent and one `customer.whatsapp_opt_out` audit row; the queue immediately showed `Sin permiso para WhatsApp` without the send button.
- Viewer saw the same queue and customer table without contact, dismiss, opt-out or delete buttons.
- Cleanup passed: `review-fq`, customers, visits, consents, follow-ups, NFC tags and both temporary Auth users all count zero. Café Luna remains with 3 customers and 7 visits; the platform admin remains; business memberships count zero.
- The final sync from `face24b` to `0eb3b6d` changed documentation only. Gates and build were repeated on `0eb3b6d`; the tested executable tree is unchanged.
## Builder live smoke and cleanup — 2026-10-03

- Admin TOTP enrollment and challenge passed; `/admin` opened at AAL2.
- `review-live` capture created one customer, one visit and two consent records after a repeated same-day submission; the second submission did not add a visit.
- Dashboard, birthday, NFC pause/reactivation, viewer tenant isolation, `/admin` denial and member pause passed live.
- Three default recovery emails returned `otp_expired`, consistent with documented link prefetch. A fresh server-generated one-time token completed password recovery. D-022 records the production fix.
- Customer deletion cascaded from 1 visit and 2 consent records to zero; its audit event remains.
- Cleanup removed `review-live` and the viewer Auth user. Café Luna and the platform admin remain.
- PR #1: `https://github.com/coachgerardonavas-star/smart-tap/pull/1`.

## Activation documents

`docs/SETUP.md`, `docs/PRODUCTION_SMOKE_TEST.md`, `docs/CLIENT_ONBOARDING.md`, `docs/NFC_OPERATIONS.md`, `docs/CODEX_NEXT.md`, `docs/CHATGPT_COORDINATION_NOTE.md`.

## Real blockers

- CEO: Supabase plan (backups GS-25, separate production project GS-29).
- Production host and domain (D-009), then Auth Site URL and redirect.
- Paste `supabase/templates/invite.html` and `recovery.html` into Supabase Auth → Emails (prefetch-safe with the new callback); custom SMTP with tracking disabled before commercial invitations (D-022).
- Reviewer: inspect and apply `20261004143000_privacy_notice.sql`, then run the hosted D-044 smoke before real customer data.
- Physical NFC writing.

- Synchronize the newly approved Smart Tap commercial rules (D-025 to D-042) into contract/SOW and `Manual_de_Pricing.md` in ADN (the repository is not the pricing source of truth).
- Complete onboarding design with the CEO; only the form + verification-session model (D-029) is approved.
- Offers by category (D-037), the birthday text (D-033) and the two-user limit (D-032) are approved for a later onboarding task; the queue still uses the fixed messages of `docs/FOLLOW_UP_QUEUE.md`.

## Coordination

PR #3 is merged. All new work starts from updated `main`, uses a feature branch and reaches `main` only through a pull request with `verify` green. Current branch: `codex/privacy-notice`. Read `docs/CHATGPT_COORDINATION_NOTE.md` and `docs/PRIVACY_NOTICE.md` before changing product or privacy assumptions. Every session ends with commit + push + `docs/HANDOFF.md` + the report for Claude Code (`AGENTS.md`).

## Reviewer and Builder status — 2026-10-04 (after 0eb3b6d)

- Follow-up Queue migration applied live as `20261004035554_follow_up_queue`; hosted DB checks passed (see VERIFICATION).
- D-024 merged: Supabase Pro and a separate production project at the first signed client.
- PR #1: Reviewer-approved and hosted Follow-up Queue UI smoke complete. Remaining before real customer data: GS-25, GS-29 (D-024), templates pasted in Supabase, host/domain, SMTP, privacy notice and physical NFC.

## Production hosting (D-030) — added by ChatGPT, reviewed by Claude Code

- Host: Render Web Service, Virginia, plan `0.5c-512mb` (paid; free tier sleeps), blueprint `render.yaml`, Node `22.22.0` (`.node-version`), URL `https://smarttap.yourbizupgraded.com`.
- `render.yaml` deploys from `main`. **Do not create the Render service before PR #1 merges**: `main` still has the old code, whose check-in function no longer runs against the database.
- Per D-024 the production service points at the separate Supabase Pro project created at the first signed client, not at `vrouyhxzxrfkuuqfslrc` (test/demo).
- `TRUSTED_IP_HEADER=x-forwarded-for` is set in the blueprint. The production smoke test must confirm the rate-limit identity is the visitor's IP (two phones on different networks are limited independently) before the first client goes live; if the domain is proxied through Cloudflare, switch to `cf-connecting-ip` and block direct `onrender.com` traffic.
- Runbooks: `docs/SETUP.md`, `docs/PRODUCTION_SMOKE_TEST.md`, `docs/CLIENT_ONBOARDING.md`, `docs/NFC_OPERATIONS.md`.
- Draft PR #2 (`ops/reconcile-live-2026-10-03`) is fully merged into PR #1 and can be closed.

## Reviewer status — PR #3 (2026-10-04)

Onboarding configuration reviewed; migration applied live as `20261004130503_onboarding_config`; hosted checks passed (see VERIFICATION). Next Builder task: NFC page polish + audit detail (see `docs/CODEX_NEXT.md`), then the CEO merges PR #3.

Builder follow-up complete: NFC page polish, changed-field audit, exact 390×844 evidence and the full hosted admin smoke are done. PR #3 remains open for the Reviewer's final pass; no deploy or merge occurred.

PR #3 merged to main (a9ebc37). Next: custom SMTP done on the test project; privacy notice approved (D-044), Builder implements it on `codex/privacy-notice` from `claude/launch-prep`.

## Pending — customer-facing visual design (CEO, 2026-10-04, D-046)

The CEO wants each business's NFC screens (welcome, registration, confirmation) to look branded and attractive, like an early ChatGPT mockup (photo-led hero, business logo, tagline, benefit list with icons, branded inputs, celebratory "¡Listo!" confirmation), instead of a plain white page.

Decision D-046: **customizable styles, not bespoke design per client.** 3–4 styles are designed once (e.g. dark elegant, warm light, modern, colorful family), approved by the CEO, built once by the Builder. At onboarding each business gets a style plus its logo, colors, hero photo, tagline and benefits — data only, no per-client code. Configuring a client takes minutes and support changes stay simple (D-027).

Route: design the styles with Claude Design → CEO approval → Builder implements as a theme system with new admin fields. Scheduled after the privacy/terms PR.

Constraints every style must keep: WhatsApp box unchecked and optional (D-042); no SMS; privacy acceptance separate from marketing; no visit-reward counter unless a rewards feature is approved and built; Instagram/social links only if added as a configured field; images optimized for fast load on mobile data; Nombre visible without scroll at 390×844; contrast readable in sunlight.
