# Smart Tap — Current State

Canonical short status for agents. Updated 2026-10-10 after the WhatsApp opt-out investigation and Builder correction.

## In progress — confirmed WhatsApp opt-out and explicit dashboard business (2026-10-10)

- Builder: ChatGPT Codex, reused `codex/security-hardening`, based on `main` at `fac21b7`.
- Read-only production investigation (`fzrzrbzxjdezwylzkbkh`) confirmed both CEO test registrations recorded WhatsApp opt-in, followed by separate admin opt-out consent and audit rows at 15:21:34Z and 15:24:20Z. Both current flags are false. The mobile/desktop mismatch is consistent with pages loaded before/after those writes; screenshots/session timing were not verified in this workspace.
- The prior table button revoked consent on a single POST without confirmation. It now opens a read-only, tenant-scoped confirmation page with an unchecked required box; the POST also requires `confirmOptOut=yes`. No consent was restored and no production data was changed.
- Dashboard selection no longer falls back from an unknown explicit slug or chooses the first of multiple businesses. A single-business entry redirects to its explicit URL; multi-business entry requires a choice. Header links preserve the selected business.
- Local gate: 235/235 tests, 0 errors / 0 warnings / 1 pre-existing admin hint, full standalone build; production dependency audit 0 vulnerabilities. Four regression cases fail against the original opt-out route and pass after restoring the fix.
- No migration, merge or deploy. Reviewer must inspect and merge only after `verify` is green, then smoke-test desktop/mobile confirmation, cancellation, viewer/foreign-tenant denial, and explicit business URLs with synthetic data. Do not reverse existing opt-outs as part of deployment.

## Production

- App: `https://smarttap.yourbizupgraded.com`
- Hosting: Render (Virginia) behind Cloudflare.
- Production database: Supabase Pro project `fzrzrbzxjdezwylzkbkh` in organization `Smart Tap Produccion`, region us-west-2.
- The Supabase connector can access that production project directly by ID; `list_projects` does not enumerate it because it belongs to a different organization.
- Production organization `Smart Tap Produccion` is confirmed on the Pro tier.
- Test database: `vrouyhxzxrfkuuqfslrc`; it is not the app production database.
- `main` after PR #11: `836ea3b`.
- Production has all 14 repository migrations applied; a fresh production security-advisor check on 2026-10-05 returned zero lints.
- Café Luna is a synthetic demo tenant. Do not treat demo records as real customer evidence.

## Product state

The MVP is implemented and has live evidence for NFC check-in, multi-tenant isolation, owner/admin flows, MFA/AAL2, privacy, Terms v2, follow-up queue, customer branding and onboarding. PR #10 fixed the live Turnstile hydration defect and a subsequent real check-in was confirmed.

## In progress — D-058 stale sessions

- Builder: Claude Code (CEO assignment), branch `claude/stale-session-fix` from `main` at `67eb0a7` (PR #13 merged).
- Fixes the 2026-10-05 `mfa.txt` download: revoked sessions now go to `/login` with their cookies cleared, page errors are HTML and API errors JSON. Also closes the gap where a revoked `aal2` session kept reading `/admin` and `/dashboard` until its token expired.
- No migration. Each protected request now makes one extra Auth call (`getUser`).
- Production check after deploy: change a password on one device, then open `/admin` on another. It must land on `/login` without a download.

## Done locally, not yet pushed — admin form usability

- Requested by the CEO on 2026-10-10 after a test registration failed on "URL corta" and the public phone. Builder: Claude Code.
- "Nuevo negocio" now fills the short URL from the name (editable, normalized on blur) and the public phone accepts any common format; the server parses it with the business country and stores canonical E.164. The strict browser `pattern` on the phone is removed; the DB E.164 check and the server slug rule are unchanged.
- Changes `validation.test.ts` expectation: `305-555-0100` is now accepted and stored as `+13055550100`.
- Local gate: `npm run verify` clean (0 diagnostics, all tests, build). Branch and PR pending CEO decision.

## Done — D-057 customer styles v2 (PR #13 merged; migration pending Reviewer)

- Builder for this task: Claude Code, assigned by the CEO on 2026-10-06, branch `claude/customer-styles-v2` from `main` at `0492ec8` (PR #12 merged). A separate Claude Code session reviews.
- Photo hero, icons, visit counter, Instagram button, business-type presets, 24-photo stock library and four accent colors per style, in `/b/[slug]` and `/demo/capture`.
- New migration `20261006020000_customer_styles_v2.sql` (business_type, instagram_url, wider hero CHECK). **Not applied.** The Reviewer applies it before deploying; the code reads both columns with `select("*")` and treats missing values as `otro` / no Instagram.
- Open decision: the visit counter is returned only when the submitted name matches the stored name (partial reopening of D-052 finding 2; residual risk MEDIUM). Needs CEO/Reviewer acceptance.
- Local gate: clean `npm ci` (343 packages, 0 vulnerabilities), 0 diagnostics, 180/180 tests, complete build, strict production audit 0 vulnerabilities.

## Glasswing gate

- GS-25 backups: daily backups are enabled on Supabase Pro, but a restore has not yet been tested. This remains the formal gate before approval for real customer data. The current Supabase connector can read/manage the production project but exposes no backup-list or backup-restore operation, so the restore test cannot be executed through this connector.
- GS-49 security alerts: corrected locally on PR #12 with a successful-delivery cursor, expanded action allowlist, pure behavior-tested core and a 15-minute Render Cron Job in `render.yaml`. State: IMPLEMENTADO NO VERIFICADO; Blueprint creation, production secrets and Telegram smoke remain pending.
- GS-24 monitoring exists; deliberate end-to-end alert test remains to be recorded.
- First GS-55 monthly access review: 2026-11-01.

## Builder / Reviewer workflow

- Builder: ChatGPT Codex.
- Reviewer: Claude Code.
- Reuse `codex/security-hardening` for Codex Builder work. The CEO opened `claude/customer-styles-v2` for the D-057 task. Do not create another Builder branch unless the CEO or Reviewer explicitly changes this rule.
- Changes reach `main` only through PR with `verify` green and Reviewer inspection.
- Do not deploy, merge, migrate production, or add secrets merely to make a gate pass.

## Documentation order

1. Read this file for current state.
2. Read `docs/DECISIONS.md` for settled product/security decisions.
3. Read `docs/security/CONTROL_MATRIX.md` and `docs/VERIFICATION.md` for evidence.
4. Use `docs/HANDOFF.md` as detailed historical handoff; older sections may describe states that have since been superseded.
