# Smart Tap — Glasswing Shield v1.0 control matrix

Revision: branch `claude/review-hardening` after `482bf27`, 2026-10-02. Prepared by Claude Code (Reviewer). Environments: L = local tests (PGlite, built Node server); H = hosted Supabase `vrouyhxzxrfkuuqfslrc` (no app deployed). There is no production environment yet.

**Gate result: NOT APPROVED.** Open HIGH: GS-03 (admin MFA), GS-25 (backups), GS-29 (single Supabase project for test and production). Real customer data must not be loaded until these close.

## Threat model (GS-57)

| Asset | Attacker | Path | Impact | Control | Test |
|---|---|---|---|---|---|
| Customer PII of all tenants | Outsider with a stolen admin password | /admin, service-role queries | Full cross-tenant disclosure | GS-03 TOTP and server-enforced aal2 for platform_admin | Local policy and response tests; live flow pending |
| Customer PII of tenant B | Member of tenant A | Dashboard/API with B's slug or ids | Cross-tenant disclosure | Server resolves tenant from memberships; RLS | L + H cross-tenant tests |
| Visit counts / future rewards | Customer with a copied NFC URL | Scripted check-ins | Inflated loyalty | D-017 one visit per day; 3/phone, 40/IP per 10 min | L + H |
| Customer identity | Anyone knowing a phone | Check-in with that phone | Name overwrite, visit count seen | Accepted residual (D-003) | — |
| Service availability | Bot | Large or many requests | Resource exhaustion | GS-33 byte-counted body limit; rate limits | L |
| Admin session | Phishing site | Open redirect after login | Credential theft | safeNextPath | L |
| Secrets | Build artifact leak | dist/ | Full database access | Runtime env (D-013) | L canary build |

## Controls

