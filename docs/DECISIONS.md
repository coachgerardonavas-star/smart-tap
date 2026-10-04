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

Render Web Service in Virginia, paid tier, domain `smarttap.yourbizupgraded.com`.

## D-031 — Owner approval required before activation (CEO, 2026-10-04)

The form may be completed by the owner or an authorized manager, but Smart Tap must not be activated until the owner gives final approval.

## D-032 — Base package includes at most two dashboard users (CEO, 2026-10-04)

Maximum 2 business-side dashboard users total. The owner chooses who occupies the slots and may assign both to employees.

## D-033 — Customer capture requires name and phone; birthday is optional (CEO, 2026-10-04)

The customer-facing NFC form requires name and phone. Birthday is optional and should use benefit-oriented copy without promising an unapproved reward.

## D-034 — Customer email is collected only when the business uses email campaigns (CEO, 2026-10-04)

Email is not part of the default form. It is added only when the business chooses email campaigns/follow-up and has approved purpose/consent copy.

## D-035 — WhatsApp consent is required for Smart Tap registration (CEO, 2026-10-04) — SUPERSEDED by D-042

The customer must explicitly accept WhatsApp follow-up from the named business before completing Smart Tap registration. Opt-out must remain available afterward.

## D-036 — Inactivity threshold is defined by the business owner (CEO, 2026-10-04)

The owner chooses during onboarding how many days without a qualifying visit makes a customer inactive. Do not impose one universal threshold across all businesses.

## D-037 — One owner-defined offer per follow-up category (CEO, 2026-10-04)

During onboarding, the owner defines one approved offer for each follow-up category: inactive customer, birthday, frequent/VIP customer, and new/welcome customer. Smart Tap uses the offer assigned to that category and must not substitute or invent a different promotion without later owner approval.

## D-038 — Included NFC allocation and placement (CEO, 2026-10-04)

The base Smart Tap setup includes 3 configured NFC tags with fixed roles: **2 tags for customer capture/registration** and **1 tag for Google Review**. Automate IT recommends the best physical placement according to the type and customer flow of the business, and the owner may change that placement before activation.

## D-039 — Google Review NFC opens Google directly (CEO, 2026-10-04)

The dedicated Google Review NFC must open the business's direct Google review URL immediately. No Smart Tap interstitial, rating screen, review gating, or pre-qualification step is inserted before Google.

## D-040 — Owner go-live approval scope (CEO, 2026-10-04)

Before Smart Tap is activated, the business owner must approve the final configuration covering: branding, selected dashboard users, the four category-specific offers, inactivity threshold, recommended/final NFC placement, WhatsApp message/consent text, and the direct Google Review URL. Activation must not proceed until that approval is recorded.

## D-041 — Billing cycle starts from the initial payment date (CEO, 2026-10-04)

At purchase, the client pays **$278 total**: $199 setup + the first $79 monthly payment. That $79 is month 1 of service. The next $79 monthly charge occurs **30 days after the initial $278 payment**, and subsequent monthly charges continue on that billing cadence. The billing anchor is the initial payment date, **not** the Smart Tap go-live/activation date.

## D-042 — WhatsApp consent stays optional and prominent (CEO, 2026-10-04)

Replaces D-035. The WhatsApp box stays separate, optional and unchecked, as implemented and verified under D-021; a visit is registered without it. Its label leads with the customer benefit (offers, birthday gifts) and names the business. Reasons: consent obtained as a condition of registration is lower quality, invites fake numbers, and raises spam reports that can get the business's WhatsApp number restricted; marketing-consent rules (TCPA, Florida FTSA) expect voluntary consent. The Reviewer flagged the legal point as unverified, not as legal advice. Customers without consent appear in the follow-up queue without a WhatsApp button.

## D-043 — Branch protection deferred (CEO, 2026-10-04)

The repository is private on GitHub Free, where protected branches are not available. The CEO chose not to buy GitHub Pro yet. Until then `main` has no technical protection: every agent still works through pull requests with the `verify` check green and never pushes to `main` directly (AGENTS.md). Accepted risk for GS-28/GS-30; revisit at the first signed client or when another person gets write access.

## D-044 — Customer privacy notice per business (CEO, 2026-10-04)

Approved text in `docs/PRIVACY_NOTICE.md`. One notice per business at `/privacy/[slug]`, Spanish and English on one page, filled with the business name and contact (phone or email, required for owner approval). Retention: customer data deleted after 24 months without a visit; on cancellation the owner can export a CSV for 30 days and all customer data is deleted after 90 days (aligned with D-025 by D-045). Requests go to the business with smarttap@yourbizupgraded.com as fallback. Minimum age 13. Providers described by type (US hosting and database), not by name. Not legal advice: attorney review before the first real client. Closes D-011 once the implementation spec ships.

