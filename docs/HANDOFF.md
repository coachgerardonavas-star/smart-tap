# Smart Tap handoff

Updated: 2026-10-01

## Project identity

- Absolute path: `C:\automate-it\smart-tap`
- Git repository: local repository initialized in the project root
- Branch: `main`
- Builder: ChatGPT Codex
- Reviewer: Claude Code
- Stack: Astro 7, React 19, Supabase JS/SSR, PostgreSQL, Supabase Auth, Vitest

## Current state

The complete executable MVP is implemented. Public demo routes work without credentials. The live data path, Auth, invitations, dashboard, and admin require a Supabase project and environment values. No production project or deploy was changed because credentials and a target were not supplied.

Estimated completion: 92%. The remaining 8% is live activation, hosted verification, SMTP, domain deployment, and physical NFC writing.

## What works

- branded NFC landing, validation, consent, repeat identification, and confirmation;
- atomic customer, consent, and visit writes;
- database rate limiting and opaque NFC codes;
- strict tenant RLS and exact count dashboard;
- customers, visits per customer, latest visit, inactivity, and birthdays;
- Auth login, invitations, password setup, recovery, and logout;
- Automate IT business, branding, NFC, and member setup;
- audited admin changes and controlled customer deletion;
- responsive demo dashboard and capture flow;
- deterministic database seed.

## Key files

- Product scope: `specs/smart-tap.md`, `docs/PRODUCT.md`
- Architecture and decisions: `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`
- Database: `supabase/migrations/20261001000000_initial_schema.sql`
- Demo data: `supabase/seed.sql`
- Public capture: `src/pages/b/[slug].astro`, `src/pages/api/public/check-in.ts`
- Dashboard: `src/pages/dashboard/index.astro`
- Admin: `src/pages/admin/index.astro`, `src/pages/admin/[id].astro`
- Tests: `tests/`, `supabase/tests/`
- Activation: `docs/SETUP.md`
- Test record: `docs/VERIFICATION.md`

## Directory map

```text
smart-tap/
  docs/          product, architecture, decisions, setup, verification, handoff
  specs/         accepted MVP specification
  public/        static public assets
  src/
    components/  React and Astro UI
    layouts/     shared page layout
    lib/         Auth, tenant access, validation, metrics, Supabase clients
    pages/       public, Auth, dashboard, admin, and API routes
  supabase/
    migrations/  reproducible schema and security
    tests/       pgTAP catalog checks
    seed.sql     Café Luna demo data
  tests/         unit, security, and embedded PostgreSQL tests
```

## Reviewer instructions

Open the existing folder directly. Do not scaffold another project or create a worktree.

```powershell
cd C:\automate-it\smart-tap
git status --short --branch
git log -1 --oneline
npm ci
npm run verify
```

Review these risks first:

1. RLS membership helpers and cross-tenant isolation.
2. Service-only execution of `record_public_check_in`.
3. Admin bootstrap, token-hash email templates, and invitation callback behavior against a live Supabase project.
4. Tenant authorization before every service-role query.
5. Production privacy notice and retention choices.

Use `docs/VERIFICATION.md` to avoid repeating settled checks unless a later change touches them.

## Real blockers

- Supabase project URL, publishable key, secret key, and Auth access.
- Production SMTP configuration.
- Production host, domain, and deployment credentials.
- Business-specific logo, colors, privacy notice, and NFC hardware.

Continue with `docs/SETUP.md` when these inputs are available.
