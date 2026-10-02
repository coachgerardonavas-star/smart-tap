# Verification

Last full local gate: 2026-10-01.

## Automated

`npm run check` passed with zero errors. `npm test` passed 21 tests across four files. `npm run build` produced the standalone Node server.

The tests cover:

- consent and field validation;
- phone normalization;
- slug, color, and redirect rejection;
- dashboard counts, repeat visits, inactivity, and birthdays;
- RLS enabled on every exposed table;
- anonymous roles denied from the check-in function;
- security-invoker aggregate view;
- full migration execution in PostgreSQL;
- demo seed creation;
- atomic customer, consent, and visit insertion;
- real RLS isolation between two businesses.

## Browser

The local `/demo` dashboard was checked at desktop size. Layout, metrics, customer table, and birthdays rendered correctly.

The local `/demo/capture` flow was checked in the browser. The form initially exposed a React hydration error. The TypeScript JSX override was removed, the server was restarted, and the form then rendered. A fictitious customer completed the flow and reached the visit confirmation.

## Dependency and build checks

All runtime dependencies are exact versions in `package.json` and `package-lock.json`. `npm audit` reported zero known vulnerabilities during installation.

## Remaining verification

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
