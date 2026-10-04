# Smart Tap — Glasswing Shield v1.0 control matrix

Revision: branch `codex/live-smoke-mfa`, 2026-10-04. Prepared by Claude Code (Reviewer), updated by ChatGPT Codex with hosted smoke evidence. Environments: L = local tests; H = hosted Supabase `vrouyhxzxrfkuuqfslrc` with the app running locally against H. There is no production environment yet.

**Gate result: NOT APPROVED FOR REAL CUSTOMER DATA.** Open HIGH: GS-25 backups and GS-29 separate production project. GS-03 admin MFA closed in the hosted smoke test. The demonstration MVP is usable with fictitious data.

## Threat model (GS-57)

| Asset | Attacker | Path | Impact | Control | Test |
|---|---|---|---|---|---|
| Customer PII of all tenants | Outsider with a stolen admin password | /admin, service-role queries | Full cross-tenant disclosure | GS-03 TOTP and server-enforced aal2 for platform_admin | L tests + H enrollment/challenge |
| Customer PII of tenant B | Member of tenant A | Dashboard/API with B's slug or ids | Cross-tenant disclosure | Server resolves tenant from memberships; RLS | L + H cross-tenant tests |
| Visit counts / future rewards | Customer with a copied NFC URL | Scripted check-ins | Inflated loyalty | D-017 one visit per day; 3/phone, 40/IP per 10 min | L + H |
| Customer identity | Anyone knowing a phone | Check-in with that phone | Name overwrite, visit count seen | Accepted residual (D-003) | — |
| WhatsApp consent and phone | Viewer or member of another tenant | Follow-up form or guessed customer id | Message without permission or cross-tenant disclosure | Separate opt-in; server loads scoped customer; owner/manager/AAL2 guard; no phone/message form fields | L route/RLS tests + H owner/viewer smoke |
| Service availability | Bot | Large or many requests | Resource exhaustion | GS-33 byte-counted body limit; rate limits | L |
| Admin session | Phishing site | Open redirect after login | Credential theft | safeNextPath | L |
| Secrets | Build artifact leak | dist/ | Full database access | Runtime env (D-013) | L canary build |

## Controls

