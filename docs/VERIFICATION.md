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

Supabase CLI and Docker are unavailable on this laptop, and no hosted Supabase credentials were supplied. The migration ran under embedded PostgreSQL, while Supabase-specific hosted behavior, SMTP delivery, PKCE invitation links, and the production deploy still need a live smoke test after credentials are connected.
