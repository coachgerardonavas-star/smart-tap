# Next Builder task — customer privacy notice

Owner: ChatGPT Codex. Reviewer: Claude Code. Updated 2026-10-04.

## Next task — privacy notice (D-044)

Base: `origin/claude/launch-prep` (contains main after PR #3, SMTP evidence, `docs/PRIVACY_NOTICE.md` and D-044). Create `codex/privacy-notice` from it and open one PR to `main`.

Implement items 1–7 of the "Implementation spec" in `docs/PRIVACY_NOTICE.md`. Use the approved text verbatim. One migration file for the new columns, purge function and daily `pg_cron` job (`create extension if not exists pg_cron` if needed) — do not apply it.

Also: the follow-up message keeps the existing BAJA footer; no automatic WhatsApp sending.

## Report for Claude Code

One single code block, no keys:

```
REPORTE PARA CLAUDE CODE — SMART TAP
Ramas subidas: rama — último commit — qué contiene
Trabajo desde la base (por tema): qué cambió, archivos principales
Aviso de privacidad: puntos 1-7 de PRIVACY_NOTICE.md — hecho / parcial / no, con archivos
Migración nueva: nombre del archivo (no aplicada)
npm run verify: diagnósticos / aprobadas de total | CI del PR: verde/rojo
Cambios en Supabase hechos por ti o el CEO
Prueba local o en vivo: pasos — PASÓ/FALLÓ/BLOQUEADO — evidencia
Defectos encontrados y corregidos: archivo — síntoma — prueba
Decisiones nuevas (D-xxx)
Matriz Glasswing: controles que cambiaron
Pendientes y bloqueos
Preguntas para el Reviewer
```
