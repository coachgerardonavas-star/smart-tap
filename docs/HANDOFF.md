# Smart Tap handoff

Updated: 2026-10-04 by ChatGPT Codex (Builder), after integrating `origin/claude/pr1-review` at `a2dc700`.

## Project identity

- Local path: `C:\automate-it\smart-tap` · GitHub: `coachgerardonavas-star/smart-tap`
- Builder: ChatGPT Codex · Reviewer: Claude Code
- Stack: Astro 7, React 19, Supabase JS/SSR, PostgreSQL, Supabase Auth, Vitest
- Security standard: Glasswing Shield v1.0 — matrix `docs/security/CONTROL_MATRIX.md`
- **CEO-approved commercial/product decisions from the current ChatGPT session:** `docs/CHATGPT_COORDINATION_NOTE.md`. Codex, Claude Code and ChatGPT should read it before changing Smart Tap scope, pricing behavior, CRM/WhatsApp assumptions, location rules or onboarding.

## Branches — which one is current

| Branch | State |
|---|---|
| `main` | Original MVP (`f1ec5d3`). Does not match the live database: its code calls the old 8-argument check-in function, which no role may execute. **Do not deploy or build on `main` until PR #1 is merged.** |
| `claude/mfa-review` | Reviewer source integrated through `eeea77d`; contains MFA fixes, ops reconciliation and the approved Follow-up Queue specification. |
| `claude/pr1-review` | Reviewer pass integrated through `a2dc700`; adds the prefetch-safe callback and closes D-023 with http-cache-semantics 4.3.0. |
| `codex/live-smoke-mfa` | **Current PR #1 branch.** Contains hosted smoke evidence, integrates `claude/mfa-review` and implements the Follow-up Queue. |
| `ops/reconcile-live-2026-10-03` | Merged into `claude/mfa-review`. Its docs and live migration names are kept. Can be deleted after PR #1 merges. |
| `claude/review-hardening` | Superseded; already contained in the branches above. |

## Live Supabase (`vrouyhxzxrfkuuqfslrc`, us-east-1, free plan)

Migration history matches `supabase/migrations/` file names exactly:
`20261002005131_initial_schema`, `20261002014439_review_hardening_rate_limit_helper`, `20261002014453_review_hardening_check_in_v2`, `20261002072441_one_visit_per_day`, `20261004010900_admin_rls_requires_aal2`, `20261004021305_revoke_legacy_check_in`.

Data on 2026-10-04: Café Luna demo only (3 customers, 7 visits); one Auth user `automateit@yourbizupgraded.com`, confirmed, `platform_admin`, one MFA factor enrolled; no business members.

Advisors: Security — one WARN, leaked-password protection, Pro-plan feature (compensated by 12-character minimum and admin MFA). Performance — five INFO unindexed foreign keys, deferred until workload evidence.

## Current state

MVP implemented. Security hardening, one visit per customer per day (D-017), admin MFA at `aal2` for `/admin`, `/dashboard`, customer deletion and the Data API (D-019, D-020). The Follow-up Queue (D-021) adds separate optional WhatsApp consent, four server-computed opportunity kinds, owner-assisted `wa.me` actions, dismissal and an audited opt-out. Smart Tap never sends a message.

Glasswing Shield gate: **NOT APPROVED FOR REAL CUSTOMER DATA.** Open HIGH: GS-25 backups and GS-29 separate production project. GS-03 MFA passed live enrollment and challenge.

Estimated completion: 98% of the demonstration MVP and 82% of production readiness.

Current local gate after integrating `origin/claude/pr1-review`: `npm ci` found 0 vulnerabilities; strict `npm run audit:prod` found 0 vulnerabilities; `npm run verify` passed with 0 diagnostics, 66/66 tests and a complete standalone Node build. D-022 now uses a GET confirmation page and consumes `token_hash` only on POST. D-023 is closed with `http-cache-semantics@4.3.0`; the temporary exception script was removed. PR CI passed for integration commit `cbf817b`: GitHub Actions run `37174959751`, job `verify`.

