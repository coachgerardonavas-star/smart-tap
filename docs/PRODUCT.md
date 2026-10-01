# Smart Tap product

Smart Tap is a $199 setup and $79 monthly entry product for local businesses. A customer touches an NFC, opens the business landing, shares a name and phone, optionally shares a birthday, accepts the privacy notice, and records a visit.

The business gets a small private panel. It shows customers, visits, repeat customers, last visits, inactive customers, upcoming birthdays, and a basic customer list. Owners and managers can remove a customer when handling a privacy request.

Automate IT gets a separate admin area for business configuration, branding, NFC links, inactivity rules, and user invitations. One platform serves all businesses. Each business sees only its rows.

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
