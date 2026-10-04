# Production Smoke Test

Run this only after a hosted production URL and final environment values exist.

## Preconditions

- production deployment is serving HTTPS;
- Supabase project is `vrouyhxzxrfkuuqfslrc`;
- Auth Site URL and callback URL match production;
- custom SMTP is configured before inviting commercial users;
- bootstrap platform admin can sign in with MFA/AAL2;
- one test business and one NFC tag exist.

## Gate A — public capture

1. Open the exact NFC URL in a private browser.
2. Confirm business branding and privacy link are correct.
3. Submit a new fictitious customer with consent.
4. Confirm success page and visit count.
5. Verify one customer, one consent record and one visit were created for the correct business.
6. Submit the same phone again the same local business day.
7. Confirm the customer is reused and `alreadyCounted` behavior prevents a second counted visit that day.
8. Confirm the tag `last_used_at` updates.

## Gate B — dashboard

1. Sign in as the business user.
2. Confirm the new customer appears.
3. Confirm total customers, visit count, last visit and inactivity/birthday logic are consistent.
4. Confirm no platform-admin controls are visible to the business user.

## Gate C — tenant isolation

1. Create/use Business A and Business B with separate authenticated users.
2. As Business A, attempt normal navigation and direct known-ID access to Business B resources.
3. Confirm Business B customers, visits, tags and members are not readable.
4. Repeat from Business B toward Business A.
5. Any cross-tenant read or write is a release blocker.

## Gate D — admin

1. Sign in as platform admin with MFA/AAL2.
2. Create a test business.
3. Add branding and NFC tag.
4. Invite a business user and complete the invite flow.
5. Confirm audit entries exist for administrative changes.
6. Confirm an AAL1 admin session cannot use platform-admin RLS paths.

## Gate E — Auth email

1. Send one invitation through production SMTP.
2. Complete callback and password setup.
3. Send one password recovery email.
4. Complete recovery.
5. Confirm links resolve only to the approved production origin.

## Gate F — NFC hardware

1. Program the tag with the exact production HTTPS URL from admin.
2. Test on at least one iPhone and, when available, one Android phone.
3. Complete a real test check-in.
4. Only after successful read and check-in may the NFC tag be write-locked.

## PASS criteria

Production is ready for first customer only when Gates A-F pass, no CRITICAL/HIGH security finding is open, and tenant isolation is verified against the hosted environment.
