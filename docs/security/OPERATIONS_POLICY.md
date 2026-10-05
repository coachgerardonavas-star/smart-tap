# Smart Tap — Security operations policy

Adopted 2026-10-05 by CEO decision (Gerardo Navas). Covers Glasswing Shield GS-24, GS-43, GS-49 and GS-55. Incident handling is in `INCIDENT_RESPONSE.md` (GS-54).

## GS-43 Sessions

| Setting | Value | Where it is enforced |
|---|---|---|
| Access token (JWT) lifetime | 1 hour | Supabase Auth (`jwt_expiry = 3600`) |
| Inactivity timeout | 7 days | Supabase Auth → Sessions (Pro feature) |
| Absolute session lifetime (time-box) | 30 days | Supabase Auth → Sessions (Pro feature) |
| Logout | Revokes every session of the user | `/api/auth/logout` calls `signOut()`, whose supabase-js default scope is `global` |
| Admin and owner second factor | TOTP, AAL2 required on server | D-020, D-052 |
| Forced sign-out of one user | Supabase → Authentication → Users → Sign out user | `INCIDENT_RESPONSE.md` §2 |

Known limit: an access token already issued stays valid until it expires (up to 1 hour) after a session is revoked, because Supabase JWTs are self-contained. Pausing a member or a business closes access immediately regardless, because every data path checks active membership in the database (GS-31, verified live).

Session fixation: sessions are created only by Supabase Auth after credential verification; the app never accepts a session identifier from a URL.

## GS-55 Access review

- **Frequency:** monthly, on the 1st.
- **Prepared by:** Claude Code (Reviewer), read-only.
- **Approved by:** the CEO, who decides what to remove.
- **Scope:**
  - platform admins;
  - members of every business, with role and status;
  - members paused for more than 30 days;
  - Supabase organization members;
  - Render, Cloudflare, Resend and GitHub collaborators;
  - API keys and tokens with their creation date.
- **Record:** one line per review in `docs/VERIFICATION.md`, with the date, what was found and what was removed.
- Nothing is removed without the CEO's approval, except an emergency containment under `INCIDENT_RESPONSE.md`.

## GS-24 Availability monitoring

- The `health-check` Worker (repository `automate-it-website`, cron every 15 minutes) requests `https://smarttap.yourbizupgraded.com/demo`.
- On the first failure it sends a Telegram alert. When the page responds again it sends a recovery message.
- `/demo` touches no customer data.
- Pending: one deliberate end-to-end alert test after the Cloudflare proxy is enabled.

## GS-49 Security alerts

Security events must reach Telegram separately from availability alerts.

| Event | Source | State |
|---|---|---|
| Rejected login or recovery because the application rate limit was hit | `security.auth_rate_limit` in `audit_log` | IMPLEMENTADO NO VERIFICADO |
| Repeated check-in rate limit hit | `security.check_in_rate_limit` in `audit_log` | IMPLEMENTADO NO VERIFICADO |
| New platform admin via the bootstrap path | `platform_admin.promoted` in `audit_log` | IMPLEMENTADO NO VERIFICADO |
| Business created, activated/paused, cancelled, approved, exported or term extended | `business.created`, qualifying `business.updated`, `business.cancelled`, `business.owner_approved`, `business.customers_exported`, `business.term_extended` | IMPLEMENTADO NO VERIFICADO |
| Member invited, activated or deactivated | `member.invited`, `member.activated`, `member.deactivated` | IMPLEMENTADO NO VERIFICADO |
| Customer deleted | `customer.deleted` | IMPLEMENTADO NO VERIFICADO |
| NFC tag created, activated or deactivated | `nfc_tag.created`, `nfc_tag.activated`, `nfc_tag.deactivated` | IMPLEMENTADO NO VERIFICADO |
| Cloudflare rate-limiting rule blocks | Cloudflare Security Events | PENDING — review weekly until native/API alerting is configured |
| Secret detected in a commit | Gitleaks in the `verify` workflow | IMPLEMENTED — the build fails; GitHub notifies the CEO by email |

Implementation:
- `src/lib/security-alert-audit.ts` writes deduplicated application security events to `audit_log`; raw IPs, email addresses and phone numbers are not stored in these alert rows.
- `src/lib/security-alerts-core.mjs` owns the allowlist, filtering, aggregation, cursor calculation and the 3,500-character message cap. Telegram receives only action names and counts; audit `details` never enter the message.
- `scripts/security-alerts.mjs` performs I/O. It reads the latest `alerts.digest_sent` row and queries qualifying events with `created_at > details.until`. With no cursor it starts 20 minutes earlier. Rows are ordered by `created_at` and limited to 1,000.
- The runner writes `alerts.digest_sent` only after Telegram accepts the message. Its details contain the final sent `created_at` as `until` and the sent count. Delivery failure leaves the cursor untouched so the next run retries.
- `alerts.digest_sent` is outside the event allowlist. A full 1,000-row page adds `1000+` to the message and advances no further than the last event read.
- `npm run security:alerts` runs one check. The Render Cron Job `smart-tap-security-alerts` is scheduled every 15 minutes on the Starter plan in Virginia.
- Runtime secrets are `PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`; they belong in the runtime secret store and must never be committed or pasted into agent chat.
- The runtime must use the production Supabase project. Deployment is not considered verified until a controlled security event produces the expected Telegram alert.

Until the scheduled runner is deployed and smoke-tested, the monthly access review also checks `audit_log`, and Cloudflare Security Events are reviewed manually at least weekly.
