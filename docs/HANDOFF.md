# Smart Tap handoff

Updated: 2026-10-03

## Project identity

- Absolute local path: `C:\automate-it\smart-tap`
- GitHub: `coachgerardonavas-star/smart-tap`
- Primary branch: `main`
- Ops reconciliation branch: `ops/reconcile-live-2026-10-03`
- Builder: ChatGPT Codex
- Reviewer: Claude Code
- Stack: Astro 7, React 19, Supabase JS/SSR, PostgreSQL, Supabase Auth, Vitest

## Current state

The executable MVP is implemented. Public demo routes, capture flow, dashboard, admin, Auth flows, tenant isolation and database tests exist.

A real Supabase project named `smart-tap` is now verified active and healthy in `us-east-1` with project ref `vrouyhxzxrfkuuqfslrc`. The live database already contains the application schema and five migrations. The previous handoff statement that a Supabase project still needed to be created/selected is obsolete.

Estimated software completion remains approximately 92-95%. Remaining work is primarily production activation and live end-to-end verification, not new MVP features.

## Verified live Supabase state

Tables currently present with RLS enabled:
- profiles
- businesses
- business_members
- nfc_tags
- customers
- consent_records
- visits
- audit_log

Live migration history:
1. `20261002005131_initial_schema`
2. `20261002014439_review_hardening_rate_limit_helper`
3. `20261002014453_review_hardening_check_in_v2`
4. `20261002072441_one_visit_per_day`
5. `20261004010900_admin_rls_requires_aal2`

The reconciliation branch versions these migrations so Git history matches the live database. The stale local initial migration number `20261001000000` was replaced by the live version number `20261002005131` on that branch.

## Security status

- RLS is enabled on every public application table.
- `record_public_check_in` is SECURITY DEFINER and is not executable by `anon` or `authenticated`; the current version is granted to `service_role` only.
- private authorization helpers remain outside the exposed public schema.
- platform-admin RLS now requires AAL2 in the live database.
- Supabase Security Advisor currently reports one warning: leaked-password protection is disabled. This feature is only available on Supabase Pro and above; on Free this is an expected plan limitation, not an unresolved implementation defect. Keep strong password requirements and MFA/AAL2 as compensating controls. Enable leaked-password protection if/when the organization upgrades to Pro.
- Performance Advisor reports five INFO-level unindexed foreign keys. They are optimization opportunities, not release blockers. Do not add indexes without workload evidence unless query plans show a need.

## What works

- branded NFC landing, validation, consent, repeat identification, and confirmation;
- atomic customer, consent, and visit writes;
- database rate limiting and opaque NFC codes;
- one counted visit per customer/business local day;
- strict tenant RLS and exact count dashboard;
- customers, visits per customer, latest visit, inactivity, and birthdays;
- Auth login, invitations, password setup, recovery, and logout;
- Automate IT business, branding, NFC, and member setup;
- audited admin changes and controlled customer deletion;
- responsive demo dashboard and capture flow;
- deterministic database seed.

## Documentation added for activation

- `docs/PRODUCTION_SMOKE_TEST.md`
- `docs/CLIENT_ONBOARDING.md`
- `docs/NFC_OPERATIONS.md`

## Remaining real blockers / dependencies

- Production application host and final public domain/URL.
- Production environment secret values on that host.
- Auth Site URL + allowed redirect URL aligned to the final domain.
- Custom SMTP configuration before commercial invitations.
- Final business privacy notice/retention choices.
- Physical NFC writing and phone validation.
- Hosted end-to-end smoke test after deployment.

## Coordination rule

Codex should continue implementation on `main` without redoing this audit. Before merging the ops reconciliation PR, first check whether Codex has added any newer migration or documentation changes and resolve only actual conflicts. Claude Code should review by diff/gate rather than re-auditing settled areas.
