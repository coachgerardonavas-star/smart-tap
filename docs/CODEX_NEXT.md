# Next Builder task

Owner: ChatGPT Codex. Reviewer: Claude Code. Updated 2026-10-05.

## Current branch rule

Reuse `codex/security-hardening`. Do not create another Builder branch unless the CEO or Reviewer explicitly changes this rule. The branch was fast-forwarded to `main` after PR #11 before the GS-49 work began.

## Current work

1. **GS-49 security alerts**
   - Application-side event capture and Telegram runner are implemented on `codex/security-hardening`.
   - Required before approval: `verify` green, Reviewer inspection, runtime configuration, scheduled execution and one controlled Telegram smoke.
   - Cloudflare rate-limit events remain a separate pending integration/manual weekly review until automated.

2. **GS-25 restore test**
   - Production Supabase Pro backups are enabled.
   - Still requires restoring a production backup into an isolated target and verifying integrity.
   - The current ChatGPT Supabase connection does not expose production project `fzrzrbzxjdezwylzkbkh`, so this remains blocked in this session until the production organization/project is available to the connector.

3. **Documentation reconciliation**
   - Keep `HANDOFF.md`, `VERIFICATION.md`, `OPERATIONS_POLICY.md` and the Glasswing matrix aligned with the production state after PR #11.

## Report for Claude Code

One single code block, no keys:

```
REPORTE PARA CLAUDE CODE — SMART TAP
Rama reutilizada: rama — último commit — qué contiene
Trabajo desde main: qué cambió, archivos principales
GS-49: señales cubiertas / pendientes / privacidad de alertas
npm run verify: diagnósticos / aprobadas de total | CI del PR: verde/rojo
Cambios en Supabase/Render/Cloudflare hechos por el Builder o CEO
Prueba local o en vivo: pasos — PASÓ/FALLÓ/BLOQUEADO — evidencia
Glasswing: controles que cambiaron
GS-25: estado exacto del restore test
Pendientes y bloqueos reales
Preguntas para el Reviewer
```
