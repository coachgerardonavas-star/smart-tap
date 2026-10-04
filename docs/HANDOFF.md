# Smart Tap handoff

Updated: 2026-10-04 by Claude Code (Reviewer), after reconciling the ops branch.

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
| `claude/mfa-review` | **Current integration branch.** Contains the review hardening, Codex's MFA (`codex/live-smoke-mfa`), the MFA bypass fixes (D-020) and the ops reconciliation below. **Current CEO instruction: continue coordinated work here; do not create new current-work branches from `main`.** |
| `codex/live-smoke-mfa` | Head of PR #1. Must merge `claude/mfa-review`. |
| `ops/reconcile-live-2026-10-03` | Merged into `claude/mfa-review`. Its docs and live migration names are kept. Can be deleted after PR #1 merges. |
| `claude/review-hardening` | Superseded; already contained in the branches above. |

## Live Supabase (`vrouyhxzxrfkuuqfslrc`, us-east-1, free plan)

Migration history matches `supabase/migrations/` file names exactly:
`20261002005131_initial_schema`, `20261002014439_review_hardening_rate_limit_helper`, `20261002014453_review_hardening_check_in_v2`, `20261002072441_one_visit_per_day`, `20261004010900_admin_rls_requires_aal2`, `20261004021305_revoke_legacy_check_in`.

Data on 2026-10-04: Café Luna demo only (3 customers, 7 visits); one Auth user `automateit@yourbizupgraded.com`, confirmed, `platform_admin`, one MFA factor enrolled; no business members.

Advisors: Security — one WARN, leaked-password protection, Pro-plan feature (compensated by 12-character minimum and admin MFA). Performance — five INFO unindexed foreign keys, deferred until workload evidence.

## Current state

MVP implemented. Security hardening, one visit per customer per day (D-017), admin MFA at `aal2` for `/admin`, `/dashboard`, customer deletion and the Data API (D-019, D-020). `npm run verify`: 0 diagnostics, 41 tests.

Glasswing Shield gate: **NOT APPROVED.** Open HIGH: GS-25 backups and GS-29 separate production project (CEO plan decision). GS-03 MFA is implemented; live QR enrollment is done (factor exists) but the full admin smoke test is not recorded yet.

Estimated completion: 90% of the commercial MVP.

## Activation documents

`docs/SETUP.md`, `docs/PRODUCTION_SMOKE_TEST.md`, `docs/CLIENT_ONBOARDING.md`, `docs/NFC_OPERATIONS.md`, `docs/CODEX_NEXT.md`, `docs/CHATGPT_COORDINATION_NOTE.md`.

## Real blockers

- CEO: Supabase plan (backups GS-25, separate production project GS-29).
- Production host and domain (D-009), then Auth Site URL and redirect.
- Custom SMTP before commercial invitations.
- Business privacy notice and retention (D-011).
- Physical NFC writing.
- Synchronize the newly approved Smart Tap commercial rules into contract/SOW and authoritative Automate IT pricing documentation.
- Complete onboarding design with CEO; only the form + verification-session model is currently approved.

## Coordination rule

Work happens on the PR/integration branch, never directly on `main`. Current CEO instruction specifically identifies `claude/mfa-review` as the coordinated working branch. Every session ends with commit + push + `docs/HANDOFF.md` + the report for Claude Code (`AGENTS.md`). The Reviewer reviews by diff and gate, not by re-auditing settled areas. Read `docs/CHATGPT_COORDINATION_NOTE.md` before modifying commercial/product assumptions so parallel agents do not undo CEO-approved decisions.
