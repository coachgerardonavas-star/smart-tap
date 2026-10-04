# Smart Tap — NFC Operations

## Base package allocation

Each business receives three configured physical tags:

- two capture tags with Smart Tap URLs;
- one Google Review tag with the direct Google Review URL saved in the business admin.

The Google Review tag opens Google directly. Do not place a Smart Tap page, rating screen, filter or other step before Google.

## Rule

Each capture NFC stores only the exact Smart Tap HTTPS URL generated for the business/tag. The review NFC stores only the approved direct Google Review HTTPS URL. Do not store customer PII, credentials, secrets or tokens directly on any NFC.

## Programming procedure

1. In Smart Tap admin, open the target business.
2. For either capture tag, create/select the intended NFC tag record and label. For the review tag, use the Google Review URL shown in the same page.
3. Copy the exact production HTTPS URL for the intended tag role.
4. Write that URL as the NFC web/URI record.
5. Read the tag back before delivery and confirm the URL matches exactly.
6. Tap with a real phone. Confirm that a capture tag opens the correct business landing or that the review tag opens Google directly.
7. For each capture tag, complete one test check-in.
8. For each capture tag, confirm the dashboard records the intended customer/business/tag behavior.
9. Only after the full test succeeds may the physical tag be write-locked.

## Never lock first

A locked tag with a bad URL may be unusable. Locking is the final physical step, never the first validation step.

## Tag labeling

Use a clear internal label when a business has multiple NFC locations, for example:
- Front Counter
- Table 1
- Reception
- Checkout
- Vehicle 2

The visible customer-facing card/tag design may remain branded and simple; the internal tag label exists for operational tracking.

## Replacement

If a tag is lost/damaged:
1. deactivate the old tag in Smart Tap;
2. create a replacement tag record/code;
3. program and test the new physical tag;
4. do not reuse an exposed/compromised opaque tag code unnecessarily.

## Privacy/security

- Every NFC URL must use HTTPS.
- No service-role key or secret belongs in the NFC URL.
- Customer data collection occurs only on the Smart Tap landing page with the applicable consent/privacy notice.
- Do not program a generic URL when per-tag attribution is expected.

## Delivery evidence

For each delivered tag record:
- business;
- internal tag label;
- delivery/test date;
- tested phone type;
- test result;
- whether write-lock was applied.

Do not record private customer test data in this document.
