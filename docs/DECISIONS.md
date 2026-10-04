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

A customer earns at most one visit per business per calendar day in the business's time zone. A repeated check-in the same day updates the customer, appends a consent record, and answers "already registered today" without adding a visit. The customer upsert locks the customer row, so concurrent submissions for one phone cannot both add a visit. This caps visit inflation from a copied NFC URL at one per day per phone. Proof of physical presence remains open for when rewards are introduced.

## D-018 — Glasswing Shield applies to Smart Tap (2026-10-02)

Glasswing Shield v1.0 governs this project. The matrix is `docs/security/CONTROL_MATRIX.md`.

## D-019 — Platform administrators require TOTP at AAL2 (2026-10-02)

Every `/admin` page and `/api/admin` endpoint uses `requirePlatformAdmin`, which accepts only a verified `platform_admin` session whose signed JWT has `aal2`.

## D-020 — Platform-admin power requires aal2 everywhere (review 2026-10-04)

Platform-admin tenant access also requires `aal2`.

## D-021 — Assisted WhatsApp follow-up, no Meta API (CEO, 2026-10-04)

The MVP detects follow-up opportunities and opens WhatsApp with a suggested message; the business user presses Send. Smart Tap never sends messages automatically. CRM integration and Meta API automation are outside the base product.

## D-022 — Production recovery must resist email prefetch (2026-10-03)

Recovery links use a confirmation step before token consumption.

## D-023 — Dependency audit exceptions fail closed (2026-10-04)

Dependency audit is currently clean after upstream patching.

## D-024 — Supabase Pro and a separate production project at the first signed client (CEO, 2026-10-04)

The free project stays for demo/testing. At the first signed client, move to Supabase Pro and create a separate production project with daily backups.

## D-025 — Commercial package and commitment (CEO, 2026-10-04)

Smart Tap remains $199 setup + $79/month, with $278 initial checkout when setup and the first month are charged together. Minimum commitment: 3 monthly payments. Early cancellation still owes the full minimum. Afterward, cancellation requires 30 days notice. Access ends at the end of the paid period. 30-day export window; 90-day retention before deletion.

## D-026 — NFC and location pricing (CEO, 2026-10-04)

Base package: one location and 3 configured NFC tags. Additional configured tags: $10 each. Each additional location: $79/month. Setup is $99 if contracted before the prior location generates its second monthly payment; otherwise $199.

## D-027 — Support boundary (CEO, 2026-10-04)

The $79 monthly fee includes normal platform operation, basic support and up to 2 simple configuration changes every 2 weeks. New automation/integration/custom work is separate scope.

## D-028 — Offers are owner-defined and system-recommended (CEO, 2026-10-04)

The business owner defines allowed offers. Smart Tap may recommend an approved offer by opportunity type but must not invent discounts.

## D-029 — Onboarding starts with form plus verification meeting (CEO, 2026-10-04)

After successful payment, the client completes a mandatory onboarding form. Automate IT then performs a short verification meeting with the owner or responsible manager, by phone/video or in person.

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

## D-035 — WhatsApp consent is required for Smart Tap registration (CEO, 2026-10-04)

The customer must explicitly accept WhatsApp follow-up from the named business before completing Smart Tap registration. Opt-out must remain available afterward.

## D-036 — Inactivity threshold is defined by the business owner (CEO, 2026-10-04)

The owner chooses during onboarding how many days without a qualifying visit makes a customer inactive. Do not impose one universal threshold across all businesses.

## D-037 — One owner-defined offer per follow-up category (CEO, 2026-10-04)

During onboarding, the owner defines one approved offer for each follow-up category: inactive customer, birthday, frequent/VIP customer, and new/welcome customer. Smart Tap uses the offer assigned to that category and must not substitute or invent a different promotion without later owner approval.
