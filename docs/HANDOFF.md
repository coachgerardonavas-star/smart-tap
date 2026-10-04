# Smart Tap handoff

Updated: 2026-10-04 by ChatGPT Codex (Builder), after integrating Claude's review and recording the hosted smoke test.

## Project identity

- Local path: `C:\automate-it\smart-tap` · GitHub: `coachgerardonavas-star/smart-tap`
- Builder: ChatGPT Codex · Reviewer: Claude Code
- Stack: Astro 7, React 19, Supabase JS/SSR, PostgreSQL, Supabase Auth, Vitest
- Security standard: Glasswing Shield v1.0 — matrix `docs/security/CONTROL_MATRIX.md`

## Branches — which one is current

| Branch | State |
|---|---|
| `main` | Original MVP (`f1ec5d3`). Does not match the live database: its code calls the old 8-argument check-in function, which no role may execute. **Do not deploy or build on `main` until PR #1 is merged.** |
| `claude/mfa-review` | Reviewer source integrated at `22cebbb`; contains the MFA bypass fixes (D-020) and ops reconciliation. |
| `codex/live-smoke-mfa` | **Current PR #1 branch.** Contains the hosted smoke evidence and integrates `claude/mfa-review`. |
| `ops/reconcile-live-2026-10-03` | Merged into `claude/mfa-review`. Its docs and live migration names are kept. Can be deleted after PR #1 merges. |
| `claude/review-hardening` | Superseded; already contained in the branches above. |

## Live Supabase (`vrouyhxzxrfkuuqfslrc`, us-east-1, free plan)

Migration history matches `supabase/migrations/` file names exactly:
`20261002005131_initial_schema`, `20261002014439_review_hardening_rate_limit_helper`, `20261002014453_review_hardening_check_in_v2`, `20261002072441_one_visit_per_day`, `20261004010900_admin_rls_requires_aal2`, `20261004021305_revoke_legacy_check_in`.

Data on 2026-10-04: Café Luna demo only (3 customers, 7 visits); one Auth user `automateit@yourbizupgraded.com`, confirmed, `platform_admin`, one MFA factor enrolled; no business members.

Advisors: Security — one WARN, leaked-password protection, Pro-plan feature (compensated by 12-character minimum and admin MFA). Performance — five INFO unindexed foreign keys, deferred until workload evidence.

## Current state

MVP implemented. Security hardening, one visit per customer per day (D-017), admin MFA at `aal2` for `/admin`, `/dashboard`, customer deletion and the Data API (D-019, D-020). The hosted application smoke test exercised capture, dashboard, NFC pause, viewer isolation, member pause and deletion cleanup.

Glasswing Shield gate: **NOT APPROVED FOR REAL CUSTOMER DATA.** Open HIGH: GS-25 backups and GS-29 separate production project. GS-03 MFA passed live enrollment and challenge.

Estimated completion: 96% of the demonstration MVP and 82% of production readiness.

Local gate after the Reviewer merge: `npm run verify` passed with 0 diagnostics and 41/41 tests; the standalone server build completed. `npm run audit:prod` passed with the exact temporary exception in D-023 for GHSA-ch52-4w7c-c8xp; any other high or critical finding fails CI. Post-merge PR CI passed: GitHub Actions run `37172436364`, job `verify`, commit `9dd0116`.

## Builder live smoke and cleanup — 2026-10-03

- Admin TOTP enrollment and challenge passed; `/admin` opened at AAL2.
- `review-live` capture created one customer, one visit and two consent records after a repeated same-day submission; the second submission did not add a visit.
- Dashboard, birthday, NFC pause/reactivation, viewer tenant isolation, `/admin` denial and member pause passed live.
- Three default recovery emails returned `otp_expired`, consistent with documented link prefetch. A fresh server-generated one-time token completed password recovery. D-022 records the production fix.
- Customer deletion cascaded from 1 visit and 2 consent records to zero; its audit event remains.
- Cleanup removed `review-live` and the viewer Auth user. Café Luna and the platform admin remain.
- PR #1: `https://github.com/coachgerardonavas-star/smart-tap/pull/1`.

## Activation documents

`docs/SETUP.md`, `docs/PRODUCTION_SMOKE_TEST.md`, `docs/CLIENT_ONBOARDING.md`, `docs/NFC_OPERATIONS.md`, `docs/CODEX_NEXT.md`.

## Real blockers

- CEO: Supabase plan (backups GS-25, separate production project GS-29).
- Production host and domain (D-009), then Auth Site URL and redirect.
- Paste `supabase/templates/invite.html` and `recovery.html` into Supabase Auth → Emails (prefetch-safe with the new callback); custom SMTP with tracking disabled before commercial invitations (D-022).
- Business privacy notice and retention (D-011).
- Physical NFC writing.

## Coordination rule

Work happens on the PR branch, never directly on `main`. Every session ends with commit + push + `docs/HANDOFF.md` + the report for Claude Code (`AGENTS.md`). The Reviewer reviews by diff and gate, not by re-auditing settled areas.
