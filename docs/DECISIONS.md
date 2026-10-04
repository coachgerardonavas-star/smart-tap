# Decisions

## D-001 — One shared application and database

All businesses use one deployment and shared tables keyed by `business_id`. This keeps onboarding and maintenance small while RLS and membership checks isolate tenants.

## D-002 — Server-mediated browser access

Public capture and private dashboard data pass through Astro server routes. The design keeps privileged credentials and authorization checks in one place. RLS remains mandatory defense in depth.

## D-003 — Phone is the customer key within a business

The server normalizes valid numbers to E.164. `(business_id, phone_e164)` identifies a returning customer. This meets the repeat-visit need without SMS cost or a customer account. Phone verification can be added later if fraud or bad numbers become material.

## D-004 — Check-in is atomic in PostgreSQL

`record_public_check_in` applies the rate limit, upserts the customer, adds consent, and adds the visit in one transaction. Partial visits cannot remain after an error.

## D-005 — NFC tags are opaque

Each tag gets a random base64url code. The public route validates active tag ownership from the business slug. A landing without a tag remains available and records `manual` as its source.

## D-006 — Consent history is append-only

The customer row stores current consent for fast use. `consent_records` stores every acceptance with text version, time, user agent, and a keyed hash of the request IP.

## D-007 — Roles

Platform admins manage all businesses. Business roles are owner, manager, and viewer. All three may read their tenant. Owner and manager may delete customer data. Platform roles live in `profiles`, outside user-editable Auth metadata.

## D-008 — Admin bootstrap

The authenticated account matching `ADMIN_BOOTSTRAP_EMAIL` is promoted to platform admin on first verified request. This avoids manual SQL after initial Auth creation while keeping the identity fixed in server configuration.

## D-009 — Portable Node deployment

The MVP uses Astro's standalone Node adapter. A specific host stays open until Automate IT supplies deployment credentials and domain choice. This prevents an early hosting dependency.

## D-010 — Demo works without credentials

`/demo` and `/demo/capture` use fictitious in-memory data. The seed provides a second demo that exercises PostgreSQL after Supabase is connected.

## D-011 — Privacy copy

Each business may set its own privacy URL. `/privacy` is a plain operational fallback. Before commercial launch, each business must validate its notice, contact method, retention period, and local legal duties.

## D-012 — Voice and copy

Visible copy was reviewed against the stored Automate IT voice profile, anti-AI writing rules, and BrandScript. Product screens use short, direct Spanish and avoid claims without evidence.

## D-013 — Runtime configuration (review 2026-10-02)

Server code reads configuration through `getSecret` from `astro:env/server`. `import.meta.env` was inlined by Vite at build time: secrets were written into `dist/server`, and a host that sets variables at runtime started with none of them. The demo did not use them, which is why it was not detected before.

## D-014 — Rate limit identity (review 2026-10-02)

The limiter no longer trusts `X-Forwarded-For` from the client. The client IP comes from the socket, or from the one header named in `TRUSTED_IP_HEADER`. Customers on one venue Wi-Fi share a public IP, so the per-IP window is 40 per ten minutes, and a per-phone window of 3 limits repeated submissions for one person. Both identifiers are HMAC-keyed before they reach PostgreSQL.

## D-015 — Admin bootstrap requires a confirmed email (review 2026-10-02)

Promotion now also checks `email_confirmed_at` through the Auth admin API. With signup closed this changes nothing; if a project is ever misconfigured with open signup and no confirmation, the email claim alone no longer grants platform admin.

## D-016 — Pausing members and NFC tags (review 2026-10-02)

Automate IT admins can pause and reactivate a business member or an NFC tag from the business page. Before this, removing an employee's access to customer data or retiring a lost tag required manual SQL. Both actions are audited.

## D-017 — One counted visit per customer per day (CEO, 2026-10-02)

A customer earns at most one visit per business per calendar day in the business's time zone. A repeated check-in the same day updates the customer, appends a consent record, and answers "already registered today" without adding a visit. The customer upsert locks the customer row, so concurrent submissions for one phone cannot both add a visit. This caps visit inflation from a copied NFC URL at one per day per phone. Proof of physical presence (dynamic NFC such as NTAG 424 DNA SUN, or staff confirmation) remains open for when rewards are introduced.

