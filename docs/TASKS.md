# Tasks

## Complete

- [x] Create Astro and React project with pinned dependencies.
- [x] Create Git repository on `main`.
- [x] Model businesses, members, NFC tags, customers, consent, visits, audit, and rate limits.
- [x] Add grants, RLS, membership helpers, and security-invoker aggregate view.
- [x] Add atomic public check-in function.
- [x] Build branded NFC landing and confirmation.
- [x] Build password login, invitation callback, password setup, recovery, and logout.
- [x] Build tenant dashboard and customer deletion control.
- [x] Build Automate IT admin for business configuration, tags, and user invitations.
- [x] Add demo panel, demo capture, and database seed.
- [x] Add validation, headers, audit events, and rate limiting.
- [x] Add unit, schema, database-function, and cross-tenant tests.
- [x] Add product, architecture, decisions, setup, verification, and handoff docs.
- [x] Create/select production Supabase project `smart-tap` (`vrouyhxzxrfkuuqfslrc`, us-east-1).
- [x] Apply schema and hardening migrations to live Supabase.
- [x] Enable RLS on all public application tables.
- [x] Add one-visit-per-day behavior.
- [x] Require AAL2 for platform-admin RLS helper.
- [x] Reconcile live migration history into a separate Git branch for safe review/merge.
- [x] Choose Render paid Web Service (`0.5c-512mb`, Virginia) as production host.
- [x] Choose `https://smarttap.yourbizupgraded.com` as production URL.
- [x] Add reproducible Render Blueprint and pin Node 22.22.0.

## Production activation remaining

- [ ] Create/connect the Render service from `render.yaml`.
- [ ] Set production environment values/secrets on Render.
- [ ] Add/verify the custom domain and DNS CNAME.
- [ ] Configure Supabase Auth Site URL and allowed redirect URL for the final domain.
- [ ] Configure custom SMTP before commercial user invitations.
- [ ] Verify minimum password policy and MFA enrollment flow.
- [ ] Deploy application.
- [ ] Run `docs/PRODUCTION_SMOKE_TEST.md` against hosted production.
- [ ] Validate each business privacy notice and retention choice.
- [ ] Program NFC tags per `docs/NFC_OPERATIONS.md` and test on a real phone before locking.

## Non-blocking observations

- Supabase Free does not include leaked-password protection. Enable it if/when the organization is upgraded to Pro; do not treat the Free-plan limitation as an MVP defect.
- Five INFO-level unindexed foreign-key advisor findings exist. Optimize only when workload/query-plan evidence justifies the additional indexes.

No new MVP feature work is required by this list.
