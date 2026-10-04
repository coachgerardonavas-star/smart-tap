# Onboarding configuration — specification (D-032, D-033, D-036 to D-040)

Written by Claude Code (Reviewer) on 2026-10-04 for the Builder. Build on a new branch from `main` **after PR #1 is merged**. Smallest change that meets each rule; reuse the existing admin page, validation schemas and audit log.

Out of scope: Stripe billing (D-041 is a commercial rule, not code), additional-user pricing (not decided), email capture (D-034: off by default, no code now), multi-location, offer libraries beyond one offer per category.

## 1. One offer per follow-up category (D-037)

- Columns on `businesses`: `offer_inactive`, `offer_birthday`, `offer_frequent`, `offer_new` — `text`, nullable, 1–200 characters after trim.
- Admin business page: four fields under "Ofertas aprobadas por el dueño". Audited like other business updates.
- Suggested WhatsApp message: `{current body} {offer}. Si prefieres no recibir mensajes, responde BAJA.` when the category has an offer; unchanged when it does not. Smart Tap never invents an offer (D-028, D-037).
- The offer is read from the database on the server, like the rest of the message; the browser never sends it.

## 2. Birthday copy (D-033)

Customer form, birthday field:
- Label: `¿Cuándo cumples años? (opcional)`
- Help text: `Déjanos tu fecha de cumpleaños y podremos sorprenderte con descuentos, regalos o beneficios especiales en tu día.`
- Still optional. No specific gift promised.

## 3. Two dashboard users per business (D-032)

- Inviting or reactivating a member fails with a clear Spanish message when the business already has 2 **active** members. Pausing a member frees a slot.
- Enforced on the server in the invite and member-status routes, inside one statement or transaction so two parallel invites cannot both pass (GS-17). Platform admins do not count.
- The admin page shows "Usuarios: n de 2".

## 4. Google Review link (D-038, D-039)

- Column `businesses.google_review_url`, nullable, `https` only; host must be one of `g.page`, `search.google.com`, `www.google.com`, `maps.app.goo.gl`.
- Admin page shows it under "NFC de Google Review — grabar esta URL directamente en el chip". Smart Tap adds no page, rating screen or filter in front of it (D-039). No new route.
- `docs/NFC_OPERATIONS.md`: 2 capture tags (Smart Tap URLs) + 1 review tag (Google URL).

## 5. Inactivity defined by the owner (D-036)

- The existing `inactivity_days` field stays per business. In the admin form, label it "Días sin visita para considerar inactivo (definido por el dueño)". The database default only pre-fills the field.

## 6. Owner go-live approval (D-031, D-040)

- Columns on `businesses`: `owner_approved_at timestamptz`, `owner_approved_name text` (2–120 characters).
- New businesses are created with `is_active = false`.
- Admin action "Registrar aprobación del dueño" stores who approved (name typed by the admin) and when, with an audit entry. It requires: branding, inactivity days, the four offers, Google Review URL, and at least one active member.
- The business can be activated only when `owner_approved_at` is set. Server-side check, not only in the UI.
- Existing businesses (Café Luna demo) keep working: the migration sets `owner_approved_at` for rows that are already active.

## 7. Database

One migration with the columns above. **Do not apply it**; the Reviewer applies it to Supabase and renames the file to the live version.

## 8. Tests (GS-56)

- Message with and without an offer; offer from another business never used.
- Third active member rejected; parallel invites cannot exceed 2; pausing frees a slot.
- Google Review URL validation (accept the four hosts, reject `http`, other hosts and `javascript:`).
- Activation blocked without approval; approval blocked with missing fields; audit rows written.
- Birthday copy rendered.
