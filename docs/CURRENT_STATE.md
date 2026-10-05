# Smart Tap — Current State

Canonical short status for agents. Updated 2026-10-05 after production cutover and PR #11.

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

## Glasswing gate

- GS-25 backups: daily backups are enabled on Supabase Pro, but a restore has not yet been tested. This remains the formal gate before approval for real customer data. The current Supabase connector can read/manage the production project but exposes no backup-list or backup-restore operation, so the restore test cannot be executed through this connector.
- GS-49 security alerts: corrected locally on PR #12 with a successful-delivery cursor, expanded action allowlist, pure behavior-tested core and a 15-minute Render Cron Job in `render.yaml`. State: IMPLEMENTADO NO VERIFICADO; Blueprint creation, production secrets and Telegram smoke remain pending.
- GS-24 monitoring exists; deliberate end-to-end alert test remains to be recorded.
- First GS-55 monthly access review: 2026-11-01.

## Builder / Reviewer workflow

- Builder: ChatGPT Codex.
- Reviewer: Claude Code.
- Reuse `codex/security-hardening` for the current Builder work. Do not create another Builder branch unless the CEO or Reviewer explicitly changes this rule.
- Changes reach `main` only through PR with `verify` green and Reviewer inspection.
- Do not deploy, merge, migrate production, or add secrets merely to make a gate pass.

## Documentation order

1. Read this file for current state.
2. Read `docs/DECISIONS.md` for settled product/security decisions.
3. Read `docs/security/CONTROL_MATRIX.md` and `docs/VERIFICATION.md` for evidence.
4. Use `docs/HANDOFF.md` as detailed historical handoff; older sections may describe states that have since been superseded.