| Control | Applies | State | Evidence | Pending |
|---|---|---|---|---|
| GS-01 Org isolation | Yes | VERIFICADO EN EL ENTORNO OBJETIVO (H) | Memberships resolve tenant; delete filters tenant+customer; H: 0 cross-tenant rows | — |
| GS-02 Strict RLS | Yes | VERIFICADO (H) | RLS on 8 tables; select-only grants; anon denied; advisor 0 lints. FORCE RLS not set: only service_role/postgres bypass, both server-side | Decide FORCE RLS (low) |
| GS-03 Robust auth | Yes | IMPLEMENTADO NO VERIFICADO — HIGH | TOTP flow at `/admin/mfa`; signed `aal` claim; `/admin` redirects and `/api/admin` returns 403 at aal1; 5 local tests | Complete enrollment and challenge against hosted Auth |
| GS-04 Server authorization | Yes | VERIFICADO LOCALMENTE | requirePlatformAdmin, assertBusinessAccess on every route | Live viewer test (Codex) |
| GS-05 Least privilege | Yes | VERIFICADO (H) | authenticated select-only; check-in only service_role; old function revoked | Drop old function |
| GS-06 Secrets | Yes | VERIFICADO LOCALMENTE | Runtime env, canary build clean, .env ignored, history scan clean; gitleaks in CI | CI first run |
| GS-07 Private storage | No | NO APLICA JUSTIFICADO | No file storage | — |
| GS-08 Input validation | Yes | VERIFICADO LOCALMENTE | Zod schemas, E.164, slug, colors, URLs, birthday, next path | — |
| GS-09 Uploads | No | NO APLICA JUSTIFICADO | No uploads; logo is an external URL | — |
| GS-10 Anti-abuse | Yes | VERIFICADO (H) for check-in; IMPLEMENTADO NO VERIFICADO for login/recovery | DB counters (multi-instance safe); login/recovery rely on Supabase Auth limits | Confirm Auth rate limits in dashboard |
| GS-11 CORS | Yes | VERIFICADO LOCALMENTE | No CORS headers; same-origin only | — |
| GS-12 Headers/transport | Yes | PENDIENTE — MEDIUM | CSP, nosniff, Referrer, Permissions present; CSP keeps 'unsafe-inline'; HSTS needs HTTPS host | Remove inline handlers or hash them; HSTS at deploy |
| GS-13 Framing | Yes | VERIFICADO LOCALMENTE | frame-ancestors 'none' + X-Frame-Options DENY | — |
| GS-14 Webhooks | No | NO APLICA JUSTIFICADO | No webhooks | — |
| GS-15 Replay | Yes | VERIFICADO (H) | Repeat check-in same day does not count (D-017); invite/recovery tokens single-use by Supabase | — |
| GS-16 Idempotency | Yes | VERIFICADO (H) | Check-in idempotent per customer-day | — |
| GS-17 Race conditions | Yes | IMPLEMENTADO NO VERIFICADO | Customer upsert row lock serializes same-phone check-ins; UNIQUE(business_id, phone) | Concurrent test against H |
| GS-18 Transactions | Yes | VERIFICADO LOCALMENTE | Check-in single transaction; business creation compensates tag failure | Membership upsert error ignored in businesses.ts (low) |
| GS-19 SSRF | No | NO APLICA JUSTIFICADO | Server fetches only Supabase | — |
| GS-20 Own API keys | No | NO APLICA JUSTIFICADO | No API keys issued | — |
| GS-21 Tokens/links | Yes | VERIFICADO LOCALMENTE | NFC codes 144-bit random; token_hash invites | — |
| GS-22 Audit | Yes | IMPLEMENTADO NO VERIFICADO | audit_log for admin actions and deletes; service_role can still edit it | Separate destination (low) |
| GS-23 Logs | Yes | VERIFICADO LOCALMENTE | Error codes only; IP keyed hash | — |
| GS-24 Monitoring | Yes | PENDIENTE | None | After deploy: health-check Worker |
| GS-25 Backups | Yes | BLOQUEADO — HIGH | Free plan, no backups | CEO: Pro plan or scheduled export + restore test |
| GS-26 Dependencies | Yes | VERIFICADO LOCALMENTE | Lockfile, exact versions, npm audit 0 | — |
| GS-27 Supply chain/CI | Yes | IMPLEMENTADO NO VERIFICADO | Actions pinned to SHAs, read-only permissions | CI first run |
| GS-28 Secure Build Gate | Yes | PENDIENTE | verify workflow is blocking only with branch protection | Enable branch protection on main |
| GS-29 Separate environments | Yes | BLOQUEADO — HIGH | One project used for tests; free plan allows two active projects | CEO: separate staging/production before real data |
| GS-30 Production control | Yes | PENDIENTE | PR flow defined (D-018) | Branch protection; deploy identity at hosting decision |
| GS-31 Emergency stop | Yes | IMPLEMENTADO NO VERIFICADO | Business is_active, NFC pause, member pause | Live test (Codex) |
| GS-32 Proxies/IP | Yes | VERIFICADO LOCALMENTE | Spoofed XFF ignored (tests) | Set TRUSTED_IP_HEADER at deploy |
| GS-33 Request limits | Yes | VERIFICADO LOCALMENTE | Byte-counted 12 KB limit on check-in; customer list 250, birthdays 1000 | Admin form posts rely on platform limits (low) |
| GS-34 Content integrity | No | NO APLICA JUSTIFICADO | No files or signed documents | — |
| GS-35 Immutable versions | Partial | IMPLEMENTADO NO VERIFICADO | Consent records append-only by design; no update path | — |
| GS-36 Least-privilege agents | Yes | VERIFICADO | Agents never receive the secret key (Codex prompt rule) | — |
| GS-37 Prompt injection | No | NO APLICA JUSTIFICADO | No AI in product | — |
| GS-38 Secure defaults | Yes | VERIFICADO LOCALMENTE | Missing env fails closed; private schema; no implicit access | — |
| GS-39 Deny on doubt | Yes | VERIFICADO LOCALMENTE | Missing claims → 401; no membership → 403 | — |
| GS-40 Adversarial tests | Yes | VERIFICADO (H) partial | Anon, other org, known foreign id, spoofed IP, oversized body, self-promotion | Expired/tampered JWT live |
| GS-41 CSRF | Yes | VERIFICADO LOCALMENTE | Astro checkOrigin (403 cross-origin); HttpOnly cookies; no GET state changes | — |
| GS-42 Account attacks | Yes | IMPLEMENTADO NO VERIFICADO | Generic login error; recovery always "sent" | Confirm Auth limits |
| GS-43 Sessions | Yes | PENDIENTE | Supabase defaults; logout local scope | Document timeouts; global sign-out for admins |
| GS-44 Recent auth | Yes | IMPLEMENTADO NO VERIFICADO — MEDIUM | Every platform-admin change requires an aal2 session; owner/manager customer deletion still uses aal1 | Verify admin aal2 live; decide step-up for owner deletions |
| GS-45 BOLA/IDOR | Yes | VERIFICADO LOCALMENTE | Delete, member-status, tag-status filter by tenant + id | Live test |
| GS-46 Mass assignment | Yes | VERIFICADO LOCALMENTE | Explicit field allowlists on every write | — |
| GS-47 DB constraints | Yes | PENDIENTE — LOW | NOT NULL/CHECK/UNIQUE/FK present; visits.tag_id and consent_records lack composite tenant FKs (writes only via service function) | Composite FKs |
| GS-48 Edge protection | Yes | PENDIENTE | Decide at hosting (Cloudflare) | — |
| GS-49 Security alerts | Yes | PENDIENTE | None | After deploy |
| GS-50 Data classification | Yes | PENDIENTE | Phone, name, birthday = confidential PII | Document classes |
| GS-51 Retention/deletion | Yes | PENDIENTE | Customer delete cascades; no retention period; backups N/A | CEO + D-011 |
| GS-52 Encryption keys | No | NO APLICA JUSTIFICADO | No app-level encryption | — |
| GS-53 Domains/infra accounts | Yes | PENDIENTE | Supabase dashboard MFA requested of CEO | At deploy |
| GS-54 Incident response | Yes | PENDIENTE | — | Short runbook |
| GS-55 Access review | Yes | PENDIENTE | Member pause exists | Monthly review owner |
| GS-56 Regression tests | Yes | VERIFICADO LOCALMENTE | Each fix has a test (env canary, XFF, next path, rate limits, daily visit, body limit) | — |
| GS-57 Threat model | Yes | IMPLEMENTADO | Threat table now maps stolen admin passwords to TOTP, verified JWT aal2, and local regression tests | Confirm the full control in the hosted smoke test |
| GS-58 Inventory | Yes | IMPLEMENTADO NO VERIFICADO | Lockfile; CycloneDX SBOM artifact in CI | CI first run |
| GS-59 Malware | No | NO APLICA JUSTIFICADO | No uploads | — |
| GS-60 Acceptance criteria | Yes | IMPLEMENTADO | This matrix is part of done | — |

## Update 2026-10-04 (Claude Code review of PR #1)

- GS-03: IMPLEMENTADO NO VERIFICADO en vivo. MFA now covers `/admin`, `/dashboard`, customer deletion and the Data API bypass (D-020). Remaining: live QR enrollment.
- GS-02: VERIFICADO EN EL ENTORNO OBJETIVO for the admin RLS path at aal1/aal2.
- GS-56: two new permanent regression tests (app guard, SQL helper).
