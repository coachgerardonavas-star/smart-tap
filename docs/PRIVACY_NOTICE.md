# Smart Tap — customer privacy notice (approved by the CEO, D-044, 2026-10-04)

Approved text. `{Negocio}` / `{Business}`, `{contacto}` / `{contact}` and `{fecha}` / `{date}` are filled by the server from the business row. Do not edit wording without CEO approval; if a word changes, bump `PRIVACY_NOTICE_VERSION`.

Not legal advice: a Florida attorney should review this text before the first real client.

## Español

**Aviso de privacidad — {Negocio}**

**Quién guarda tus datos**
{Negocio} usa Smart Tap, un servicio de Automate IT LLC (Florida, EE. UU.), para registrar tus visitas. {Negocio} decide cómo usar tus datos; Automate IT solo los guarda y protege por cuenta del negocio.

**Qué datos guardamos**
- Tu nombre y teléfono.
- Tu fecha de cumpleaños, solo si decides darla.
- Las fechas de tus visitas.
- Si aceptaste recibir mensajes por WhatsApp.
- Un registro de tu consentimiento: fecha, versión de este aviso y un identificador técnico protegido. No guardamos tu dirección IP en texto legible.

**Para qué se usan**
Para reconocerte cuando vuelves, contar tus visitas y, si lo aceptaste, enviarte ofertas o un saludo de cumpleaños por WhatsApp. Los mensajes los envía una persona de {Negocio}, no un sistema automático.

**WhatsApp**
Es opcional y viene sin marcar. Puedes dejar de recibir mensajes cuando quieras: responde BAJA o díselo a {Negocio}.

**Quién más los ve**
Solo las personas autorizadas de {Negocio} (máximo 2). Ningún otro negocio puede verlos. Tus datos se guardan con proveedores de alojamiento y base de datos en Estados Unidos, con acceso restringido. No vendemos, alquilamos ni compartimos tus datos con fines comerciales.

**Cuánto tiempo**
Si pasan 24 meses sin que registres una visita, tus datos se borran. Si {Negocio} deja de usar Smart Tap, recibe una copia de su lista de clientes y Smart Tap borra los datos en 30 días.

**Tus derechos**
Puedes pedir ver, corregir o borrar tus datos, o retirar tu consentimiento. Escríbele a {Negocio}: {contacto}. Si no te responde, escribe a smarttap@yourbizupgraded.com.

**Edad**
El registro es solo para personas de 13 años o más.

**Cambios**
Si este aviso cambia, actualizamos la fecha de abajo. Cada consentimiento queda guardado con la versión que aceptaste.

Última actualización: {fecha}

## English

**Privacy notice — {Business}**

**Who keeps your data**
{Business} uses Smart Tap, a service of Automate IT LLC (Florida, USA), to record your visits. {Business} decides how your data is used; Automate IT only stores and protects it on the business's behalf.

**What we keep**
- Your name and phone number.
- Your birthday, only if you choose to share it.
- The dates of your visits.
- Whether you agreed to receive WhatsApp messages.
- A record of your consent: date, version of this notice and a protected technical identifier. We do not store your IP address in readable form.

**What it is used for**
To recognize you when you come back, count your visits and, if you agreed, send you offers or a birthday greeting on WhatsApp. Messages are sent by a person at {Business}, not by an automated system.

**WhatsApp**
It is optional and unchecked by default. You can stop messages at any time: reply BAJA or tell {Business}.

**Who else sees it**
Only authorized people at {Business} (2 at most). No other business can see it. Your data is stored with hosting and database providers in the United States, with restricted access. We do not sell, rent or share your data for commercial purposes.

**How long**
If 24 months pass without a recorded visit, your data is deleted. If {Business} stops using Smart Tap, it receives a copy of its customer list and Smart Tap deletes the data within 30 days.

**Your rights**
You can ask to see, correct or delete your data, or withdraw your consent. Contact {Business}: {contact}. If they do not answer, write to smarttap@yourbizupgraded.com.

**Age**
Registration is only for people aged 13 or older.

**Changes**
If this notice changes, we update the date below. Each consent is stored with the version you accepted.

Last updated: {date}

## Implementation spec (Builder)

The notice must not go live until all four pieces exist, or it promises behavior the system does not have.

1. **Page** `/privacy/[slug]`: server-rendered, Spanish first then English on the same page, filled from the business row (display name, contact). Unknown or inactive slug → 404. The check-in form links here (`target="_blank"`). Keep `/privacy` as a generic fallback with the same text and "el negocio donde te registraste". `privacy_url` override stays available but defaults to the per-business page.
2. **Business contact**: new nullable `contact_phone` and `contact_email` columns; admin form fields; validation (E.164 phone via libphonenumber-js, email via Zod); owner approval (D-040) requires at least one.
3. **24-month purge**: a `security definer` function `private.purge_inactive_customers()` deletes customers whose latest visit (or creation date if none) is older than 24 months, with their visits, consent records and follow-ups (cascade); writes one `audit_log` row per business with the count only, never names or phones. Scheduled daily with `pg_cron`. Not executable by `anon`/`authenticated`.
4. **Cancellation**: new `cancelled_at timestamptz` on businesses (distinct from pausing with `is_active=false`). Admin action "Cancelar servicio" sets it and deactivates; admin can download a CSV of that business's customers (name, phone, birthday, visit count, last visit, WhatsApp opt-in) — platform admin + AAL2 only, audit row without data. The same daily job deletes all customer data of businesses cancelled more than 30 days ago.
5. **Consent version**: the server sets `PRIVACY_NOTICE_VERSION` (e.g. `2026-10-04`); the client-supplied `consentVersion` is ignored (today `CheckInForm.tsx` sends `2026-10-01` and the server trusts it — GS-46).
6. **Age**: the consent checkbox text adds "Tengo 13 años o más." A birthday that makes the person younger than 13 is rejected with a short message.
7. Tests for every rule above; migration file only, not applied (the Reviewer applies it).
