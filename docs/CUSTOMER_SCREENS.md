# Customer screens — branded styles (D-046, D-048, D-057)

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

## Styles v2 (D-057, 2026-10-06)

Supersedes the visual details above where they differ; the rules above still apply unless changed here. Design: `docs/design/customer-styles-v2/` on `claude/design-v2`.

- **Registration (one screen).** Full-width business photo with the style's veil; logo or initials plus the business-type icon; business name; type label as subtitle; tagline in the style's script face; title; three benefits with circled icons; form card over the hero with icons in Nombre, Teléfono and cumpleaños; bottom illustration in elegante and cálido. Consent, birthday and WhatsApp copy unchanged; WhatsApp unchecked and optional. Turnstile logic unchanged (explicit render, PR #10).
- **Mobile layout.** The 360 px hero limit is replaced by the D-057 full photo hero. At 390×844 the Nombre input still ends inside the first viewport: 641 px (elegante), 604 px (cálido), 667 px (moderno), 601 px (colorido), measured under the 48 px demo bar. No horizontal scroll.
- **Confirmation.** "¡Listo!", "Tu visita quedó registrada", "Esta es tu visita número N" with five stars (min(N, 5) filled), "Gracias por venir. La próxima vez solo toca la tarjeta otra vez.", Google review button when configured, "Seguir en Instagram" only with `instagram_url`, and a per-style farewell. No rewards, prizes or accumulation copy. The counter appears only when the server returns `visitCount` (see D-057 on the name check).
- **Fonts per style.** elegante: Cormorant Garamond, Jost, Great Vibes. cálido: Fraunces, Nunito, Caveat. moderno: Archivo, IBM Plex Sans. colorido: Baloo 2, Nunito. Only the selected style's faces are declared on a page.
- **Accent colors.** Four per style; the admin chooses one. elegante `#C9A45C #1E2A3A #B28B42 #9C7B3E`; cálido `#C8412A #E59A55 #3B2316 #8A6A55`; moderno `#FF6A2B #FFD23F #2EC4B6 #FF6F9E`; colorido `#3A1240 #FF6F9E #2EC4B6 #FFD23F`. Button text is black or white by relative luminance (≥ 4.5:1). When an accent is too light for its background, the button keeps a dark 1.5 px edge.
- **Data.** `business_type` has 8 values: restaurante, cafe, panaderia, barberia, salon, heladeria, tienda and gimnasio. A null legacy value uses the café presentation. `instagram_url` accepts `https://www.instagram.com/<usuario>` with usuario `[A-Za-z0-9._]{1,30}`. `hero_image_url` also accepts `/stock/<type>/<name>.webp`. Admin edits all three; changes go through `business.updated` with `changedFields`.
- **Presets by type.** Style, tagline, three benefits, inactivity days, first library photo and first palette color are filled when the admin changes the type. Values remain editable.
- **Photo library.** `public/stock/<type>/<type>-{1,2,3}.webp`, ≤ 1200 px wide and < 200 KB; credits and license in `public/stock/ATTRIBUTION.md`. The admin can pick a library photo, an own HTTPS URL or no photo.
- **Performance.** The hero `<img>` has explicit size and `fetchpriority="high"`; React also emits a matching image preload.
- **Accessibility.** Text ≥ 4.5:1 against a white photo under the lightest veil stop; field borders ≥ 3:1; visible focus; animations only under `prefers-reduced-motion: no-preference`.
- **Evidence.** `docs/evidence/customer-v2-<style>-form-390x844.png`, `customer-v2-<style>-confirmation-390x844.png` and `customer-v2-elegante-form-1440x900.png`, produced by `npm run evidence:customer-styles` against `/demo/capture?theme=<style>&type=<type>&visitas=3`.
- `/demo/capture` accepts `type`, `theme` and `visitas` (1–999) and uses fictional business names; nothing is stored.
