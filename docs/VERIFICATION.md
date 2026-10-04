# Verification

Updated: 2026-10-03

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