| Control | Applies | State | Evidence | Pending |
|---|---|---|---|---|
| GS-01 Org isolation | Yes | VERIFICADO EN EL ENTORNO OBJETIVO (H) | Memberships resolve tenant; delete filters tenant+customer; H: 0 cross-tenant rows | — |
| GS-02 Strict RLS | Yes | VERIFICADO EN EL ENTORNO OBJETIVO (H) | Hosted follow_ups RLS and composite tenant FK passed Reviewer checks; owner/viewer UI smoke passed | Decide FORCE RLS (low) |
| GS-03 Robust auth | Yes | VERIFICADO EN EL ENTORNO OBJETIVO (H) | TOTP enrolled and challenged live; signed `aal2` required for all platform-admin data paths; local regressions cover AAL1 denial | — |
| GS-04 Server authorization | Yes | VERIFICADO EN EL ENTORNO OBJETIVO (H) | Hosted owner completed contact, dismiss and opt-out; hosted viewer saw no controls; local tests deny viewer and AAL1 admin | — |
| GS-05 Least privilege | Yes | VERIFICADO (H) | authenticated select-only; check-in only service_role; old function revoked | Drop old function |
| GS-06 Secrets | Yes | VERIFICADO | Runtime env, canary build clean, .env ignored, history scan clean; Gitleaks passed in PR run 37174554236 | — |
| GS-07 Private storage | No | NO APLICA JUSTIFICADO | No file storage | — |
| GS-08 Input validation | Yes | VERIFICADO LOCALMENTE | Zod schemas, E.164, slug, colors, URLs, birthday, next path | — |
| GS-09 Uploads | No | NO APLICA JUSTIFICADO | No uploads; logo is an external URL | — |
| GS-10 Anti-abuse | Yes | VERIFICADO (H) for check-in; IMPLEMENTADO NO VERIFICADO for login/recovery | DB counters (multi-instance safe); login/recovery rely on Supabase Auth limits | Confirm Auth rate limits in dashboard |
| GS-11 CORS | Yes | VERIFICADO LOCALMENTE | No CORS headers; same-origin only | — |
| GS-12 Headers/transport | Yes | PENDIENTE — MEDIUM | CSP, nosniff, Referrer, Permissions present; CSP keeps 'unsafe-inline'; HSTS needs HTTPS host | Remove inline handlers or hash them; HSTS at deploy |
| GS-13 Framing | Yes | VERIFICADO LOCALMENTE | frame-ancestors 'none' + X-Frame-Options DENY | — |
| GS-14 Webhooks | No | NO APLICA JUSTIFICADO | No webhooks | — |
| GS-15 Replay | Yes | VERIFICADO (H) plus local callback tests | Repeat check-in same day did not count; invite and recovery tokens are single-use; token_hash is consumed only by an explicit POST (D-022) | Paste repository email templates into Supabase |
| GS-16 Idempotency | Yes | VERIFICADO (H) | Check-in idempotent per customer-day | — |
| GS-17 Race conditions | Yes | IMPLEMENTADO NO VERIFICADO | Customer upsert row lock serializes same-phone check-ins; UNIQUE(business_id, phone) | Concurrent test against H |
| GS-18 Transactions | Yes | VERIFICADO LOCALMENTE | Check-in and WhatsApp opt-out each run in one PostgreSQL function; business creation compensates tag failure | Membership upsert error ignored in businesses.ts (low) |
| GS-19 SSRF | No | NO APLICA JUSTIFICADO | Server fetches only Supabase | — |
| GS-20 Own API keys | No | NO APLICA JUSTIFICADO | No API keys issued | — |
| GS-21 Tokens/links | Yes | VERIFICADO (H) | NFC codes 144-bit random; hosted invite accepted; server-generated recovery token completed once | Prefetch-safe production email path |
| GS-22 Audit | Yes | VERIFICADO EN EL ENTORNO OBJETIVO (H) for WhatsApp opt-out | Hosted opt-out appended negative consent and one customer.whatsapp_opt_out audit row atomically | Separate destination (low) |
| GS-23 Logs | Yes | VERIFICADO LOCALMENTE | Error codes only; IP keyed hash | — |
| GS-24 Monitoring | Yes | PENDIENTE | None | After deploy: health-check Worker |
| GS-25 Backups | Yes | BLOQUEADO — HIGH | Free plan, no backups | CEO: Pro plan or scheduled export + restore test |
| GS-26 Dependencies | Yes | VERIFICADO LOCALMENTE | Lockfile resolves http-cache-semantics@4.3.0; strict npm audit reports 0 vulnerabilities; D-023 exception removed | — |
| GS-27 Supply chain/CI | Yes | VERIFICADO | Actions pinned to SHAs, read-only permissions; Follow-up Queue PR run 37174554236 passed | — |
| GS-28 Secure Build Gate | Yes | PENDIENTE | verify workflow is blocking only with branch protection | Enable branch protection on main |
| GS-29 Separate environments | Yes | BLOQUEADO — HIGH | One project used for tests; free plan allows two active projects | CEO: separate staging/production before real data |
| GS-30 Production control | Yes | PENDIENTE | PR flow defined (D-018) | Branch protection; deploy identity at hosting decision |
| GS-31 Emergency stop | Yes | VERIFICADO EN EL ENTORNO OBJETIVO (H) | Paused NFC rejected check-in; reactivation restored it. Paused viewer immediately lost tenant data | — |
| GS-32 Proxies/IP | Yes | VERIFICADO LOCALMENTE | Spoofed XFF ignored (tests) | Set TRUSTED_IP_HEADER at deploy |
| GS-33 Request limits | Yes | VERIFICADO LOCALMENTE | Byte-counted 12 KB limit on check-in; customer list 250, birthdays 1000 | Admin form posts rely on platform limits (low) |
| GS-34 Content integrity | No | NO APLICA JUSTIFICADO | No files or signed documents | — |
| GS-35 Immutable versions | Partial | VERIFICADO LOCALMENTE | Visit and WhatsApp consent purposes use append-only rows with exact text versions; no update path | — |
| GS-36 Least-privilege agents | Yes | VERIFICADO | Agents never receive the secret key (Codex prompt rule) | — |
| GS-37 Prompt injection | No | NO APLICA JUSTIFICADO | No AI in product | — |
| GS-38 Secure defaults | Yes | VERIFICADO LOCALMENTE | Missing env fails closed; private schema; no implicit access | — |
| GS-39 Deny on doubt | Yes | VERIFICADO LOCALMENTE | Missing claims → 401; no membership → 403 | — |
| GS-40 Adversarial tests | Yes | VERIFICADO (H) partial + local | Hosted viewer had no actions and no-opt-in had no send button; local tests reject other tenant, foreign customer, stale opportunity and AAL1 admin | Expired/tampered JWT live |
| GS-41 CSRF | Yes | VERIFICADO LOCALMENTE | Astro checkOrigin (403 cross-origin); HttpOnly cookies; no GET state changes | — |
| GS-42 Account attacks | Yes | IMPLEMENTADO NO VERIFICADO EN VIVO | Generic responses; prefetch-safe callback verifies token_hash only after the user presses Continuar (D-022) | Paste repository templates; verify hosted flow; confirm Auth limits |
| GS-43 Sessions | Yes | PENDIENTE | Supabase defaults; logout local scope | Document timeouts; global sign-out for admins |
| GS-44 Recent auth | Yes | VERIFICADO (H) for platform admin; OPEN for business manager delete | Every platform-admin path requires AAL2; owner/manager customer deletion still uses AAL1 | Decide step-up for owner deletions |
| GS-45 BOLA/IDOR | Yes | VERIFICADO EN EL ENTORNO OBJETIVO (H) plus local routes | Hosted scoped owner actions and read-only viewer passed; customer query filters business_id + id; foreign customer returns 404 locally | — |
| GS-46 Mass assignment | Yes | VERIFICADO (H) plus local tests | Live 303 used database phone and server-built encoded message; browser form accepts only ids, kind and action | — |
| GS-47 DB constraints | Yes | PENDIENTE — LOW | NOT NULL/CHECK/UNIQUE/FK present; visits.tag_id and consent_records lack composite tenant FKs (writes only via service function) | Composite FKs |
| GS-48 Edge protection | Yes | PENDIENTE | Decide at hosting (Cloudflare) | — |
| GS-49 Security alerts | Yes | PENDIENTE | None | After deploy |
| GS-50 Data classification | Yes | IMPLEMENTADO | Name, phone, birthday and WhatsApp consent are confidential PII; follow-up kind/status are internal operational data | Add handling rules to production privacy notice |
| GS-51 Retention/deletion | Yes | PARCIAL (H) + local migration | Customer deletion cascades visits, consent and follow_ups; opt-out history and audit are retained. No retention period | CEO + D-011 |
| GS-52 Encryption keys | No | NO APLICA JUSTIFICADO | No app-level encryption | — |
| GS-53 Domains/infra accounts | Yes | PENDIENTE | Supabase dashboard MFA requested of CEO | At deploy |
| GS-54 Incident response | Yes | PENDIENTE | — | Short runbook |
| GS-55 Access review | Yes | IMPLEMENTADO Y PROBADO (H) | Member pause removed viewer access immediately | Assign monthly review owner |
| GS-56 Regression tests | Yes | VERIFICADO LOCALMENTE + smoke H | 66/66 permanent tests plus hosted Follow-up UI smoke and cleanup | — |
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