## D-018 — Glasswing Shield applies to Smart Tap (2026-10-02)

Glasswing Shield v1.0 (ADN `Glasswing_Shield.md`, Manual Maestro §10.1) governs this project. The matrix is `docs/security/CONTROL_MATRIX.md`. Changes to `main` go through a pull request with the `verify` workflow green, which runs gitleaks, npm audit, check, tests, build and an SBOM.

## D-019 — Platform administrators require TOTP at AAL2 (2026-10-02)

Every `/admin` page and `/api/admin` endpoint uses `requirePlatformAdmin`, which accepts only a verified `platform_admin` session whose signed JWT has `aal2`. An administrator at `aal1` receives a redirect to `/admin/mfa` for a page request and HTTP 403 for an API request. The MFA page is the narrow exception: it checks the platform role at `aal1`, then enrolls or challenges a TOTP factor through Supabase Auth on the server. The server chooses the factor from the authenticated user's factor list and never accepts an assurance level from form data.

## D-020 — Platform-admin power requires aal2 everywhere (review 2026-10-04)

D-019 guarded `/admin` only. A platform admin also reaches every tenant through `/dashboard`, customer deletion, and the Data API RLS bypass in `private.is_platform_admin()`. All three now require `aal2`: `requireDataAccess` and `assertBusinessAccess(identity, …)` in the app, and the SQL helper checks `auth.jwt() ->> 'aal'` (migration `20261004010900_admin_rls_requires_aal2.sql`). A stolen admin password alone no longer reads customer data by any path.

## D-021 — Assisted WhatsApp follow-up, no Meta API (CEO, 2026-10-04)

The MVP detects follow-up opportunities (inactive, birthday, frequent, new) and shows them in a dashboard queue. "Enviar WhatsApp" opens WhatsApp with the customer's number and a suggested message; the owner presses Send. Smart Tap never sends messages. WhatsApp marketing consent is a separate, optional, unchecked box at check-in, recorded with its own text version. Meta Business Platform, templates and automated sending are outside the Smart Tap base product. CRM integration is not part of Smart Tap and is handled through Plan Asistente or higher depending on scope. Specification: `docs/FOLLOW_UP_QUEUE.md`.

## D-022 — Production recovery must resist email prefetch (2026-10-03)

Supabase's default recovery link was consumed before the user could use it and returned `otp_expired` in three immediate attempts. This matches Supabase's documented email-prefetch limitation for single-use links. The hosted smoke test completed recovery with a server-generated one-time recovery token opened directly on the same laptop; the password changed and the token was cleared. Before commercial launch, Smart Tap needs custom SMTP with tracking disabled and a recovery template that lands on a Smart Tap confirmation page before the browser follows the Supabase verification URL. The direct admin-generated link is a test-only recovery path and is not exposed in the product.

Reviewer (2026-10-04): the application half is done. `/auth/callback` no longer consumes `token_hash` on GET; it shows a "Continuar" page and verifies only on POST (`tests/auth-callback.test.ts`). With the repository templates (`supabase/templates/*.html`) pasted into Supabase, invitation and recovery links survive scanner prefetch even on the default mailer. Custom SMTP is still needed for sending limits and deliverability, not for prefetch.

## D-023 — Dependency audit exceptions fail closed (2026-10-04)

The production dependency gate permits one temporary exception for `GHSA-ch52-4w7c-c8xp` in `http-cache-semantics@4.2.0`, reached through Astro. The advisory has no patched release as of this date, and Smart Tap does not run a shared HTTP response cache; Astro imports the package for remote asset build caching. `scripts/audit-dependencies.mjs` accepts only that advisory, package chain and exact installed version. Any other high or critical finding fails the gate. Remove the exception when an upstream patch is available.

Closed (Reviewer, 2026-10-04): `http-cache-semantics@4.3.0` was published on 2026-10-04 and fixes the advisory. The lockfile now resolves 4.3.0 (Astro allows `^4.2.0`), `npm audit` reports 0 vulnerabilities, and the exception script was removed. `npm run audit:prod` is plain `npm audit --omit=dev --audit-level=high` again. Before removal, reachability had been checked: the package was used only by Astro's build-time remote image cache and never reached `dist/server`.
## D-024 — Supabase Pro and a separate production project at the first signed client (CEO, 2026-10-04)

