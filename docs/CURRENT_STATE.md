# Smart Tap — Current State

Canonical short status for agents. Updated 2026-10-09 after the D-057 business-type alignment on `codex/customer-styles-v2`.

## Production

- App: `https://smarttap.yourbizupgraded.com`
- Hosting: Render (Virginia) behind Cloudflare.
- Production database: Supabase Pro project `fzrzrbzxjdezwylzkbkh` in organization `Smart Tap Produccion`, region us-west-2.
- The Supabase connector can access that production project directly by ID; `list_projects` does not enumerate it because it belongs to a different organization.
- Production organization `Smart Tap Produccion` is confirmed on the Pro tier.
- Test database: `vrouyhxzxrfkuuqfslrc`; it is not the app production database.
- Repository `main`: `bfec079`, including D-057 through PR #13 and D-058 through PR #14.
- Production has all 14 repository migrations applied; a fresh production security-advisor check on 2026-10-05 returned zero lints.
- Café Luna is a synthetic demo tenant. Do not treat demo records as real customer evidence.

## Product state

The MVP is implemented and has live evidence for NFC check-in, multi-tenant isolation, owner/admin flows, MFA/AAL2, privacy, Terms v2, follow-up queue, customer branding and onboarding. PR #10 fixed the live Turnstile hydration defect and a subsequent real check-in was confirmed.

## Done — D-058 stale sessions (PR #14 merged)

- Builder: Claude Code, branch `claude/stale-session-fix`, merged through PR #14.
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
- New migration `20261006020000_customer_styles_v2.sql` (business_type, instagram_url, wider hero CHECK). **Not applied.** The Reviewer applies it before deploying; the code reads both columns with `select("*")` and uses the café presentation for legacy rows without a type.
- Open decision: the visit counter is returned only when the submitted name matches the stored name (partial reopening of D-052 finding 2; residual risk MEDIUM). Needs CEO/Reviewer acceptance.
- Local gate: clean `npm ci` (343 packages, 0 vulnerabilities), 0 diagnostics, 180/180 tests, complete build, strict production audit 0 vulnerabilities.

## In review — D-057 exact business types

- Branch `codex/customer-styles-v2` merges current `main` and aligns the preset and database list to the approved values: restaurante, cafe, panaderia, barberia, salon, heladeria, tienda and gimnasio.
- The branch bundles the approved design source and preview, keeps 24 local Unsplash photos, and records every source in `public/stock/ATTRIBUTION.md`.
- Migration remains `20261006020000_customer_styles_v2.sql` and remains unapplied. The branch does not deploy or change hosted data.
- Local gate on commit `9340895`: clean `npm ci` (335 packages), 0 diagnostics, 200/200 tests, complete build and 0 production audit vulnerabilities.
- PR #15: `https://github.com/coachgerardonavas-star/smart-tap/pull/15`; GitHub Actions `verify` passed in run `38001552770` before this final documentation sync.

## Glasswing gate

- GS-25 backups: daily backups are enabled on Supabase Pro, but a restore has not yet been tested. This remains the formal gate before approval for real customer data. The current Supabase connector can read/manage the production project but exposes no backup-list or backup-restore operation, so the restore test cannot be executed through this connector.
- GS-49 security alerts: corrected locally on PR #12 with a successful-delivery cursor, expanded action allowlist, pure behavior-tested core and a 15-minute Render Cron Job in `render.yaml`. State: IMPLEMENTADO NO VERIFICADO; Blueprint creation, production secrets and Telegram smoke remain pending.
- GS-24 monitoring exists; deliberate end-to-end alert test remains to be recorded.
- First GS-55 monthly access review: 2026-11-01.

## Builder / Reviewer workflow

- Builder: ChatGPT Codex.
- Reviewer: Claude Code.
- Current Builder branch: `codex/customer-styles-v2`. Start later tasks from updated `main` after this branch completes review.
- Changes reach `main` only through PR with `verify` green and Reviewer inspection.
- Do not deploy, merge, migrate production, or add secrets merely to make a gate pass.

## Documentation order

1. Read this file for current state.
2. Read `docs/DECISIONS.md` for settled product/security decisions.
3. Read `docs/security/CONTROL_MATRIX.md` and `docs/VERIFICATION.md` for evidence.
4. Use `docs/HANDOFF.md` as detailed historical handoff; older sections may describe states that have since been superseded.
