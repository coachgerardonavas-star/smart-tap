# Customer screens — branded styles (D-046, D-048)

## D-057 visual system (v2)

The approved visual source is `docs/design/customer-styles-v2/estilos-smart-tap.html`. Both `/b/[slug]` and `/demo/capture` render the same `CustomerCapture` component.

- Registration remains one page. A full-width business photo sits behind a style-specific veil. The logo or initials plus the business-type icon, name, type, tagline, title and three icon benefits appear above an overlapping form card.
- Name, phone, birthday, consent and optional unchecked WhatsApp fields keep their approved copy. The form includes local SVG field icons and a business-type illustration.
- Confirmation shows `Esta es tu visita número N` from the database result. Five stars render with `min(N, 5)` filled. It contains no reward or prize claim.
- The Google button appears only for a configured Google Review URL. `Seguir en Instagram` appears only for a configured validated Instagram URL.
- Business presets live in `src/lib/business-presets.ts`. Admin users can accept or edit the suggested style, tagline, benefits, photo and accent color.
- Stock photos live under `public/stock/<tipo>/`; their authors, sources and Unsplash License are recorded in `public/stock/ATTRIBUTION.md`.
- The hero uses explicit dimensions, responsive `sizes` and high fetch priority. The photo veil maintains text contrast, controls expose visible focus, and reduced-motion preferences disable motion.

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
