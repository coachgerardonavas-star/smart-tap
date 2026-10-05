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

These events must reach Telegram separately from availability alerts:

| Event | Source | State |
|---|---|---|
| Spike of rejected logins or recovery requests (auth rate limit hit) | `auth_rate_limits` counters / Render logs | PENDING — needs a scheduled check |
| Check-in rate limit hit repeatedly from one IP hash | check-in function | PENDING |
| Cloudflare rate-limiting rule blocks | Cloudflare Security Events | PENDING — review weekly until automated |
| New platform admin or role change | `audit_log` | PENDING |
| Business activated, paused or cancelled | `audit_log` (`business.*`) | PENDING |
| Secret detected in a commit | Gitleaks in the `verify` workflow | IMPLEMENTED — the build fails; GitHub notifies the CEO by email |

Planned implementation (Builder task, separate PR): a scheduled check that reads counters and `audit_log` since the last run and posts a summary to the internal Telegram chat only when a threshold is crossed. It must use a service credential held by the runtime, never by an agent. Until it exists, the monthly access review also checks `audit_log` for these events.
