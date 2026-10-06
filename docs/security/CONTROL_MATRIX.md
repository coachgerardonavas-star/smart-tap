# Smart Tap — Glasswing Shield v1.0 control matrix

Revision: branch `codex/security-hardening`, 2026-10-04. Prepared by Claude Code (Reviewer), updated by ChatGPT Codex with D-052 local evidence. Environments: L = local tests; H = hosted Supabase `vrouyhxzxrfkuuqfslrc`; P = existing Render service. The security-hardening migration has not been deployed or applied to Supabase.

**Gate result (2026-10-05): production environment live; approval for real customer data waits only on the GS-25 restore test.** GS-29 and GS-28/30 are closed. GS-25 is implemented (daily backups on Supabase Pro) but no restore has been tested yet. The demonstration business runs on the production project with synthetic data.

## Threat model (GS-57)

| Asset | Attacker | Path | Impact | Control | Test |
|---|---|---|---|---|---|
| Customer PII of all tenants | Outsider with a stolen admin password | /admin, service-role queries | Full cross-tenant disclosure | GS-03 TOTP and server-enforced aal2 for platform_admin | L tests + H enrollment/challenge |
| Customer PII of tenant B | Member of tenant A | Dashboard/API with B's slug or ids | Cross-tenant disclosure | Server resolves tenant from memberships; RLS | L + H cross-tenant tests |
| Visit counts / future rewards | Customer with a copied NFC URL | Scripted check-ins | Inflated loyalty | D-017 one visit per day; 3/phone, 40/IP per 10 min | L + H |
| Customer identity | Anyone knowing a phone | Check-in with that phone | Name or birthday overwrite; visit history disclosure | Existing identity fields are preserved; D-057 returns `visitCount` only when the submitted name matches the stored name. Residual (MEDIUM, pending CEO/Reviewer acceptance): phone + name reveals the count; a missing counter reveals that the phone is registered | L PGlite + route + unit tests |
| WhatsApp consent and phone | Viewer or member of another tenant | Follow-up form or guessed customer id | Message without permission or cross-tenant disclosure | Separate opt-in; server loads scoped customer; owner/manager/AAL2 guard; no phone/message form fields | L route/RLS tests + H owner/viewer smoke |
| Service availability | Bot | Large or many requests | Resource exhaustion | GS-33 byte-counted body limit; database rate limits; Turnstile on public forms | L |
| Admin session | Phishing site | Open redirect after login | Credential theft | safeNextPath | L |
| Business terms | Member of tenant A or a modified browser form | Accept for tenant B or bypass the current version | Unauthorized dashboard use or false legal record | Server-set version, membership check, per-tenant RLS and dashboard gate | L PGlite + route tests |
| Secrets | Build artifact leak | dist/ | Full database access | Runtime env (D-013) | L canary build |

## Controls

