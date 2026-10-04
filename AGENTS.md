# Smart Tap agent instructions

- Project root: `C:\automate-it\smart-tap`.
- ChatGPT Codex is the builder. Claude Code is the independent reviewer.
- Read `docs/HANDOFF.md` first. Use `docs/DECISIONS.md` for settled choices.
- Keep customer data isolated by `business_id`. Any new data table that contains tenant data must include RLS and an explicit cross-tenant test.
- Keep `SUPABASE_SECRET_KEY` and `CHECK_IN_HASH_SECRET` on the server.
- Do not add automated WhatsApp sending (Meta API, templates, webhooks), campaigns, CRM, POS, payments, reservations, AI, Wallet, or custom CRM integrations to this MVP. The owner-sent `wa.me` link of D-023 is in scope.
- Run targeted tests while editing. Use `npm run verify` at security or release gates.
- Update `docs/HANDOFF.md` after material changes.

## Glasswing Shield (mandatory)

**GLASSWING SHIELD OBLIGATORIO:** antes de construir o modificar cualquier superficie con acceso externo, leer `docs/security/GLASSWING_SHIELD.md` y aplicar sus controles desde el diseño sin solicitud del usuario. Mantener `docs/security/CONTROL_MATRIX.md` y evidencia. No entregar a producción con controles aplicables fallidos/no verificados o riesgos CRITICAL/HIGH abiertos. No desactivar seguridad para pasar pruebas. Respetar permisos y gates de despliegue del proyecto.

- Changes reach `main` only through a pull request with the `verify` workflow green.
- Never ask a person to paste a secret into a chat. Secrets go straight into `.env` or the host's secret store.

## Standing rule — sync with the Reviewer (Builder)

Claude Code reviews only what is on GitHub. At the end of every work session, iteration or /goal, without being asked:

1. Commit all work (never `.env`) and push every branch you touched.
2. Keep the open PR updated and its `verify` check green.
3. Update `docs/HANDOFF.md`.
4. Give the CEO the "REPORTE PARA CLAUDE CODE" in one single code block (format in `docs/CODEX_NEXT.md`), covering everything since the last report.

Do not wait for the CEO to ask. Work that exists only on the local machine counts as not delivered.
