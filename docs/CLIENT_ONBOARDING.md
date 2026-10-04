# Smart Tap — Client Onboarding

Purpose: make a new Smart Tap customer a configuration task, not a development project.

## Trigger

Start onboarding after successful Smart Tap payment/subscription.

Commercial baseline:
- setup: $199
- monthly: $79
- initial Stripe checkout: $278 when setup + first month are charged together;
- the first $79 is month 1 prepaid;
- the next $79 charge occurs **30 days after the initial $278 payment**, regardless of go-live date;
- minimum commitment: 3 monthly payments;
- base package: one business location and 3 configured NFC tags;
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
- **Email: not collected by default.** It is added only when that business specifically wants email campaigns/follow-up.
- **WhatsApp consent: optional, separate and unchecked (D-042).** Registration never depends on it. The label names the business, leads with the benefit and clearly states that the customer agrees to receive WhatsApp messages from that business.

The birthday field should explain the benefit so the customer has a reason to complete it. Approved intent: communicate that sharing the birthday may allow the business to send discounts, gifts or birthday benefits. Recommended customer-facing copy:

> **¿Cuándo cumples años? (opcional)**  
> Déjanos tu fecha de cumpleaños y podremos sorprenderte con descuentos, regalos o beneficios especiales en tu día.

Do not make birthday mandatory and do not promise a specific gift or discount unless that business has approved such an offer.

If email is enabled for a business, its purpose and consent copy must be configured for that business before collection. Do not add email silently to the default form.

WhatsApp consent must not be implied merely because the customer supplied a phone number. The form must present an explicit, optional acceptance whose wording names the business and makes clear that WhatsApp follow-up may include the approved categories used by that business, such as offers, birthday benefits, welcome/return messages and relevant customer follow-up. The final wording must also provide a clear way to stop future WhatsApp communications, and opt-out requests must be honored.

## Included NFC allocation

The 3 NFC tags included in the base Smart Tap setup have two approved roles:

- **2 NFC tags for customer capture/registration.** These open the Smart Tap registration/check-in flow.
- **1 NFC tag for Google Review.** This opens the business's approved Google review destination.

Automate IT recommends the best physical placement for all three NFC tags according to the type and flow of the business. The owner may change the recommended placement before activation.

The two capture NFC tags may be placed in different high-traffic/customer-interaction points inside the same included location. The review NFC should be positioned where asking for a review is contextually appropriate, normally near the end of the customer experience rather than at initial entry.

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
- preferred inactivity threshold, chosen by the business owner during onboarding;
- privacy-policy URL or approved privacy notice;
- labels/physical placement for the 2 customer-capture NFC tags;
- Google Review destination and placement for the 1 review NFC tag;
- one owner-approved offer for each follow-up category: inactive, birthday, frequent/VIP, new/welcome;
- confirmation of the single location covered by the base package;
- whether the business wants email collection/campaigns enabled;
- business-specific WhatsApp consent wording that explicitly names the business and matches the approved follow-up categories.

Optional:
- secondary color;
- birthday-specific offer/benefit wording approved by the owner;
- email-specific purpose/consent copy when email collection is enabled;
- alternate owner-approved placement for the included NFC tags.

## Offer configuration

The owner defines one approved offer for each follow-up category: inactive customer, birthday, frequent/VIP customer and new/welcome customer. Smart Tap uses the offer assigned to that category and must not substitute or invent a different promotion without later owner approval. The owner approves the suggested message before manually sending the WhatsApp message.

## Automate IT setup sequence

1. Confirm payment is active.
2. Confirm mandatory onboarding form is complete.
3. Complete the verification meeting with owner/responsible manager.
4. Obtain final owner approval.
5. Confirm the owner-selected dashboard users (maximum 2 included).
6. Create business in Smart Tap admin.
7. Configure name, branding, timezone, privacy URL and owner-selected inactivity threshold.
8. Confirm whether email collection/campaigns are enabled for that business; if yes, configure purpose/consent copy before collection.
9. Configure the required WhatsApp consent text for that business, explicitly naming the business and documenting the opt-out path.
10. Load the four owner-approved category offers.
11. Create/program two customer-capture NFC tags and one Google Review NFC tag.
12. Confirm Automate IT's recommended placement and any owner-approved placement changes.
13. Invite the approved dashboard users.
14. Confirm invite delivery and account activation.
15. Copy the exact production URL for each physical tag.
16. Program and test each tag using `docs/NFC_OPERATIONS.md`.
17. Run a customer capture test verifying required name + phone, optional birthday, email only when explicitly enabled, and required explicit WhatsApp consent.
18. Test the Google Review NFC against the approved business review destination.
19. Confirm the test customer appears in the correct dashboard.
20. Confirm follow-up queue behavior for at least one safe test case.
21. Remove test data when appropriate.
22. Deliver credentials/instructions and record delivery date.

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
- more than 2 included business-side dashboard users;
- customer email collection/campaigns unless the business has chosen that channel and its purpose/consent configuration is approved.

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
- owner-approved offers are recorded for all four follow-up categories;
- the 2 customer-capture NFC tags open the intended Smart Tap production landing/check-in flow;
- the 1 Google Review NFC opens the approved review destination;
- NFC placement is approved by the owner after Automate IT's recommendation;
- customer form requires name and phone and leaves birthday optional with benefit-oriented copy;
- email is absent by default or explicitly enabled with approved purpose/consent copy;
- customer cannot complete Smart Tap registration without explicit WhatsApp consent naming the business;
- opt-out instructions are clear and the system can honor a later opt-out;
- one test capture succeeds;
- dashboard receives the customer/visit;
- tenant access is limited to that business;
- the customer has been shown the basic dashboard and assisted WhatsApp workflow.

## Escalation opportunity

Smart Tap detects a narrow customer-retention/visibility problem. If implementation reveals broader operational friction, record the observation and handle it through Automate IT's diagnosis/main service process rather than expanding Smart Tap scope for free.
