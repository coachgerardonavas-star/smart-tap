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
3. Customer may submit name, phone, optional birthday, privacy consent, and optional WhatsApp marketing consent.
4. Smart Tap records the customer and qualifying visit.
5. The end customer does **not** receive dashboard access.

Business-owner flow:
1. Owner/authorized staff signs in.
2. Private dashboard shows that business's customers, visits, repeat behavior, recency, birthdays and follow-up opportunities.

## Approved commercial rules

Decision records: D-025 (package and commitment), D-026 (NFC and locations), D-027 (support), D-028 (offers), D-029 (onboarding), D-031 (owner activation approval), D-032 (dashboard-user limit). Pricing source of truth stays `Manual_de_Pricing.md` in ADN.

### Base price
- Setup: **$199**.
- Monthly: **$79/month**.
- Initial checkout remains **$278** when setup + first month are charged together.

### Minimum term / cancellation
- Minimum commitment: **3 months**, same commercial rule as Automate IT's three main plans.
- If cancelled before the minimum is completed, the client owes the full three months.
- After the minimum, cancellation requires **30 days' notice**.

### Cancellation data/access handling
Approved combination:
- Access ends at the end of the paid service period.
- Client receives a **30-day export/download window**.
- Data may be retained for **90 days** for possible reactivation, then should be deleted according to the final privacy/retention implementation and legal requirements.

### NFC included
- Base setup includes **3 configured physical NFC tags**.
- Additional configured NFC tag: **$10 each**.

### Location scope
- Base Smart Tap covers **one physical business location**.
- Each additional location carries **$79/month**.
- Additional-location setup is **$99** if purchased before the previous location in the same franchise/business group generates its second monthly charge (approximately within the first 30 days).
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

Rationale: Smart Tap must stay standardized, fast to deploy and low-complexity. CRM integration changes the work from product onboarding into custom automation/integration.

## WhatsApp decision

Base Smart Tap uses **assisted/manual WhatsApp follow-up**, not automatic Meta API sending.

Approved flow:
1. Smart Tap identifies who should be contacted.
2. Smart Tap prepares/suggests the message.
3. Clicking **Enviar WhatsApp** opens WhatsApp/WhatsApp Web with customer number + prefilled message.
4. The business owner/staff member presses **Send**.

Base package therefore does **not** include:
- Meta Business Platform/API setup;
- automatic outbound WhatsApp campaigns;
- approved template management;
- third-party WhatsApp messaging costs.

Fully automated WhatsApp is a separate automation project / higher service scope.

## Follow-up opportunity categories

Smart Tap should identify and prepare follow-up for all four approved categories:
1. **Inactive customers**.
2. **Upcoming birthdays**.
3. **Frequent/VIP customers**.
4. **New customer / welcome / second-visit opportunity**.

## Offers/promotions

- Smart Tap should recommend an appropriate offer for the opportunity type.
- The system must not invent unlimited discounts or promotions outside owner-approved business rules.
- **The business owner defines the allowed offers during onboarding.**
- Smart Tap chooses/recommends among those approved offers based on the customer/opportunity type.
- The owner approves before WhatsApp is opened/sent.

## Product promise

Do not position Smart Tap as merely building a customer database.

Approved value framing:

> **Smart Tap te ayuda a saber quién entró, quién regresó y a quién deberías traer de vuelta.**

The product must produce an actionable follow-up queue so customer data does not become a dead database.

## Onboarding — decisions already approved

The onboarding is still being designed. Current approved rules:

1. After successful payment, the customer completes a **mandatory onboarding form**.
2. The form may be completed by the **business owner or an authorized responsible manager**.
3. After the form, Automate IT performs a **short verification session**.
4. That session may be either:
   - a phone/video call; or
   - an in-person meeting.
5. It may be conducted with the **owner or the responsible manager/person in charge**.
6. Even if an authorized manager completes the form or verification, the **business owner must give final approval before Smart Tap is activated**.
7. The base package includes a maximum of **2 business-side dashboard users total**.
8. The owner decides who occupies the two included user slots. The owner may use one slot personally or assign both slots to authorized employees.
9. Additional-user pricing/policy is **not yet approved**; do not invent it.

The onboarding form/session should eventually capture at least:
- business identity and location;
- owner/responsible contact;
- logo/branding;
- phone/contact data;
- timezone;
- privacy information;
- NFC labels/placement;
- inactivity threshold;
- birthday preference;
- WhatsApp consent wording;
- approved offer library for inactive, birthday, VIP/frequent and new-customer cases;
- the owner-selected dashboard users (maximum 2 included).

**Onboarding design is not complete yet. Continue one decision at a time with the CEO before treating the remaining details as final.**

## Development implications already approved

The MVP direction is:
- follow-up queue;
- four opportunity categories;
- WhatsApp click-to-chat with prefilled message;
- optional explicit WhatsApp consent;
- owner-approved offer library;
- no automated Meta API messaging in base scope;
- no CRM integration in base scope;
- one-location base plan with multi-location commercial rules above;
- owner approval gate before activation;
- maximum 2 included dashboard users per base package.

Do not silently implement broader features that change these commercial boundaries.

## Pending items (not yet CEO-final unless already documented elsewhere)

- Complete onboarding questionnaire/workflow design.
- Decide policy/pricing for dashboard users beyond the 2 included users.
- Exact multi-location dashboard UX/data model if code changes are required.
- Exact data export mechanism and 90-day deletion implementation.
- Final contract/SOW language reflecting the new 3-month Smart Tap minimum and cancellation/data rules.
- Production hosting/deployment, SMTP, Auth URLs, privacy/retention implementation and physical NFC testing.

When another agent changes one of these areas, update this note or the current handoff so concurrent agents do not work from stale assumptions.
