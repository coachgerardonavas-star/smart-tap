# Follow-up Queue — specification (D-023)

Approved by the CEO on 2026-10-04. Written by Claude Code (Reviewer) for the Builder.

## Goal

Smart Tap tells the owner who came in, who came back, and who to bring back. The owner sends each WhatsApp message personally from his own phone or WhatsApp Web. Smart Tap never sends a message.

**Out of scope:** Meta Business Manager, WhatsApp Business Platform / Cloud API, approved templates, webhooks, bulk sending, scheduled sending, CRM integrations. Automated WhatsApp is a later paid add-on, not part of $199 + $79/month.

## 1. WhatsApp consent at check-in

- Add a **second, separate, optional, unchecked** checkbox under the existing required consent:
  > Quiero recibir mensajes y promociones de {negocio} por WhatsApp. Puedo pedir que paren en cualquier momento.
- The check-in still succeeds without it. Marketing consent must never be a condition of registering a visit.
- Text version: `whatsapp-2026-10-04`, stored with the record.
- Checked → `customers.whatsapp_opt_in = true`, `whatsapp_opt_in_at = now()`, plus a `consent_records` row with `purpose = 'whatsapp'`, `consented = true`, the text version, IP hash and user agent.
- Unchecked on a later visit → no change. Only an explicit opt-out revokes.
- The existing required consent keeps working; give its `consent_records` rows `purpose = 'visits'`.

## 2. Opportunity detection (computed on read, no scheduler)

Computed in PostgreSQL or the server for one business at a time, in the business time zone. A customer may appear in several kinds.

| Kind | Rule (MVP defaults) | Suggested message |
|---|---|---|
| `inactive` | Last visit `inactivity_days` or more ago (setting already exists; change the default for new businesses from 45 to 30) | "Hola {nombre}, te extrañamos en {negocio}. ¡Te esperamos pronto!" |
| `birthday` | Birthday within the next 7 days, or today | "¡Feliz cumpleaños, {nombre}! En {negocio} queremos celebrarlo contigo." |
| `frequent` | 4 or more visits in the last 30 days | "Gracias por visitarnos tan seguido, {nombre}. En {negocio} valoramos mucho tu preferencia." |
| `new` | Only one visit, made in the last 3 days | "¡Gracias por tu primera visita a {negocio}, {nombre}! Esperamos verte pronto." |

Every message ends with: `Si prefieres no recibir mensajes, responde BAJA.`

`{nombre}` is the first word of `full_name`. Messages live in one server module with these defaults; per-business editing is not in this phase.

## 3. Follow-up Queue in the dashboard

- New section above the customer table: "Para contactar hoy", grouped by kind, with counts.
- Each row: name, kind, reason ("Sin venir hace 41 días", "Cumple el 12 oct"), last visit.
- If `whatsapp_opt_in` is true: button **Enviar WhatsApp** and **Descartar**.
- If false: no WhatsApp button, label "Sin permiso para WhatsApp", and **Descartar**.
- Viewers see the queue without buttons. Owners, managers and platform admins (aal2) act.

## 4. Actions

New table `follow_ups`: `id`, `business_id`, `customer_id`, `kind`, `period_key`, `status` (`contacted` | `dismissed`), `actor_user_id`, `created_at`; unique `(business_id, customer_id, kind, period_key)`; composite FK `(business_id, customer_id)` to customers; RLS select for members, same pattern as `visits`; writes only through the server.

`period_key` keeps one action per opportunity cycle:
- `inactive`: date of the last visit (a new visit starts a new cycle);
- `birthday`: year of the birthday;
- `frequent`: year-month;
- `new`: `first`.

A customer with an action for the current `period_key` of a kind leaves the queue for that kind.

**Enviar WhatsApp:** a POST form to `/api/dashboard/follow-up` with `businessId`, `customerId`, `kind`, `action=contact`.
1. `requireDataAccess` + `assertBusinessAccess(identity, businessId, false)`.
2. Load the customer filtered by `business_id` **and** `id`; reject without opt-in.
3. Recompute the opportunity on the server; reject if it no longer applies.
4. Insert the action (idempotent on the unique key).
5. Respond 303 to `https://wa.me/{E164 digits without +}?text={encodeURIComponent(message)}`, built only from database values.

**Descartar:** same route with `action=dismiss`, then 303 to `/dashboard?business={slug}`.

The browser never sends the phone number or the message text.

## 5. Opt-out

Customer detail action **"Pidió no recibir WhatsApp"** (owner, manager, admin): sets `whatsapp_opt_in = false`, adds a `consent_records` row (`purpose = 'whatsapp'`, `consented = false`, `source = 'admin'`) and an `audit_log` entry. The WhatsApp button disappears immediately.

## 6. Database change

One new migration file:
- columns `customers.whatsapp_opt_in boolean not null default false` and `whatsapp_opt_in_at timestamptz`;
- `consent_records.purpose text not null default 'visits' check (purpose in ('visits','whatsapp'))`;
- table `follow_ups` with RLS and grants;
- new `record_public_check_in` with a `p_whatsapp_opt_in boolean` argument (10 arguments), keeping D-017 and the rate limits; revoke the 9-argument version from every role;
- default of `businesses.inactivity_days` → 30.

**Do not apply it to live Supabase.** The Reviewer applies it after review and renames the file to the live version.

## 7. Tests required (GS-56, GS-40)

- Check-in without the WhatsApp box: visit recorded, `whatsapp_opt_in` false, no `whatsapp` consent row.
- With the box: opt-in true and one `whatsapp` consent row; a later visit without the box keeps it true.
- Each opportunity rule, including time-zone edges for birthdays and the 30-day boundary.
- Follow-up route: viewer 403; member of another business 403; customer of another business 404; customer without opt-in rejected; opportunity that no longer applies rejected; repeated click creates one row; the redirect URL contains only digits and the encoded server-built message.
- Opt-out removes the button and writes consent + audit rows.
- `aal1` platform admin rejected (existing D-020 guard).

## 8. Docs

Update `docs/PRODUCT.md`, `specs/smart-tap.md`, `docs/security/CONTROL_MATRIX.md` (GS-04, GS-45, GS-50, GS-51 for the new data) and `docs/HANDOFF.md`.
