# Customer screens — branded styles (D-046, D-048)

Approved by the CEO on 2026-10-04. Visual reference: `docs/design/customer-styles/*.dc.html` (one file per style, three 390×844 screens each: welcome, form, confirmation). Open them in a browser or read the inline styles; colors, fonts, radii and copy are exact. The canvas lives at https://claude.ai/artifact/QrgcmaDNQzYy7MU3RCPpH8 (private to the CEO).

## Decision

- Four styles, all kept: `elegante` (dark, serif, gold), `calido` (corn ground, achiote red, rounded), `moderno` (black/white, uppercase Archivo, one accent), `colorido` (pink/yellow/teal, Baloo 2, rounded).
- **Welcome and form are ONE screen** (not two as in the reference files): compact branded hero (photo or color block, logo, name, tagline, three short benefits) followed directly by the form. No extra tap before the form.
- After a successful check-in the same page swaps to the confirmation ("¡Listo!", "Tu visita quedó registrada", "Gracias por venir. La próxima vez solo toca la tarjeta otra vez.") with a "Déjanos una reseña en Google" link only when the business has `google_review_url`.

## Data (one migration, not applied by the Builder)

On `public.businesses`:
- `theme text not null default 'calido' check (theme in ('elegante','calido','moderno','colorido'))`.
- `tagline text` (≤ 80 chars, optional).
- `benefits text[]` — exactly 3 items of ≤ 40 chars when set; null uses the defaults: "Ofertas para clientes", "Sorpresas en tu cumpleaños", "Te reconocemos al volver".
- `hero_image_url text` (optional, `https://` only, ≤ 500 chars).
- Existing `primary_color` is the style's accent; existing `logo_url` is the logo (fallback: initials of `display_name`).

Admin: style selector plus the three new fields in `/admin/[id]`; changes go through the existing `business.updated` audit with `changedFields`. Owner approval (D-040) keeps its current required fields; the new ones are optional.

## Rules every style must keep

- Approved copy verbatim (privacy/consent with "Tengo 13 años o más.", WhatsApp text, birthday hint). WhatsApp box unchecked and optional (D-042). No SMS, no visit-reward counter, no social links.
- At 390×844 the Nombre label and input are visible without scrolling: hero ≤ 360 px tall on mobile.
- Contrast ≥ 4.5:1 for body text and button labels. The accent is editable, so the text color on accent buttons is computed (dark or white by relative luminance), never hard-coded.
- Fonts are self-hosted (the CSP blocks Google Fonts): `@fontsource` packages or woff2 files under `public/`, latin subset, `font-display: swap`, and only the two families of the business's style are loaded on that page.
- Hero image: rendered with explicit width/height, `object-fit: cover`, and a solid color block when absent. Do not widen the CSP.
- Real `<label>`/`<input>`/`<button>`, touch targets ≥ 44 px, no emoji, icons as inline stroke SVG.
- Desktop: hero and form side by side (existing two-column layout), same styles.
- `/demo/capture` uses the same component with Café Luna data and a selectable style for sales demos.
