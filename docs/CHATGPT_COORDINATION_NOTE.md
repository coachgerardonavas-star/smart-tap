# Smart Tap — Coordination Note

**Authoring agent:** ChatGPT
**Date:** 2026-10-04
**Purpose:** Preserve CEO-approved product/commercial decisions so Codex (Builder), Claude Code (Reviewer), ChatGPT, and any later agent work from the same rules instead of re-deriving them from chat history.

> This note is a coordination summary, not the commercial source of truth. Pricing/contract terms belong in Automate IT's `Manual_de_Pricing.md`; product behavior belongs in `docs/PRODUCT.md` / `docs/DECISIONS.md`. If this note conflicts with a later explicitly approved CEO decision, update the authoritative source and this note together.

## Branch coordination

- Work on **`codex/live-smoke-mfa`** (PR #1) as the single working branch until PR #1 merges. `claude/mfa-review` is now an old Reviewer branch — do not commit there.
- Before changing anything, read **`docs/CHATGPT_COORDINATION_NOTE.md`**.
- Do **not** create new work branches from `main` for current Smart Tap work unless the CEO explicitly changes that instruction.
- `main` remains behind the integration state and is not the working baseline.

## Product model

Smart Tap is one multi-tenant Automate IT platform. Automate IT owns/administers the platform. Each business owner receives private dashboard access only to that business's tenant data.

Customer-facing flow:
1. End customer taps the business's NFC.
2. A public branded landing/form opens.
3. Customer submits required name + phone, optional birthday, and required explicit WhatsApp consent; email is collected only when that business enables email campaigns/follow-up.
4. Smart Tap records the customer and qualifying visit.
5. The end customer does **not** receive dashboard access.

Business-owner flow:
1. Owner/authorized staff signs in.
2. Private dashboard shows that business's customers, visits, repeat behavior, recency, birthdays and follow-up opportunities.

## Approved commercial rules

Pricing source of truth stays `Manual_de_Pricing.md` in ADN.

### Base price and billing cadence
- Setup: **$199**.
- Monthly: **$79/month**.
- Initial checkout: **$278** = $199 setup + first $79 monthly payment.
- The first $79 counts as **month 1 prepaid**.
- The next $79 monthly payment is charged **30 days after the initial $278 payment**.
- The billing anchor is the **initial payment date**, not the Smart Tap go-live/activation date.

### Minimum term / cancellation
- Minimum commitment: **3 months**.
- If cancelled before the minimum is completed, the client owes the full three monthly payments.
- After the minimum, cancellation requires **30 days' notice**.

### Cancellation data/access handling
- Access ends at the end of the paid service period.
- Client receives a **30-day export/download window**.
- Data may be retained for **90 days** for possible reactivation, then deleted according to the final privacy/retention implementation and legal requirements.

### NFC included
- Base setup includes **3 configured physical NFC tags**.
- Fixed allocation: **2 customer-capture/registration NFCs + 1 Google Review NFC**.
- The Google Review NFC opens the direct Google review URL with no Smart Tap interstitial or gating.
- Additional configured NFC tag: **$10 each**.

### Location scope
- Base Smart Tap covers **one physical business location**.
- Each additional location carries **$79/month**.
- Additional-location setup is **$99** if purchased before the previous location in the same franchise/business group generates its second monthly charge.
- After that point, the new location uses regular **$199 setup**.

### Support/configuration changes included in $79
- Basic support and simple configuration changes are included.
- Limit: **up to 2 simple changes every 2 weeks**.
- Examples: offer text, message wording, logo, phone, simple business data/configuration.
- New automations, integrations, WhatsApp API automation, new functionality, or custom development are **not** included; these require separate scoping and may become Plan Asistente or higher depending on complexity.

## CRM decision

If the business already has a CRM:
- **Smart Tap remains independent by default.**
- Do not integrate with the CRM as part of the base $199 + $79 package.
- If the client wants CRM integration or broader automation, reclassify and scope that work separately (typically Plan Asistente or higher depending on actual complexity).

## WhatsApp decision

Base Smart Tap uses **assisted/manual WhatsApp follow-up**, not automatic Meta API sending.

Approved flow:
1. Smart Tap identifies who should be contacted.
2. Smart Tap prepares/suggests the message.
3. Clicking **Enviar WhatsApp** opens WhatsApp/WhatsApp Web with customer number + prefilled message.
4. The business owner/staff member presses **Send**.

The customer-facing registration requires explicit WhatsApp consent naming the business; opt-out must remain available afterward.

Base package does **not** include Meta Business Platform/API setup, automatic outbound WhatsApp campaigns, approved-template management, or third-party WhatsApp messaging costs.

## Follow-up opportunity categories and offers

Smart Tap identifies four approved categories:
1. inactive;
2. birthday;
3. frequent/VIP;
4. new/welcome.

The business owner defines **one offer for each category** during onboarding. Smart Tap must not invent or substitute another promotion without later owner approval.

The owner also defines the inactivity threshold during onboarding; there is no universal Smart Tap threshold.

## Onboarding — approved rules

1. After successful payment, the customer completes a **mandatory onboarding form**.
2. The form may be completed by the **business owner or an authorized responsible manager**.
3. Automate IT performs a **short verification session**, by phone/video or in person, with the owner or responsible manager/person in charge.
4. The **business owner must give final approval before activation**.
5. Base package includes a maximum of **2 business-side dashboard users total**; the owner decides who occupies the slots and may assign both to authorized employees.
6. Customer-facing capture requires **name + phone**; **birthday is optional** with benefit-oriented copy.
7. Customer email is collected only if the business enables email campaigns/follow-up.
8. Before go-live, the owner approves: branding, selected dashboard users, four category offers, inactivity threshold, NFC placement, WhatsApp message/consent text, and direct Google Review URL.

Additional-user pricing/policy is not yet approved; do not invent it.

## Development implications already approved

The MVP direction is:
- follow-up queue;
- four opportunity categories;
- WhatsApp click-to-chat with prefilled message;
- required explicit WhatsApp consent for registration;
- one owner-approved offer per category;
- no automated Meta API messaging in base scope;
- no CRM integration in base scope;
- one-location base plan with multi-location commercial rules above;
- owner approval gate before activation;
- maximum 2 included dashboard users;
- 2 capture NFCs + 1 direct Google Review NFC;
- billing anchored to the initial $278 payment date, not go-live.

Do not silently implement broader features that change these commercial boundaries.

## Pending items

- Decide policy/pricing for dashboard users beyond the 2 included users.
- Exact multi-location dashboard UX/data model if code changes are required.
- Exact data export mechanism and 90-day deletion implementation.
- Final contract/SOW and `Manual_de_Pricing.md` synchronization with the completed onboarding/billing decisions.
- Production hosting/deployment, SMTP, Auth URLs, privacy/retention implementation and physical NFC testing.

When another agent changes one of these areas, update this note or the current handoff so concurrent agents do not work from stale assumptions.
