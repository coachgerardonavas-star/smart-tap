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
2. Automate IT reviews the form for missing or conflicting information.
3. Automate IT holds a short verification meeting with the business owner or responsible manager.
4. The verification may happen by phone/video call or in person.
5. Only after verification is the business configuration finalized and NFC tags programmed.

The detailed form is still being designed. Do not invent new required fields, pricing or commercial promises without a CEO decision.

## Information to collect

Required:
- business display name;
- legal/business name when needed for records;
- owner/admin full name;
- owner/admin email;
- owner/admin phone;
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
- birthday collection enabled/wording;
- internal label for counters/tables or multiple tags inside the same location.

## Offer configuration

The owner defines which offers are permitted. Smart Tap may recommend one of those approved offers for inactive customers, birthdays, frequent/VIP customers or new/welcome customers. Smart Tap must not invent an unauthorized discount. The owner approves the suggestion before manually sending the WhatsApp message.

## Automate IT setup sequence

1. Confirm payment is active.
2. Confirm mandatory onboarding form is complete.
3. Complete the verification meeting with owner/responsible manager.
4. Create business in Smart Tap admin.
5. Configure name, branding, timezone, privacy URL and inactivity threshold.
6. Load the owner-approved offers.
7. Create NFC tag record(s) and labels.
8. Invite the business owner/admin.
9. Confirm invite delivery and account activation.
10. Copy the exact production NFC URL for each physical tag.
11. Program and test each tag using `docs/NFC_OPERATIONS.md`.
12. Run a customer capture test.
13. Confirm the test customer appears in the correct dashboard.
14. Confirm follow-up queue behavior for at least one safe test case.
15. Remove test data when appropriate.
16. Deliver credentials/instructions and record delivery date.

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
- additional locations inside the base $79 monthly fee.

CRM integration or broader automation is handled through Plan Asistente or higher depending on scope.

## Support after delivery

The $79 monthly fee includes normal platform operation, basic support, and up to 2 simple configuration changes every 2 weeks. Simple changes may include approved offer changes, text, logo, phone number, business information or suggested-message copy. New automation, integration or custom functionality is a separate scope.

## Delivery checklist

A customer is considered configured when:
- onboarding form and verification meeting are complete;
- account access works;
- branding is correct;
- privacy link is present;
- owner-approved offers are recorded;
- NFC opens the intended production landing page;
- one test capture succeeds;
- dashboard receives the customer/visit;
- tenant access is limited to that business;
- the customer has been shown the basic dashboard and assisted WhatsApp workflow.

## Escalation opportunity

Smart Tap detects a narrow customer-retention/visibility problem. If implementation reveals broader operational friction, record the observation and handle it through Automate IT's diagnosis/main service process rather than expanding Smart Tap scope for free.
