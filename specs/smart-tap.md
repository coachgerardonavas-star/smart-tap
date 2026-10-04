# Smart Tap MVP specification

## Goal

Deliver one configurable multi-tenant platform that lets a local business capture a customer and consent from an NFC landing, record repeat visits, review simple customer activity, and let Automate IT onboard new businesses without custom development.

## Requirements

1. Use Astro, React only for interactive UI, Supabase Auth, PostgreSQL, and strict RLS.
2. Store business identity, branding, settings, authorized users, and basic rules.
3. Store customer name, normalized phone, optional birthday, consent, and signup date.
4. Store each visit with customer, business, time, source, and optional NFC tag.
5. Provide an NFC landing with branding, capture form, explicit consent, and confirmation.
6. Identify repeat customers by normalized phone inside the same business.
7. Provide a private dashboard with total customers, total visits, visits per customer, last visit, inactivity, birthdays, and a customer list.
8. Provide an Automate IT area to create and configure businesses, issue NFC URLs, and invite authorized users.
9. Isolate all tenant data. A member of one business must receive no rows from another business.
10. Keep privileged keys on the server, validate all external input, limit public check-in abuse, and keep an audit trail for sensitive admin actions.
11. Include a reproducible demo business and a demo that can be shown before production credentials are connected.
12. Record architecture, decisions, tasks, verification, setup, and current handoff state.

13. Capture separate, optional WhatsApp marketing consent; detect follow-up opportunities; show a follow-up queue with an owner-sent WhatsApp link (D-023, `docs/FOLLOW_UP_QUEUE.md`).

## Edge cases

- An invalid or inactive business returns a neutral unavailable page.
- An invalid NFC code cannot create a visit.
- A direct landing URL without a tag records a manual-source visit.
- A repeated phone updates the customer and creates a new consent record and visit.
- Missing consent blocks check-in.
- Invalid phone numbers, slugs, colors, URLs, birthdays, and roles are rejected.
- Rapid repeated check-ins from one identifier are limited in PostgreSQL.
- A viewer cannot delete customer data. Owners, managers, and platform admins can.
- An external login redirect is replaced with the dashboard path.
- An existing invited user can be assigned without creating a duplicate account.
- The customer, consent, and visit write succeeds or fails as one transaction.
- Check-in never requires WhatsApp consent; a customer without it never gets a WhatsApp button.

## Excluded

Automated WhatsApp sending (Meta Business Platform, templates, webhooks), WhatsApp automation, advanced campaigns, full CRM, POS, payments, reservations, conversational AI, advanced Wallet features, and custom CRM integrations.