The free project `vrouyhxzxrfkuuqfslrc` stays for demo and testing. When the first business signs, the organization moves to Supabase Pro and a separate production project is created with daily backups. Until then no real customer data is loaded. This schedules GS-25 (backups) and GS-29 (separate environments); both stay open and block real data until done.

## D-025 — Commercial package and commitment (CEO, 2026-10-04)

Smart Tap remains $199 setup + $79/month, with $278 initial checkout when setup and the first month are charged together. The minimum commitment is 3 monthly payments. If the client cancels earlier, all three monthly payments remain due. After the minimum term, cancellation requires 30 days notice. Access ends at the end of the paid service period. The client receives a 30-day export window and data is retained for 90 days before deletion according to the final retention workflow.

## D-026 — NFC and location pricing (CEO, 2026-10-04)

The base package covers one business location and includes 3 configured NFC tags. Additional configured tags cost $10 each. Each additional location is $79/month. Its setup is $99 when contracted before the prior location of the same franchise/business group generates its second monthly payment; after that threshold, the regular $199 setup applies.

## D-027 — Support boundary (CEO, 2026-10-04)

The $79 monthly fee includes normal platform operation, basic support and up to 2 simple configuration changes every 2 weeks. Examples include editing an offer, text, logo, phone number, business data or a suggested message. New automations, integrations, automated WhatsApp/API work, custom features and custom CRM work are outside this allowance and must be separately scoped, normally as Plan Asistente or higher.

## D-028 — Offers are owner-defined and system-recommended (CEO, 2026-10-04)

The business owner defines the set of allowed offers during onboarding. Smart Tap may recommend which approved offer fits each opportunity type (inactive, birthday, frequent/VIP, new/welcome), but it must not invent or authorize discounts on its own. The owner approves the suggestion before opening WhatsApp and manually sending the message.

## D-029 — Onboarding starts with form plus verification meeting (CEO, 2026-10-04)

After successful payment, the client completes a mandatory onboarding form. Automate IT then performs a short verification meeting with the owner or responsible manager. That verification may be by phone/video call or in person. Detailed onboarding fields and operating sequence remain under active design in `docs/CLIENT_ONBOARDING.md`.

## D-030 — Production host: Render (CEO, 2026-10-03)

Render Web Service (Virginia, `0.5c-512mb`, paid tier because the free tier sleeps and an NFC tap must open immediately), defined in `render.yaml`, Node 22.22.0, domain `smarttap.yourbizupgraded.com`. Supabase stays the backend. Closes the open host choice of D-009. Reviewer conditions: create the service only after PR #1 merges; point it at the production Supabase project of D-024; verify `TRUSTED_IP_HEADER` in the production smoke test.

## D-031 — Owner approval required before activation (CEO, 2026-10-04)

The mandatory onboarding form may be completed by the business owner or an authorized responsible manager. An authorized manager may also participate in the verification session, but Smart Tap must not be activated until the business owner gives final approval.

## D-032 — Base package includes at most two dashboard users (CEO, 2026-10-04)

The base Smart Tap package includes a maximum of 2 business-side dashboard users total. The owner decides who occupies those two slots. The owner may use one slot personally, or may choose not to have a dashboard login and assign both included slots to authorized employees. Pricing/policy for any additional users is not yet approved and must not be invented.

## D-033 — Customer capture requires name and phone; birthday is optional (CEO, 2026-10-04)

The customer-facing NFC form requires **name** and **phone**. Birthday remains optional. The birthday field should use benefit-oriented copy explaining that sharing the date may enable birthday discounts, gifts or special benefits, so customers understand why it is useful to provide it. The copy must not promise a specific reward unless that business has approved one.

## D-034 — Customer email is collected only when the business uses email campaigns (CEO, 2026-10-04)

Customer email is **not** part of the default Smart Tap capture form. It is added only when the business specifically chooses email campaigns/follow-up as a channel. When enabled, the business-specific purpose and consent copy must be configured before collection. Do not silently collect email for businesses that are not using that channel.
