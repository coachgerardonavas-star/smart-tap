# Smart Tap handoff

Updated: 2026-10-03

## Project identity

- Absolute path: `C:\automate-it\smart-tap`
- Repository: `coachgerardonavas-star/smart-tap`
- Builder: ChatGPT Codex
- Reviewer: Claude Code
- Stack: Astro 7, React 19, Supabase JS/SSR, PostgreSQL, Supabase Auth, Vitest

## Current state

The executable MVP is implemented. The production Supabase backend already exists and is active. Live migration history has been reconciled into branch `ops/reconcile-live-2026-10-03` for safe review before merge.

Production hosting decision is also complete:

- Host: Render Web Service
- Plan: `0.5c-512mb` paid baseline
- Region: Virginia
- Public URL: `https://smarttap.yourbizupgraded.com`
- Blueprint: `render.yaml`
- Node: `22.22.0`

The remaining work is activation and hosted verification, not new MVP feature development.

## Verified backend

Supabase:

- Project: `smart-tap`
- Ref: `vrouyhxzxrfkuuqfslrc`
- Region: `us-east-1`
- Status observed: `ACTIVE_HEALTHY`

Observed public application tables all have RLS enabled: `profiles`, `businesses`, `business_members`, `nfc_tags`, `customers`, `consent_records`, `visits`, `audit_log`.

Live migrations:

1. `20261002005131_initial_schema`
2. `20261002014439_review_hardening_rate_limit_helper`
3. `20261002014453_review_hardening_check_in_v2`
4. `20261002072441_one_visit_per_day`
5. `20261004010900_admin_rls_requires_aal2`

## Supabase advisors

Security advisor: leaked-password protection disabled. This feature requires Supabase Pro or above and is therefore not a blocker on the current Free plan. Compensating controls include a 12+ character password policy and MFA/AAL2 for platform administration.

Performance advisor: five INFO-level foreign-key indexing suggestions. Do not add indexes solely to clear informational findings; revisit with workload/query-plan evidence.

## What works

- branded NFC landing, validation, consent, repeat identification, and confirmation;
- atomic customer, consent, and visit writes;
- one visit counted per business-local day;
- database rate limiting and opaque NFC codes;
- strict tenant RLS and exact-count dashboard;
- customers, visits per customer, latest visit, inactivity, and birthdays;
- Auth login, invitations, password setup, recovery, and logout;
- Automate IT business, branding, NFC, and member setup;
- audited admin changes and controlled customer deletion;
- responsive demo dashboard and capture flow;
- deterministic database seed.

## Production activation remaining

1. Connect/create the Render service from `render.yaml`.
2. Supply Render secret/environment values.
3. Verify the generated `onrender.com` deployment.
4. Add DNS for `smarttap.yourbizupgraded.com` and verify TLS.
5. Set Supabase Auth Site URL and redirect URL to the custom domain.
6. Configure SMTP before commercial invitations.
7. Confirm admin MFA/AAL2 behavior.
8. Run `docs/PRODUCTION_SMOKE_TEST.md`.
9. Validate privacy/retention choices.
10. Program and physically test NFC before locking the tag.

## Operational runbooks

- Activation: `docs/SETUP.md`
- Production smoke gate: `docs/PRODUCTION_SMOKE_TEST.md`
- New client onboarding: `docs/CLIENT_ONBOARDING.md`
- NFC programming/delivery: `docs/NFC_OPERATIONS.md`
- Test evidence: `docs/VERIFICATION.md`

## Coordination

Do not scaffold another project or create a worktree. Codex should not duplicate the Supabase reconciliation. Reviewer should use existing verification evidence and review only new/affected areas unless a material finding requires broader inspection.

Draft PR #2 contains the backend reconciliation and production-operations preparation. Do not merge blindly over uncommitted local Builder work; fetch/compare first.