## Follow-up Queue implementation — 2026-10-04

- Sections 1–8 of `docs/FOLLOW_UP_QUEUE.md` are implemented locally on PR #1.
- Capture has a separate optional unchecked WhatsApp consent; the 10-argument check-in preserves a prior opt-in and records consent purpose/version.
- The dashboard groups inactive, birthday, frequent and new opportunities. Viewer access is read-only. Owner, manager and AAL2 platform admin can contact or dismiss.
- `/api/dashboard/follow-up` scopes every customer read by business, recomputes the opportunity and builds the `wa.me` URL only from database values. Authorization errors propagate as 403 through the shared middleware.
- The explicit opt-out is atomic through `record_whatsapp_opt_out`; it updates the customer and appends consent and audit records.
- New migration: `20261004035554_follow_up_queue.sql`. It is committed only and has not been applied to hosted Supabase.
- Follow-up Queue gate remains complete: all sections 1–8 are covered in the combined 66/66-test gate. Strict `npm run audit:prod` reports 0 vulnerabilities. The migration remains unapplied.

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
- Business privacy notice and retention (D-011).
- Physical NFC writing.
- Reviewer approval and application of `20261004035554_follow_up_queue.sql`, followed by hosted Follow-up Queue smoke testing.

- Synchronize the newly approved Smart Tap commercial rules (D-025 to D-029) into contract/SOW and `Manual_de_Pricing.md` in ADN (the repository is not the pricing source of truth).
- Complete onboarding design with the CEO; only the form + verification-session model (D-029) is approved.
- Owner-defined offer library (D-028) is approved but not built yet; the queue still uses the fixed messages of `docs/FOLLOW_UP_QUEUE.md`.

## Coordination

**Single working branch until PR #1 merges: `codex/live-smoke-mfa`** (CEO instruction, 2026-10-04, supersedes the earlier `claude/mfa-review` instruction). Every agent — Codex, ChatGPT, Claude — commits there; after the merge, all work goes through pull requests to `main`. Read `docs/CHATGPT_COORDINATION_NOTE.md` before changing commercial or product assumptions. Every session ends with commit + push + `docs/HANDOFF.md` + the report for Claude Code (`AGENTS.md`). The Reviewer reviews by diff and gate, not by re-auditing settled areas.

## Reviewer status — 2026-10-04 (after a6526f2)

- Follow-up Queue migration applied live as `20261004035554_follow_up_queue`; hosted DB checks passed (see VERIFICATION).
- D-024 merged: Supabase Pro and a separate production project at the first signed client.
- PR #1: approved by the Reviewer for merge once the CEO enables branch protection on `main`. Remaining before real customer data: GS-25, GS-29 (D-024), templates pasted in Supabase, hosted UI smoke of the queue, host/domain, SMTP, privacy notice, physical NFC.

## Production hosting (D-030) — added by ChatGPT, reviewed by Claude Code

- Host: Render Web Service, Virginia, plan `0.5c-512mb` (paid; free tier sleeps), blueprint `render.yaml`, Node `22.22.0` (`.node-version`), URL `https://smarttap.yourbizupgraded.com`.
- `render.yaml` deploys from `main`. **Do not create the Render service before PR #1 merges**: `main` still has the old code, whose check-in function no longer runs against the database.
- Per D-024 the production service points at the separate Supabase Pro project created at the first signed client, not at `vrouyhxzxrfkuuqfslrc` (test/demo).
- `TRUSTED_IP_HEADER=x-forwarded-for` is set in the blueprint. The production smoke test must confirm the rate-limit identity is the visitor's IP (two phones on different networks are limited independently) before the first client goes live; if the domain is proxied through Cloudflare, switch to `cf-connecting-ip` and block direct `onrender.com` traffic.
- Runbooks: `docs/SETUP.md`, `docs/PRODUCTION_SMOKE_TEST.md`, `docs/CLIENT_ONBOARDING.md`, `docs/NFC_OPERATIONS.md`.
- Draft PR #2 (`ops/reconcile-live-2026-10-03`) is fully merged into PR #1 and can be closed.
