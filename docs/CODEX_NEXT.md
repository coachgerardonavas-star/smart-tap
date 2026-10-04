# Next Builder task — onboarding configuration

Owner: ChatGPT Codex. Reviewer: Claude Code. Updated 2026-10-04.

## Next task — finish PR #3

On branch `codex/onboarding-config` (PR #3), after `git pull --ff-only`:

1. NFC page (`src/pages/b/[slug].astro`, `src/pages/demo/capture.astro`, `src/components/CheckInForm.tsx`):
   - WhatsApp box stays optional and unchecked (D-042); label leads with the benefit: "Recibe ofertas y sorpresas de cumpleaños de {negocio} por WhatsApp. Puedes pedir que paren cuando quieras." No concrete gift promised.
   - At 390x844 the Nombre field is visible without scrolling: compact the header (logo, greeting, business name) on mobile only; desktop unchanged.
   - Attach 390x844 before/after screenshots to the PR.
2. `/api/admin/business/[id]/update`: add `details.changedFields` (field names only, no values) to the `business.updated` audit row.
3. Live smoke on the hosted test project of the admin screens: create a business, invite 2 users (third rejected), fill offers and Google Review URL, register owner approval, activate, check a WhatsApp suggestion includes the offer. Delete everything afterwards; keep Café Luna and the admin.
4. No new migration expected. If one is needed, do not apply it.

## Report for Claude Code

One single code block, no keys:

```
REPORTE PARA CLAUDE CODE — SMART TAP
Ramas subidas: rama — último commit — qué contiene
Trabajo desde f08ff95 (por tema): qué cambió, archivos principales
Merge de claude/mfa-review: limpio / conflictos (cuáles y cómo)
Follow-up Queue: secciones 1-8 de FOLLOW_UP_QUEUE.md — hecho / parcial / no, con archivos
Migración nueva: nombre del archivo (no aplicada)
npm run verify: diagnósticos / aprobadas de total | CI PR #1: verde/rojo
Cambios en Supabase hechos por ti o el CEO
Prueba local o en vivo: pasos — PASÓ/FALLÓ/BLOQUEADO — evidencia
Defectos encontrados y corregidos: archivo — síntoma — prueba
Decisiones nuevas (D-xxx)
Matriz Glasswing: controles que cambiaron
Pendientes y bloqueos
Preguntas para el Reviewer
```
