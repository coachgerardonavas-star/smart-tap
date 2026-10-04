# Next Builder task — sync, then Follow-up Queue

Owner: ChatGPT Codex. Reviewer: Claude Code. Updated 2026-10-04.

## Part A — sync (first, before any new code)

1. `git status --short --branch`; commit anything pending (never `.env`; check `git check-ignore .env`).
2. Push every local branch you touched.
3. `git fetch origin`; on `codex/live-smoke-mfa`: `git merge origin/claude/mfa-review`.
   - It already contains the MFA bypass fixes (D-020), the ops reconciliation and these docs.
   - `supabase/migrations/` holds the six live migration names. Do not restore old names. Do not merge `ops/reconcile-live-2026-10-03` separately.
   - If your code calls `assertBusinessAccess(userId, …)`, change it to `assertBusinessAccess(identity, …)`.
4. `npm ci`, `npm run verify` (baseline 0 diagnostics, 41 tests), push, PR #1 `verify` green.

## Part B — Follow-up Queue (D-021)

Implement exactly `docs/FOLLOW_UP_QUEUE.md`, sections 1–8, on the same branch and PR. Smallest change that meets it: reuse the existing dashboard, auth guards and check-in function pattern.

- One new migration file. **Do not apply it to live Supabase** and do not run `db push`; the Reviewer applies it after review.
- No Meta API, no automatic sending, no message scheduler, no CRM.
- Glasswing Shield: update `docs/security/CONTROL_MATRIX.md` for the new route and data.

## Live Supabase facts

Project `vrouyhxzxrfkuuqfslrc`. Six migrations applied plus the seed. Admin `automateit@yourbizupgraded.com` exists, confirmed, with one MFA factor. Never paste keys anywhere; `.env` uses `SUPABASE_SECRET_KEY=PEGAR_AQUI` for the CEO to fill in.

## Close every session

Commit, push, PR `verify` green, update `docs/HANDOFF.md`, and give the CEO the report below. Do not merge to `main`. No deploy.

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