## D-045 — Smart Tap Terms of Service for businesses (CEO, 2026-10-04)

Approved text in `docs/TERMS_OF_SERVICE.md`. Liability capped at fees paid in the prior 12 months, no indirect damages; best-effort availability with no uptime guarantee; no guaranteed results; the business is responsible for the messages and offers it sends and indemnifies Automate IT for them; suspension 7 days after a failed-payment notice (data kept); term changes notified by email 30 days ahead with penalty-free cancellation; mediation first, then Orange County, Florida courts under Florida law; Spanish and English, Spanish prevails. Full $278 refund if the business cancels before activation. Retention after cancellation stays as D-025 (30-day export, deletion at 90 days); D-044 corrected to match. No AI notice: Smart Tap uses no AI; add one only if AI is introduced. Not legal advice: attorney review before the first real client.

## D-046 — Branded customer screens through customizable styles (CEO, 2026-10-04)

Customer-facing NFC screens are personalized per business through 3–4 pre-designed styles plus per-business data (logo, colors, hero photo, tagline, benefits), not bespoke design or code per client. Styles are designed once (Claude Design), approved by the CEO and built once. Details and constraints in HANDOFF.

## D-047 — Deploy against the test project until the first client (CEO, 2026-10-04)

The Render service runs against the test Supabase project `vrouyhxzxrfkuuqfslrc` for demos and NFC tests. No real customer data is loaded. At the first signed client the production Pro project is created (D-024) and only `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` change in Render, together with SMTP, templates and Auth URL configuration in the new project.

## D-048 — Four customer styles approved; welcome and form on one screen (CEO, 2026-10-04)

The four styles in `docs/design/customer-styles/` are approved as the catalog for D-046. The welcome content sits above the form on the same screen to avoid an extra tap; the confirmation replaces the form after check-in and offers the Google review link when configured. Spec: `docs/CUSTOMER_SCREENS.md`.

## D-049 — Smart Tap terms aligned with the Master Services Agreement v3.11 (attorney, 2026-10-04)

The CEO's attorney reviewed the Smart Tap terms against the Master Services Agreement v3.11 and decided: monthly fees are prepaid in every product (Asistente/Estratega/Manager must change: first monthly charged on the Go-Live date, not 30 days later — update the MSA 5.3, SOW §13 and `Manual_de_Pricing.md`); after the 3-month minimum, service continues only through signed 3-month Extension Annexes with 15 days' notice and frozen price (MSA 8.2, 8.5–8.6), replacing month-to-month; early-cancellation acceleration of the remaining minimum is confirmed for both products; refund = 7-day guarantee (MSA 6.1) instead of "full refund until activation"; non-payment follows MSA 5.9–5.10 (5 days to fix the card, 1.5% monthly late fee after 15 days, suspension after 30 days, 30 days unpaid = early cancellation); liability cap, reciprocal indemnity, attorney fees, force majeure, termination for Automate IT breach and wind-down copied from the MSA; the owner signs electronically (no click-through). Draft text: `docs/TERMS_OF_SERVICE_v2_DRAFT.md`, pending the attorney's final read. Supersedes the conflicting parts of D-025, D-041 and D-045.

## D-050 — Ten anti-abuse fixes to the Smart Tap terms v2 (attorney, 2026-10-04)

After an adversarial review (Claude Code acting as a client looking for loopholes) the attorney approved all ten fixes now in `docs/TERMS_OF_SERVICE_v2_DRAFT.md`: deemed activation after 10 business days without approval or objection; acceleration also applies inside a signed Extension Annex; links licensed to the contracted location (copies elsewhere billed as an additional location); payment without signature refundable until signed, deemed acceptance after 10 days; only material adverse changes allow penalty-free exit; outages are not material breach unless 5+ consecutive business days; seasonality and foreseeable closures are not force majeure; service continuing after expiry without an annex is billed monthly in advance at the current rate, terminable on 15 days' notice; "simple change" defined and non-cumulative; no registering people without their own consent; replacement tags $10. Customer lists are delivered at termination even with unpaid balances (collected separately) — differs from MSA 17.5; review whether the MSA should match. App follow-ups for the Builder: e-signature before activation, flag visits without a registered tag code, auto-suspend at the end of an unextended term.