| Control | Applies | State | Evidence | Pending |
|---|---|---|---|---|
| GS-01 Org isolation | Yes | VERIFICADO EN EL ENTORNO OBJETIVO (H) | Memberships resolve tenant; delete filters tenant+customer; H: 0 cross-tenant rows | — |
| GS-02 Strict RLS | Yes | VERIFICADO EN EL ENTORNO OBJETIVO (H) + L D-045 | Hosted follow_ups RLS and composite tenant FK passed Reviewer checks; local terms acceptance RLS hides foreign rows and denies authenticated writes | Decide FORCE RLS (low) |
| GS-03 Robust auth | Yes | VERIFICADO (H admin + L owner) | TOTP enrolled and challenged live for admin; signed `aal2` required for platform admins and active business owners on customer-data paths | Hosted owner enrollment after migration/deploy |
| GS-04 Server authorization | Yes | VERIFICADO EN EL ENTORNO OBJETIVO (H) + L D-045 | Hosted owner completed contact, dismiss and opt-out; local tests deny viewer/AAL1 admin and require current terms on every dashboard data route | Hosted D-045 smoke |
| GS-05 Least privilege | Yes | VERIFICADO (H + L D-052) | Check-in and auth-limit RPCs are service-only; auth counter table denies direct service-role writes; private trigger functions deny app roles | Reviewer applies migration |
| GS-06 Secrets | Yes | VERIFICADO | Runtime env, canary build clean, .env ignored, history scan clean; Gitleaks passed in PR run 37174554236 | — |
| GS-07 Private storage | No | NO APLICA JUSTIFICADO | No file storage | — |
| GS-08 Input validation | Yes | VERIFICADO LOCALMENTE | Zod schemas, E.164 business contact, email, slug, colors, URLs, minimum age 13, next path; Google Review accepts only HTTPS on four approved exact hosts; theme enum, 80-char tagline, exactly three 40-char benefits and HTTPS hero URL have app and DB checks; D-057 adds business type enum, canonical Instagram profile URL, library-only `/stock/` hero paths and accent within the style palette (app) | — |
| GS-09 Uploads | No | NO APLICA JUSTIFICADO | No uploads; logo is an external URL | — |
| GS-10 Anti-abuse | Yes | VERIFICADO (H check-in + L auth) | Multi-instance PostgreSQL counters enforce login and recovery limits by keyed IP/email hashes; Turnstile runs before database access | Hosted smoke after deploy |
| GS-11 CORS | Yes | VERIFICADO LOCALMENTE | No CORS headers; same-origin only | — |
| GS-12 Headers/transport | Yes | VERIFICADO LOCALMENTE | HSTS max-age one year; CSP, nosniff, Referrer and Permissions present; Turnstile adds only its script/frame origin. Built Astro hydration still needs `script-src 'unsafe-inline'` (D-054) | Move to Astro CSP hashes with full hydration regression gate |
| GS-13 Framing | Yes | VERIFICADO LOCALMENTE | frame-ancestors 'none' + X-Frame-Options DENY | — |
| GS-14 Webhooks | No | NO APLICA JUSTIFICADO | No webhooks | — |
| GS-15 Replay | Yes | VERIFICADO (H) plus local callback tests | Repeat check-in same day did not count; invite and recovery tokens are single-use; token_hash is consumed only by an explicit POST (D-022) | Paste repository email templates into Supabase |
| GS-16 Idempotency | Yes | VERIFICADO (H) | Check-in idempotent per customer-day | — |
| GS-17 Race conditions | Yes | VERIFICADO (L+H) | Local parallel member test ends at exactly 2; hosted admin smoke accepted owner+manager and rejected the third active user | — |
| GS-18 Transactions | Yes | VERIFICADO (L+H) | Check-in, WhatsApp opt-out and member slots use PostgreSQL functions; owner signature atomically writes signature, acceptance and version-only audit; owner approval and term extension are atomic | Hosted Terms v2 smoke |
| GS-19 SSRF | No | NO APLICA JUSTIFICADO | Server fetches only Supabase | — |
| GS-20 Own API keys | No | NO APLICA JUSTIFICADO | No API keys issued | — |
| GS-21 Tokens/links | Yes | VERIFICADO (H) | NFC codes 144-bit random; hosted invite accepted; server-generated recovery token completed once | Prefetch-safe production email path |
| GS-22 Audit | Yes | VERIFICADO EN EL ENTORNO OBJETIVO (H) + L D-049/D-051 | Hosted opt-out/approval/update audits passed; local signature audit stores only its version and extension audit stores prior/new dates | Hosted Terms v2 smoke after Reviewer migration |
| GS-23 Logs | Yes | VERIFICADO LOCALMENTE | Error codes only; IP keyed hash | — |
| GS-24 Monitoring | Yes | IMPLEMENTADO EN EL ENTORNO OBJETIVO | `health-check` Worker checks `/demo` every 15 min and alerts by Telegram (OPERATIONS_POLICY.md) | Deliberate end-to-end alert test |
| GS-25 Backups | Yes | IMPLEMENTADO NO VERIFICADO | Production project `fzrzrbzxjdezwylzkbkh` is in the Pro organization "Smart Tap Produccion" (daily backups, 7-day retention) | Restore test into an isolated project after the first daily backup exists; record date and result |
| GS-26 Dependencies | Yes | VERIFICADO LOCALMENTE | Lockfile resolves http-cache-semantics@4.3.0 and eight local latin variable-font packages; strict npm audit reports 0 vulnerabilities; D-023 exception removed | — |
| GS-27 Supply chain/CI | Yes | VERIFICADO | Actions pinned to SHAs, read-only permissions; Follow-up Queue PR run 37174554236 passed | — |
| GS-28 Secure Build Gate | Yes | VERIFICADO EN EL ENTORNO OBJETIVO | GitHub ruleset `protect-main`: pull request required, `verify` required, no force push, no deletion. PR #9 showed `blocked` until `verify` passed, then `clean` | — |
| GS-29 Separate environments | Yes | VERIFICADO EN EL ENTORNO OBJETIVO | Production `fzrzrbzxjdezwylzkbkh` (Pro org, us-west-2) is separate from test `vrouyhxzxrfkuuqfslrc`; Render reads production (verified with a production-only value on 2026-10-05) | Retire or pause the test project |
| GS-30 Production control | Yes | VERIFICADO | Ruleset on `main`; Render deploys only `main`; agents never merge or deploy; the production secret key was created and pasted into Render by the CEO | — |
| GS-31 Emergency stop | Yes | VERIFICADO EN EL ENTORNO OBJETIVO (H) | Paused NFC rejected check-in; reactivation restored it. Paused viewer immediately lost tenant data | — |
| GS-32 Proxies/IP | Yes | VERIFICADO EN EL ENTORNO OBJETIVO | Cloudflare proxy on (A records resolve to Cloudflare); `TRUSTED_IP_HEADER=cf-connecting-ip` set in Render; `onrender.com` subdomain disabled (404), so the header cannot be supplied by bypassing Cloudflare | — |
| GS-33 Request limits | Yes | VERIFICADO LOCALMENTE | Byte-counted 12 KB limit on check-in; customer list 250, birthdays 1000 | Admin form posts rely on platform limits (low) |
| GS-34 Content integrity | Yes | VERIFICADO LOCALMENTE | Electronic signature binds user, business and immutable server-set version with timestamp, keyed IP hash and user agent; duplicates do not overwrite original evidence | Hosted signature smoke |
| GS-35 Immutable versions | Partial | VERIFICADO LOCALMENTE | Visit and WhatsApp consent use append-only rows; the server fixes privacy version `2026-10-04` and terms version `2026-10-04-v2`; each new terms version requires a new signature or acceptance | — |
| GS-36 Least-privilege agents | Yes | VERIFICADO | Agents never receive the secret key (Codex prompt rule) | — |
| GS-37 Prompt injection | No | NO APLICA JUSTIFICADO | No AI in product | — |
| GS-38 Secure defaults | Yes | VERIFICADO LOCALMENTE | Missing env fails closed; new businesses default inactive; a new activation requires business contact, current-version owner signature and approval; expiry never changes status automatically | — |
| GS-39 Deny on doubt | Yes | VERIFICADO LOCALMENTE | Missing claims → 401; no membership → 403; missing current terms → dashboard redirect or API 403 | — |
| GS-40 Adversarial tests | Yes | VERIFICADO (H) partial + local | Hosted viewer had no actions and no-opt-in had no send button; local tests reject other tenant, foreign customer, stale opportunity and AAL1 admin | Expired/tampered JWT live |
| GS-41 CSRF | Yes | VERIFICADO LOCALMENTE | Astro checkOrigin (403 cross-origin); HttpOnly cookies; no GET state changes | — |
| GS-42 Account attacks | Yes | VERIFICADO LOCALMENTE | Generic responses; prefetch-safe callback; Turnstile before database/Auth; own IP/email limits for login and recovery | Hosted flow after deploy |
| GS-43 Sessions | Yes | IMPLEMENTADO NO VERIFICADO | Policy: 1 h JWT, 7-day inactivity, 30-day time-box; logout revokes all sessions (OPERATIONS_POLICY.md). D-058: every protected request confirms the session with Auth (`getUser`), so a revoked session stops immediately; stale cookies are cleared and the user is sent to login (L unit tests + local end-to-end probe) | Set timeouts in the production Supabase project (Pro) and verify |
| GS-44 Recent auth | Yes | VERIFICADO (H admin + L owner) | Every platform-admin path and active owner customer-data path requires AAL2; managers/viewers remain optional by D-052 | Hosted owner smoke |
| GS-45 BOLA/IDOR | Yes | VERIFICADO EN EL ENTORNO OBJETIVO (H) plus local routes | Hosted scoped owner actions and read-only viewer passed; signature function rejects managers and owners of another tenant; admin mutations stay behind AAL2 | Hosted Terms v2 smoke |
| GS-46 Mass assignment | Yes | VERIFICADO (H) plus local tests | Browser consent version is stripped and server version is fixed; hosted WhatsApp path uses database phone/message/offer | — |
| GS-47 DB constraints | Yes | PENDIENTE — LOW | PGlite rejects invalid style/signature values, invalid D-057 business type, Instagram URL and stock hero paths, missing current signature activation and invalid term extensions; `untagged` is non-null; visits.tag_id and consent_records lack composite tenant FKs | Composite FKs |
| GS-48 Edge protection | Yes | VERIFICADO EN EL ENTORNO OBJETIVO | Turnstile live on check-in, login and recovery (CEO phone test: login and a check-in succeeded after the PR #10 fix); Cloudflare rate-limiting rule `smart-tap-auth-checkin` (POST, 20 per 10 s per IP) | — |
| GS-49 Security alerts | Yes | IMPLEMENTADO NO VERIFICADO | Cursor after successful Telegram delivery, explicit event allowlist, count-only 3,500-character messages, 1,000-row cap and behavior tests (D-056) | Create the Render Cron Job from the Blueprint, paste secrets and run the production Telegram smoke |
| GS-50 Data classification | Yes | IMPLEMENTADO | Customer and signer names, phone, birthday, title and consent are confidential PII; keyed IP hash is pseudonymous security evidence; follow-up and term status are internal data | Add handling rules to production privacy notice |
| GS-51 Retention/deletion | Yes | IMPLEMENTADO Y PROBADO LOCALMENTE | Private daily function deletes at 24 months without a visit and 90 days after cancellation; 31-day cancellation data remains; cascades and count-only audits passed in PGlite | Reviewer applies migration and repeats hosted smoke |
| GS-52 Encryption keys | No | NO APLICA JUSTIFICADO | No app-level encryption | — |
| GS-53 Domains/infra accounts | Yes | VERIFICADO (CEO report) | 2FA active on GitHub, Google, Render, Supabase and Resend; Cloudflare uses Google sign-in protected by Google 2FA | Optional native Cloudflare 2FA |
| GS-54 Incident response | Yes | IMPLEMENTADO | INCIDENT_RESPONSE.md: CEO decides, Telegram channel, containment steps, evidence, recovery, contract notice (Terms point 12) | Tabletop drill once production exists |
| GS-55 Access review | Yes | IMPLEMENTADO Y PROBADO (H) | Member pause removed viewer access immediately; monthly review on the 1st prepared by Reviewer, approved by CEO (OPERATIONS_POLICY.md) | First review 2026-11-01 |
| GS-56 Regression tests | Yes | VERIFICADO LOCALMENTE + smoke H | Final gate: 144/144 permanent tests, zero diagnostics and complete build; D-052 covers data preservation, opt-out, minimal response, Turnstile, auth limits, owner MFA, grants, HSTS and Cloudflare IP | Final CI and hosted D-052 smoke |
| GS-57 Threat model | Yes | VERIFICADO (H) | Stolen-password path is constrained by hosted TOTP/AAL2; tenant and emergency-stop paths passed live | — |
| GS-58 Inventory | Yes | VERIFICADO | Lockfile; PR run 37174554236 produced the CycloneDX SBOM artifact | — |
| GS-59 Malware | No | NO APLICA JUSTIFICADO | No uploads | — |
| GS-60 Acceptance criteria | Yes | IMPLEMENTADO | This matrix is part of done | — |

## Update 2026-10-04 (Claude Code review of PR #1)

- GS-03: VERIFICADO EN EL ENTORNO OBJETIVO. MFA covers `/admin`, `/dashboard`, customer deletion and the Data API bypass (D-020); enrollment and live challenge passed.
- GS-02: VERIFICADO EN EL ENTORNO OBJETIVO for the admin RLS path at aal1/aal2.
- GS-56: two new permanent regression tests (app guard, SQL helper).

## Update 2026-10-04 (Reviewer, after PR #1 commit 84ca9ae)

- GS-26: VERIFICADO LOCALMENTE — `http-cache-semantics` 4.3.0, `npm audit` 0 vulnerabilities; D-023 exception removed.
- GS-42 / GS-15: IMPLEMENTADO NO VERIFICADO en vivo — `/auth/callback` verifies `token_hash` only on POST; link prefetch cannot consume it. Requires the repository templates in Supabase.

## Update 2026-10-04 (Builder, hosted Follow-up Queue UI smoke)

- GS-02, GS-04, GS-22, GS-45 and GS-46: hosted evidence added for migration/RLS, owner actions, viewer restrictions, audit and the server-built WhatsApp redirect.
- GS-40: hosted viewer and no-opt-in paths passed; expired/tampered JWT remains a separate live check.
- GS-56: hosted smoke completed; cleanup restored Café Luna and the platform admin as the only demo business/user state.

## Update 2026-10-04 (Builder, onboarding configuration)

- GS-08: direct Google Review hosts and offer lengths are validated in Zod and constrained in the migration.
- GS-17 / GS-18: row-locked member functions enforce two active users during parallel calls; owner approval plus audit is atomic.
- GS-22: owner approval audit passed in PGlite.
- GS-38: new businesses default inactive and activation requires an approval timestamp at the database layer.
- GS-56: initial local gate passed 75/75 tests; the Reviewer later applied the migration as `20261004130503_onboarding_config`.

## Update 2026-10-04 (Builder, PR #3 finish)

- GS-17 / GS-18: hosted admin flow kept two active members, rejected the third, recorded owner approval and activated the business.
- GS-22: hosted `business.updated` audit contained only the five changed column names and no offer values.
- GS-46: hosted WhatsApp suggestion used the New offer loaded from the approved business row.
- GS-56: local gate passed 78/78; exact 390×844 before/after images are committed; hosted cleanup left only Café Luna and the expected admin.

## Update 2026-10-04 (Builder, D-044 privacy notice)

- GS-08 / GS-38: E.164/email contact validation, minimum age 13 and activation contact/cancellation constraints passed locally.
- GS-22 / GS-51: PGlite executed 24-month and 30-day purges, cascades and exact count-only audits; private execute permissions were denied to application roles.
- GS-35 / GS-46: server fixes privacy version `2026-10-04`; browser input is absent and injected values are stripped.
- GS-41 / GS-44: CSV export and cancellation are POST-only and require the AAL2 platform-admin guard.
- GS-56: final local gate passed 94/94 with a complete standalone build. Migration remains unapplied for Reviewer inspection.

## Update 2026-10-04 (Builder, D-045 alignment and Terms of Service)

- GS-02 / GS-04 / GS-45: `terms_acceptances` has own-row RLS, authenticated writes are denied, the service function checks active membership and every current dashboard data route requires the current version.
- GS-18 / GS-22 / GS-35: acceptance and its audit are atomic and idempotent; audit details contain only the server-set version; an older version does not satisfy the current one.
- GS-41: acceptance is POST-only and remains under Astro's same-origin check; the unchecked box is required.
- GS-51: cancellation retention now matches D-045: CSV for 30 days, purge after 90 days. PGlite preserves day-31 data and purges day-91 data.
- GS-56: clean-install gate passed 108/108 tests, zero diagnostics, complete build and strict audit with zero vulnerabilities; both 390×844 captures were visually checked. Migration remains unapplied for Reviewer inspection.

## Update 2026-10-04 (Builder, D-046/D-048 customer styles)

- GS-08 / GS-47: app and database checks constrain theme, tagline, benefits and HTTPS hero URL; invalid values were rejected in unit and PGlite tests.
- GS-12: local fonts stay on the existing same-origin policy; hero images use the existing HTTPS image allowance. The CSP was not widened.
- GS-26: eight `@fontsource-variable` packages provide local latin WOFF2 assets; clean install and strict production audit found 0 vulnerabilities.
- GS-56: final local gate passed 121/121 with zero diagnostics and a complete build. Eight 390×844 captures prove Nombre remains in the first viewport; one 1440×900 capture proves the desktop two-column layout.

## Update 2026-10-04 (Builder, D-049/D-050/D-051 Terms v2)

- GS-02 / GS-05 / GS-45: signature rows use own-row RLS, direct writes are denied and service-only functions verify active owner role plus tenant before writing.
- GS-18 / GS-22 / GS-34 / GS-35: signature, acceptance and version-only audit are atomic and idempotent; the server fixes `2026-10-04-v2` and keeps the original evidence.
- GS-38 / GS-47: a database trigger gates new activation on current owner signature/approval and sets the initial three-month term. The audited extension function only accepts a later future date.
- GS-56: directed local gate passed 131/131 with zero diagnostics. PGlite covered untagged visits for blank, unknown, inactive and valid tags. Both 390×844 captures were visually checked. Migration remains unapplied.

## Update 2026-10-04 (Builder, D-052 security hardening)

- GS-03 / GS-44: active business owners now require signed AAL2 on customer-data routes; the shared `/mfa` supports every authenticated role.
- GS-05 / GS-10 / GS-42: service-only PostgreSQL limits use keyed IP/email hashes; their private table rejects direct service-role writes; Turnstile runs before database/Auth work.
- GS-12: HSTS is set to one year. CSP adds only the Cloudflare challenge script/frame origin. D-054 records why the Astro hydration bootstrap keeps the inline-script allowance.
- GS-32 / GS-48: the Cloudflare visitor-IP header and all three Turnstile form paths have local regression coverage.
- GS-56: final clean gate passed 144/144 tests with zero diagnostics and a complete build; the new migration remains unapplied for Reviewer inspection.

## Update 2026-10-05 (Reviewer, operations documents)

- GS-24: health-check Worker deployed and watching `/demo`; alert path still needs a deliberate test.
- GS-43 / GS-49 / GS-55: policy and owners in `OPERATIONS_POLICY.md` (CEO decisions: 7/30-day sessions, monthly review approved by CEO, Telegram channel).
- GS-54: `INCIDENT_RESPONSE.md` adopted.
- GS-25 / GS-29 / GS-28 / GS-30: CEO approved paid plans; production organization, project, backups and branch protection are being executed.

## Update 2026-10-05 (Reviewer, production cutover)

- GS-29: production project `fzrzrbzxjdezwylzkbkh` created in the Pro organization; all 14 migrations applied and verified by md5 against the repository files; Supabase security advisor reports no findings; pg_cron purge job scheduled. Render now reads production.
- GS-48 / GS-56: PR #10 fixed Turnstile in the check-in island (implicit widget removed by React hydration). A regression test now asserts explicit rendering.
- GS-28 / GS-30: GitHub ruleset verified on PR #9.
- GS-25: backups exist through Supabase Pro; the restore test is the only open item before real customer data.

## Update 2026-10-06 (Builder, D-057 customer styles v2)

- GS-08: Zod validates `businessType` against the eight values, `instagramUrl` against `https://www.instagram.com/<usuario>` (30 chars of `[A-Za-z0-9._]`, no query, no credentials, no subdomain tricks), hero photos as HTTPS or one of the 24 bundled `/stock/` files, and the accent as one of the style's four colors. Unit tests cover valid and invalid values.
- GS-47: migration `20261006020000_customer_styles_v2.sql` adds CHECKs for `business_type` and `instagram_url` and widens the hero CHECK only to `^/stock/[a-z_]+/[a-z0-9-]+\.webp$`. PGlite accepted every valid value and rejected each invalid case. Not applied by the Builder. Composite FKs remain pending.
- GS-12: no new external host. Fonts are local `@fontsource` files; stock photos are same-origin; the CSP is unchanged.
- GS-22: `business_type` and `instagram_url` join the `business.updated` audit as column names only.
- Threat model, customer identity: the visit counter reopens part of D-052 finding 2. Mitigation: name match before returning `visitCount`; `alreadyCounted` and the stored name are never returned. Residual risk recorded as MEDIUM pending acceptance.
- GS-26: added `@fontsource/great-vibes`, `@fontsource-variable/fraunces` and `@fontsource-variable/caveat`; removed the unused Bricolage Grotesque and DM Sans packages.

## Update 2026-10-06 (Builder, D-058 stale sessions)

- GS-43: a session revoked by a password change or global logout no longer works until its access token expires. `getAuthIdentity` confirms each session with Auth. A revoked, missing or expired session clears the `sb-*-auth-token` cookies and redirects to `/login?next=` (pages) or returns 401 JSON (`/api/*`). Verified locally with unit tests and `scripts/stale-session/probe.sh` against a local Supabase stand-in; not yet verified in production.
- GS-03 / GS-44: AAL2 enforcement for platform admins and owners is unchanged; an `aal1` session still goes to `/mfa` without losing its cookies.
- GS-12 / GS-19: page errors are generic Spanish HTML with `text/html; charset=utf-8` and the security headers; API errors are JSON. No stack traces or internal messages reach the browser; the server log keeps the path and a 200-character error summary.
