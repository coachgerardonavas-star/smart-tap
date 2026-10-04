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

## D-020 — Production recovery must resist email prefetch (2026-10-03)

Supabase's default recovery link was consumed before the user could use it and returned `otp_expired` in three immediate attempts. This matches Supabase's documented email-prefetch limitation for single-use links. The hosted smoke test completed recovery with a server-generated one-time recovery token opened directly on the same laptop; the password changed and the token was cleared. Before commercial launch, Smart Tap needs custom SMTP with tracking disabled and a recovery template that lands on a Smart Tap confirmation page before the browser follows the Supabase verification URL. The direct admin-generated link is a test-only recovery path and is not exposed in the product.
