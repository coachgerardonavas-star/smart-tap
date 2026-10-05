# Security hardening — adversarial review of the deployed app (Claude Code, 2026-10-04, D-052)

Approved by the CEO. Builder implements items 1–7 in ONE PR before the Terms v2 task. Out of scope: GitHub Pro (branch protection) and Supabase Pro (backups, leaked-password protection), per the CEO.

## What held (verified against production / hosted test project)

Anonymous PostgREST reads of all 9 tables → 42501. Public sign-up disabled. `private` schema not exposed; every public SECURITY DEFINER function denies anon/authenticated. Session cookies are httpOnly + secure. Cross-site form POSTs → 403. Tenant isolation tests pass.

## Findings and required fixes

1. **HIGH — public check-in tampers with existing customers.** `record_public_check_in` upserts on (business, phone): anyone typing a known phone overwrites `full_name` and `birthday`, adds a visit, and `whatsapp_opt_in = old OR new` re-subscribes a customer who sent BAJA.
   Fix (one migration): for an existing customer keep `full_name`; set `birthday` only when it is null; add `customers.whatsapp_opted_out_at timestamptz`, set by `record_whatsapp_opt_out`; the public check-in never sets `whatsapp_opt_in = true` while `whatsapp_opted_out_at` is not null (the opt-in box is still recorded in `consent_records` as requested-but-blocked). Tests for each case.

2. **HIGH — public response leaks history.** The RPC returns `visitCount` and `alreadyCounted`; the API forwards them. Anyone can test a phone number and learn whether and how often that person visits.
   Fix: `/api/public/check-in` returns only `{ ok: true }` (plus the business name it already shows); the confirmation screen is identical for new and returning people. Keep the counts server-side only.

3. **HIGH — no bot protection on public forms.** Add Cloudflare Turnstile to the NFC check-in form and `/forgot-password` (and `/login`): widget on the page, server-side verification of the token before any database work, failure → generic 400. Env `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`; if either is missing the check is skipped and logged once (so a deploy never breaks). Widen the CSP only as Turnstile requires (`script-src` and `frame-src https://challenges.cloudflare.com`).

4. **MEDIUM — login and password reset have no own rate limit.** All Supabase Auth calls come from Render's single IP, so brute force is unthrottled per attacker and can trigger a project-wide Auth lockout; `/api/auth/forgot-password` can drain the 30 emails/hour project quota.
   Fix: rate limits in Postgres (same pattern as `private.bump_check_in_rate_limit`, keyed HMAC identifiers): login 10 per 15 min per IP and 5 per 15 min per email; forgot-password 3 per hour per email and 10 per hour per IP. Responses stay generic (no account enumeration). Tests.

5. **MEDIUM — business owners have no second factor.** A reused password exposes the business's customer list.
   Fix: owner-role members must reach AAL2 (TOTP) for `/dashboard`, `/api/dashboard/*` and any export, reusing the admin MFA enrollment flow (`/admin/mfa` logic, generalized to `/mfa`). Managers and viewers: optional for now.

6. **LOW — headers and grants.** Add `Strict-Transport-Security: max-age=31536000` (no preload, no includeSubDomains). Revoke EXECUTE on `private.create_profile_for_auth_user()` and `private.touch_updated_at()` from public/anon/authenticated (triggers keep working). Evaluate replacing `script-src 'unsafe-inline'` with hashes via Astro's CSP support; if it breaks hydration, document why and keep it.

7. **Edge readiness.** The CEO will put the domain behind Cloudflare's proxy after this PR. Confirm `requestIp` with `TRUSTED_IP_HEADER=cf-connecting-ip` returns the visitor IP (test) and that nothing else assumes Render's `x-forwarded-for`.

## Done outside the Builder

- Health-check Worker now monitors `https://smarttap.yourbizupgraded.com/demo` every 5 minutes with Telegram alerts (automate-it-website, branch `claude/smarttap-health-check`, deployed version `3b859824`).
- After this PR merges, the Reviewer enables the Cloudflare proxy + a rate-limiting rule for `smarttap`, switches Render's `TRUSTED_IP_HEADER` with the CEO, and the CEO disables Render's `onrender.com` subdomain.
- DMARC moves from `p=none` to `p=quarantine` after confirming Google, IONOS and Resend pass alignment.
- CEO: confirm two-step verification on Render, Supabase, Cloudflare, Resend, Google Workspace and GitHub; rotate the laptop's Supabase secret key periodically.
