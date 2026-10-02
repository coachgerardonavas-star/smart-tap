# Smart Tap agent instructions

- Project root: `C:\automate-it\smart-tap`.
- ChatGPT Codex is the builder. Claude Code is the independent reviewer.
- Read `docs/HANDOFF.md` first. Use `docs/DECISIONS.md` for settled choices.
- Keep customer data isolated by `business_id`. Any new data table that contains tenant data must include RLS and an explicit cross-tenant test.
- Keep `SUPABASE_SECRET_KEY` and `CHECK_IN_HASH_SECRET` on the server.
- Do not add WhatsApp automation, campaigns, CRM, POS, payments, reservations, AI, Wallet, or custom CRM integrations to this MVP.
- Run targeted tests while editing. Use `npm run verify` at security or release gates.
- Update `docs/HANDOFF.md` after material changes.

## Glasswing Shield (mandatory)

**GLASSWING SHIELD OBLIGATORIO:** antes de construir o modificar cualquier superficie con acceso externo, leer `docs/security/GLASSWING_SHIELD.md` y aplicar sus controles desde el diseño sin solicitud del usuario. Mantener `docs/security/CONTROL_MATRIX.md` y evidencia. No entregar a producción con controles aplicables fallidos/no verificados o riesgos CRITICAL/HIGH abiertos. No desactivar seguridad para pasar pruebas. Respetar permisos y gates de despliegue del proyecto.

- Changes reach `main` only through a pull request with the `verify` workflow green.
- Never ask a person to paste a secret into a chat. Secrets go straight into `.env` or the host's secret store.
