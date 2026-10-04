# Smart Tap product

Smart Tap is a $199 setup and $79 monthly entry product for local businesses.

**Smart Tap te ayuda a saber quién entró, quién regresó y a quién deberías traer de vuelta.**

A customer touches an NFC, opens the business landing, shares a name and phone, optionally shares a birthday, accepts the privacy notice, optionally accepts WhatsApp messages, and records a visit. The dashboard turns visits into a follow-up queue (inactive, birthday, frequent, new); the owner sends each WhatsApp message himself with one tap (D-021, `docs/FOLLOW_UP_QUEUE.md`).

Existing CRM: Smart Tap remains standalone by default whether or not the business already has a CRM. CRM integration is not part of Smart Tap; if requested, it is handled under Plan Asistente or higher depending on scope. Automated WhatsApp through Meta is also outside the Smart Tap base product.

The business gets a small private panel. It shows customers, visits, repeat customers, last visits, inactive customers, upcoming birthdays, frequent/VIP customers, new customers, and a basic customer list. Owners and managers can remove a customer when handling a privacy request.

Automate IT gets a separate admin area for business configuration, branding, NFC links, inactivity rules, and user invitations. One platform serves all businesses. Each business sees only its rows.

## Commercial package

- $199 setup + $79/month.
- Initial checkout: $278 when setup and first monthly payment are charged together.
- Minimum commitment: 3 monthly payments. Early cancellation still owes the full three-month commitment.
- After the minimum, cancellation requires 30 days notice.
- Service access ends at the end of the paid period.
- Customer receives a 30-day export window after termination; data is retained for 90 days before deletion under the final retention workflow.
- Base package covers one business location.
- Three configured NFC tags are included in the initial setup.
- Additional configured NFC tags: $10 each.
- Additional location: $79/month. Setup is $99 if purchased before the prior location of the same franchise/business group generates its second monthly charge; after that point, setup is the regular $199.
- Monthly support includes normal platform operation, basic support and up to 2 simple configuration changes every 2 weeks.
- New automations, integrations, custom features, automated WhatsApp/API work and custom CRM work are not simple configuration changes and are scoped separately, normally as Plan Asistente or higher.

## Follow-up and offers

Smart Tap prepares opportunities for inactive customers, birthdays, frequent/VIP customers and new/welcome customers. The system should recommend which owner-approved offer fits each case, but it must not invent or authorize discounts on its own. The business owner defines the allowed offers during onboarding. The owner approves the suggested offer/message and manually sends the WhatsApp message.

## MVP success criteria

- A new business can be configured without code.
- An NFC URL opens a branded capture page.
- A first visit creates the customer, consent record, and visit.
- A later visit with the same phone creates another visit.
- The business dashboard reflects the activity.
- A cross-tenant query returns zero rows.
- Automate IT can add another business and invite its owner.

## Demo

`/demo` shows the sample Café Luna dashboard. `/demo/capture` runs the capture and confirmation flow with fictitious data and no database write. After applying the seed, `/b/cafe-luna?t=demo-cafe-luna-main-2026` exercises the real database path.

## Product limits

The customer list shows the 250 most recently active customers. Counts remain exact. Birthday calculation loads up to 1,000 customers with birthdays, which covers the intended first-stage business size. Larger tenants should move birthday selection into a database query.
