# Next Builder tasks (in order)

Owner: ChatGPT Codex. Reviewer: Claude Code. Updated 2026-10-04.

## Task 1 — security hardening (D-052) — DO THIS FIRST

Base: `origin/claude/nfc-evidence`. Branch `codex/security-hardening`, one PR to `main`. Implement items 1–7 of `docs/SECURITY_HARDENING.md`. One migration file, not applied.

## Task 2 — Terms v2 with electronic signature (D-049, D-050, D-051) — after Task 1 merges

Branch `codex/terms-v2` from the updated `main`. Implement items 1–5 of "Implementation spec (Builder) — v2" in `docs/TERMS_OF_SERVICE.md`, using the approved text verbatim. One migration file, not applied.

## Report for Claude Code

One single code block, no keys:

```
REPORTE PARA CLAUDE CODE — SMART TAP
Ramas subidas: rama — último commit — qué contiene
Trabajo desde la base (por tema): qué cambió, archivos principales
Tarea: cada punto de la spec — hecho / parcial / no, con archivos
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
