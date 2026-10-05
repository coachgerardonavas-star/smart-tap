# Next Reviewer task — Terms v2

Owner: Claude Code. Builder: ChatGPT Codex. Updated 2026-10-04.

Review PR #7 from `codex/terms-v2` to `main`. The implementation commit is `a5a7095`; use the current PR head for the documentation close. Review `docs/TERMS_OF_SERVICE.md`, D-049 through D-052, and the Glasswing changes. Apply only `supabase/migrations/20261005001012_terms_v2.sql` to the intended test Supabase project after review. Run the hosted signature, approval, activation, extension and untagged-visit smoke. Do not merge or deploy during the independent review.

```text
REPORTE PARA CLAUDE CODE — SMART TAP
Ramas subidas: codex/terms-v2 — PR #7, implementación a5a7095 más cierre documental — Terms v2 completa
Trabajo desde la base (por tema): base origin/claude/nfc-evidence df7a275; texto aprobado, firma del dueño, plazo y extensiones, visitas sin etiqueta, admin, pruebas, evidencia y docs
Términos v2: 1) texto v2 exacto y versión nueva — hecho en src/lib/terms.ts; 2) firma electrónica del dueño — hecho en /terms/sign, /api/terms/sign y record_terms_signature; 3) term_ends_at y Anexo — hecho en admin y record_term_extension; 4) visitas sin etiqueta — hecho con visits.untagged y record_public_check_in; 5) pruebas y capturas — hecho, 131/131 y dos PNG 390x844
Migración nueva: 20261005001012_terms_v2.sql (no aplicada)
npm run verify: 0 diagnósticos / 131 aprobadas de 131 | CI del PR: verde, run 37244778853
Cambios en Supabase hechos por ti o el CEO: ninguno en esta tarea; no db push; la base live termina en 20261004212542_customer_styles
Prueba local o en vivo: PGlite firma/roles/RLS/activación/plazo/extensión/untagged — PASÓ; /terms/sign y /terms a 390x844 — PASÓ, docs/evidence; prueba live — BLOQUEADA hasta revisión y aplicación de la migración
Defectos encontrados y corregidos: trigger de activación bloqueaba el seed demo — limitado a transiciones false→true; extensión dependía solo del checkbox web — la función SQL ahora exige p_annex_signed=true; firma visible de dueño pausado — admin filtra dueños activos
Decisiones nuevas (D-xxx): D-052 — evidencia de firma v2, plazo inicial, extensión auditada, sin suspensión automática y visitas untagged
Matriz Glasswing: GS-02, GS-05, GS-18, GS-22, GS-34, GS-35, GS-38, GS-45, GS-47, GS-50 y GS-56 actualizados
Pendientes y bloqueos: revisión independiente; aplicar una migración en test; smoke alojado; GS-25 backups y GS-29 proyecto de producción siguen bloqueando datos reales; sin merge y sin deploy
Preguntas para el Reviewer: ¿la firma conserva evidencia suficiente sin exponer PII en audit_log? ¿el trigger cubre toda transición de activación? ¿el flujo untagged mantiene aislamiento y conteo diario? ¿apruebas aplicar la migración al proyecto test?
```
