# Estilos v2 (D-057) — Brief para el Builder

Aprobado por el CEO el 2026-10-05. Diseño de referencia: `estilos-smart-tap.html` y `estilos-smart-tap-preview.png` en esta misma carpeta. Replicar los 4 estilos (elegante, calido, moderno, colorido) en `/b/[slug]` y `/demo/capture`.

## 1. Pantalla de registro (sigue siendo UNA pantalla, D-048)
- Hero con la foto del negocio a pantalla completa como fondo, con el velo/degradado del diseño.
- Logo; si no hay logo, iniciales + ícono del tipo de negocio.
- Nombre, subtítulo y lema en la tipografía manuscrita del estilo.
- Título y 3 beneficios con íconos en círculos.
- Formulario en tarjeta superpuesta al hero, con íconos en los campos y la ilustración inferior del estilo.
- Textos de consentimiento, cumpleaños y WhatsApp EXACTAMENTE iguales a los actuales. WhatsApp sigue opcional y desmarcado.
- No cambiar la lógica de Turnstile (render explícito, PR #10); solo se puede reubicar visualmente.

## 2. Confirmación
- Contador real: "Esta es tu visita número N", con `visitCount` que ya devuelve `record_public_check_in`. 5 estrellas con min(N,5) llenas.
- PROHIBIDO mencionar recompensas, premios o "acumula X para obtener". Smart Tap solo cuenta visitas.
- Botón de reseña en Google si hay `google_review_url`. Botón "Seguir en Instagram" solo si hay `instagram_url`.

## 3. Presets por tipo de negocio
- Nuevo campo `business_type`: restaurante, food_truck, cafe, panaderia, heladeria, barberia, salon, otro.
- Por tipo: ícono, estilo sugerido, lema sugerido, 3 beneficios sugeridos y días de inactividad sugeridos (barberia 35; food_truck, cafe y panaderia 14; restaurante y heladeria 21; resto 30). El admin los rellena al elegir el tipo y se pueden editar.
- Biblioteca de fotos: 3 fotos por tipo en `public/stock/<tipo>/*.webp` (máx. 1200 px de ancho, < 200 KB). Solo licencia libre para uso comercial (Unsplash License). Registrar autor, URL y licencia en `public/stock/ATTRIBUTION.md`. Si el entorno no permite descargarlas, decirlo en el reporte y dejar la estructura lista; nunca inventar atribuciones.
- En el admin: selector visual de foto de biblioteca o URL propia.
- Colores: 4 colores probados por estilo, tomados del diseño; el admin elige entre ellos. El texto de los botones usa el cálculo de contraste existente (≥ 4.5:1).

## 4. Datos (migración nueva en `supabase/migrations/`; NO aplicarla)
- `businesses.business_type text` con CHECK de la lista.
- `businesses.instagram_url text` con CHECK: solo `https://www.instagram.com/<usuario>`, usuario `[A-Za-z0-9._]{1,30}`.
- Ampliar el CHECK de `hero_image_url` para aceptar también `^/stock/[a-z_]+/[a-z0-9-]+\.webp$`.
- Validación Zod equivalente en `src/lib/validation.ts` y auditoría de cambios igual que hoy.

## 5. Restricciones
- Sin hosts externos nuevos: fuentes con @fontsource locales; imágenes locales o HTTPS como hoy. La CSP de `src/middleware.ts` no se amplía.
- Hero con `fetchpriority="high"` y tamaños adecuados.
- Contraste ≥ 4.5:1 sobre la foto, foco visible, `prefers-reduced-motion`.

## 6. Pruebas y evidencia
- Pruebas: contador (1, 3, 5, 9), ausencia de texto de recompensas, Instagram con y sin URL, fallback de logo, CHECKs de la migración en PGlite (válidos e inválidos), presets por tipo, validación de URLs.
- Capturas 390x844 de registro y confirmación de los 4 estilos en `docs/evidence/` (Chromium preinstalado; Playwright sin descargar navegadores).

## 7. Documentación
Actualizar `CUSTOMER_SCREENS.md`, `DECISIONS.md` (D-057), `CONTROL_MATRIX.md` (GS-08, GS-47), `CURRENT_STATE.md` y `HANDOFF.md`.
