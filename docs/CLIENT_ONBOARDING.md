# Smart Tap — Client Onboarding

Purpose: make a new Smart Tap customer a configuration task, not a development project.

## Trigger

Start onboarding after successful Smart Tap payment/subscription.

Commercial baseline:
- setup: $199
- monthly: $79
- initial Stripe checkout: $278 when setup + first month are charged together.
- minimum commitment: 3 monthly payments.
- base package: one business location and 3 configured NFC tags.
- additional configured NFC tags: $10 each.

## Approved onboarding flow

1. Client completes a mandatory onboarding form after payment.
2. The form may be completed by the business owner or an authorized responsible manager.
3. Automate IT reviews the form for missing or conflicting information.
4. Automate IT holds a short verification meeting with the business owner or responsible manager.
5. The verification may happen by phone/video call or in person.
6. The business owner must give final approval before Smart Tap is activated, even when an authorized manager completed the form or attended the verification session.
7. Only after owner approval is the business configuration finalized and NFC tags programmed/activated.

The detailed form is still being designed. Do not invent new required fields, pricing or commercial promises without a CEO decision.

## Dashboard users included

The base Smart Tap package includes a maximum of **2 dashboard users total**.

- The business owner controls who occupies those two included user slots.
- The owner may use one slot personally, or may choose not to have a dashboard login and assign both included slots to authorized employees.
- The two-user limit counts all business-side dashboard users included in the base package.
- Additional-user pricing or policy is not yet approved; do not invent it.

## Customer-facing NFC form

Approved minimum customer fields:
- **Name: required.**
- **Phone: required.**
- **Birthday: optional.**

The birthday field should explain the benefit so the customer has a reason to complete it. Approved intent: communicate that sharing the birthday may allow the business to send discounts, gifts or birthday benefits. Recommended customer-facing copy:

> **¿Cuándo cumples años? (opcional)**  
> Déjanos tu fecha de cumpleaños y podremos sorprenderte con descuentos, regalos o beneficios especiales en tu día.

Do not make birthday mandatory and do not promise a specific gift or discount unless that business has approved such an offer.

## Information to collect

Required:
- business display name;
- legal/business name when needed for records;
- owner full name and approval contact information;
- authorized responsible manager information when applicable;
- names/emails of the maximum 2 included dashboard users selected by the owner;
- logo file or approved logo URL;
- primary brand color;
- business timezone;
- country;
- preferred inactivity threshold (default 30 days if no business-specific decision is needed);
- privacy-policy URL or approved privacy notice;
- number/labels of NFC tags to configure;
- owner-defined list of allowed offers/promotions Smart Tap may recommend;
- confirmation of the single location covered by the base package.

Optional:
- secondary color;
- birthday-specific offer/benefit wording approved by the owner;
- internal label for counters/tables or multiple tags inside the same location.

## Offer configuration

The owner defines which offers are permitted. Smart Tap may recommend one of those approved offers for inactive customers, birthdays, frequent/VIP customers or new/welcome customers. Smart Tap must not invent an unauthorized discount. The owner approves the suggestion before manually sending the WhatsApp message.

## Automate IT setup sequence

1. Confirm payment is active.
2. Confirm mandatory onboarding form is complete.
3. Complete the verification meeting with owner/responsible manager.
4. Obtain final owner approval.
5. Confirm the owner-selected dashboard users (maximum 2 included).
6. Create business in Smart Tap admin.
7. Configure name, branding, timezone, privacy URL and inactivity threshold.
8. Load the owner-approved offers.
9. Create NFC tag record(s) and labels.
10. Invite the approved dashboard users.
11. Confirm invite delivery and account activation.
12. Copy the exact production NFC URL for each physical tag.
13. Program and test each tag using `docs/NFC_OPERATIONS.md`.
14. Run a customer capture test verifying required name + phone and optional birthday behavior.
15. Confirm the test customer appears in the correct dashboard.
16. Confirm follow-up queue behavior for at least one safe test case.
17. Remove test data when appropriate.
18. Deliver credentials/instructions and record delivery date.

## Do not include by default

Base Smart Tap does not silently include:
- custom CRM integrations;
- automated WhatsApp campaigns or Meta API sending;
- POS integrations;
- reservations;
- payments inside Smart Tap;
- AI agents;
- custom software development;
- advanced loyalty/Wallet work;
- additional locations inside the base $79 monthly fee;
- more than 2 included business-side dashboard users.

CRM integration or broader automation is handled through Plan Asistente or higher depending on scope.

## Support after delivery

The $79 monthly fee includes normal platform operation, basic support, and up to 2 simple configuration changes every 2 weeks. Simple changes may include approved offer changes, text, logo, phone number, business information or suggested-message copy. New automation, integration or custom functionality is a separate scope.

## Delivery checklist

A customer is considered configured when:
- onboarding form and verification meeting are complete;
- final owner approval is recorded;
- no more than 2 included dashboard users are provisioned according to the owner's choice;
- account access works;
- branding is correct;
- privacy link is present;
- owner-approved offers are recorded;
- NFC opens the intended production landing page;
- customer form requires name and phone and leaves birthday optional with benefit-oriented copy;
- one test capture succeeds;
- dashboard receives the customer/visit;
- tenant access is limited to that business;
- the customer has been shown the basic dashboard and assisted WhatsApp workflow.

## Escalation opportunity

Smart Tap detects a narrow customer-retention/visibility problem. If implementation reveals broader operational friction, record the observation and handle it through Automate IT's diagnosis/main service process rather than expanding Smart Tap scope for free.
