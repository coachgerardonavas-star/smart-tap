# Smart Tap — Client Onboarding

Purpose: make a new Smart Tap customer a configuration task, not a development project.

## Trigger

Start onboarding after successful Smart Tap payment/subscription.

Commercial baseline:
- setup: $199
- monthly: $79
- initial Stripe checkout: $278 when setup + first month are charged together.

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
- preferred inactivity threshold (default 45 days if no business-specific decision is needed);
- privacy-policy URL or approved privacy notice;
- number/labels of NFC tags to configure.

Optional:
- secondary color;
- birthday collection enabled/wording;
- internal label for locations/counters/tables if multiple tags are used.

## Automate IT setup sequence

1. Confirm payment is active.
2. Create business in Smart Tap admin.
3. Configure name, branding, timezone, privacy URL and inactivity threshold.
4. Create NFC tag record(s) and labels.
5. Invite the business owner/admin.
6. Confirm invite delivery and account activation.
7. Copy the exact production NFC URL for each physical tag.
8. Program and test each tag using `docs/NFC_OPERATIONS.md`.
9. Run a customer capture test.
10. Confirm the test customer appears in the correct dashboard.
11. Remove test data when appropriate.
12. Deliver credentials/instructions and record delivery date.

## Do not include by default

Base Smart Tap does not silently include:
- custom CRM integrations;
- automated WhatsApp campaigns;
- POS integrations;
- reservations;
- payments inside Smart Tap;
- AI agents;
- custom software development;
- advanced loyalty/Wallet work.

These require separate scope/pricing when offered.

## Delivery checklist

A customer is considered configured when:
- account access works;
- branding is correct;
- privacy link is present;
- NFC opens the intended production landing page;
- one test capture succeeds;
- dashboard receives the customer/visit;
- tenant access is limited to that business;
- the customer has been shown the basic dashboard workflow.

## Escalation opportunity

Smart Tap detects a narrow customer-retention/visibility problem. If implementation reveals broader operational friction, record the observation and handle it through Automate IT's diagnosis/main service process rather than expanding Smart Tap scope for free.
