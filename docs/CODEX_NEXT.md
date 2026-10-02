# Next Builder task — live smoke test + admin MFA

Owner: ChatGPT Codex (Builder). Reviewer: Claude Code. Written 2026-10-02 by Claude Code.

## Start

```powershell
cd C:\automate-it\smart-tap
git fetch origin
git checkout -b codex/live-smoke-mfa origin/claude/review-hardening
npm ci
npm run verify
```

Expected: 0 diagnostics, all tests pass. Read `AGENTS.md`, `docs/HANDOFF.md`, `docs/DECISIONS.md` (D-013 to D-018), `docs/security/CONTROL_MATRIX.md`. Do not repeat checks the matrix marks verified unless you change related code.

## Hosted Supabase (already prepared — do not re-apply migrations or seed)

- Project `smart-tap`, ref `vrouyhxzxrfkuuqfslrc`, URL `https://vrouyhxzxrfkuuqfslrc.supabase.co`
- Publishable key: `sb_publishable_mpGwTyS-Y5UmSIZ9mBOAKQ_wD5b0DpQ`
- Applied: all three migrations (the second without its `drop function` line; the old 8-argument function has no grants) and `supabase/seed.sql`.
- A new migration you write is applied by the CEO in the SQL Editor; give him the exact file and wait for confirmation.

## Secrets rule

Never ask the CEO to paste a key into the chat. Create `.env` with `SUPABASE_SECRET_KEY=PEGAR_AQUI`; he pastes it into the file. Confirm only that the line no longer reads `PEGAR_AQUI` and starts with `sb_secret_`. Never print the value. Run `git check-ignore .env` before every commit.

`.env`:

```
PUBLIC_SUPABASE_URL=https://vrouyhxzxrfkuuqfslrc.supabase.co
PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_mpGwTyS-Y5UmSIZ9mBOAKQ_wD5b0DpQ
SUPABASE_SECRET_KEY=PEGAR_AQUI
PUBLIC_SITE_URL=http://localhost:4321
CHECK_IN_HASH_SECRET=<48+ random characters you generate>
ADMIN_BOOTSTRAP_EMAIL=automateit@yourbizupgraded.com
TRUSTED_IP_HEADER=
```

## One message to the CEO (Spanish, numbered, exact)

In `https://supabase.com/dashboard/project/vrouyhxzxrfkuuqfslrc`:

1. Project Settings → API Keys → copy the secret key (create one if none) → paste it into `.env` in Notepad → save.
2. Authentication → Sign In / Providers: disable new user signups; keep email confirmation on.
3. Authentication → URL Configuration: Site URL `http://localhost:4321`; add redirect `http://localhost:4321/auth/callback`.
4. Authentication → Emails → Templates: "Invite user" = `supabase/templates/invite.html`; "Reset password" = `supabase/templates/recovery.html` (give him both contents ready to copy).
5. Minimum password length 12, if offered.
6. Authentication → Multi-Factor: TOTP enabled.
7. Authentication → Users → Add user → Create new user: `automateit@yourbizupgraded.com`, his own password, "Auto Confirm User" on.
8. MFA on his own Supabase dashboard account (GS-53).
9. Tell you a second real email of his for the viewer test.

He replies "listo" plus that email. If a menu differs, ask what he sees and guide him.

## Build: MFA for platform_admin (GS-03, HIGH)

- `/admin/mfa`: enroll TOTP (`supabase.auth.mfa.enroll`), show QR, verify (challenge + verify).
- Every `/admin` page and `/api/admin` route requires `aal2` read from the verified session on the server, never from client input. Admin in `aal1` with a factor → verification step; without a factor → `/admin/mfa`. `/api/admin` returns 403 without `aal2`.
- Owners, managers, viewers: MFA optional in this phase.
- Tests: an `aal1` platform_admin gets 403 on `/api/admin` and a redirect on `/admin`.
- Record a decision in `docs/DECISIONS.md`; update GS-03 and GS-57 in the matrix.

## Live smoke test

`npm run build`, then `node dist/server/entry.mjs` with the variables loaded into the PowerShell process environment (not only `.env`) to prove runtime reading. In `http://localhost:4321`:

1. Admin login → enroll MFA (CEO scans QR) → `/admin` only after `aal2`; blocked without it.
2. Create business `review-live`.
3. NFC URL: register a fictitious customer; repeat same phone → "visita de hoy ya registrada", count unchanged.
4. `/dashboard?business=review-live`: customer, visits, birthdays.
5. Pause NFC → "Este NFC no está activo"; reactivate.
6. Invite the CEO's second email as viewer; he accepts and sets a password. Viewer cannot see Café Luna, has no Delete button, cannot open `/admin`.
7. Pause the viewer → loses access.
8. Password recovery end to end with the viewer.
9. As admin, delete the test customer → visits and consents gone.

Tell the CEO exactly what to click whenever an email, QR or link is involved, and wait. Supabase default SMTP sends few emails per hour; if limited, say so and wait. Do not configure SMTP without approval.

## Cleanup

Delete `review-live` and its data and the viewer user. Keep Café Luna and the admin. Ask the CEO to run in SQL Editor (optional):
`drop function public.record_public_check_in(text, text, text, text, date, text, text, text);`

## Close

- Any defect: fix, add a regression test (GS-56), rerun only affected checks.
- Update `docs/security/CONTROL_MATRIX.md`, `docs/VERIFICATION.md` ("Live smoke test"), `docs/HANDOFF.md`.
- `npm run verify` green; `git check-ignore .env`.
- Push `codex/live-smoke-mfa`, open a PR to `main` titled "Smart Tap: review hardening, admin MFA, live smoke test" (gh if available, else give the CEO the link). Wait for `verify` green; fix if red. Do not merge.
- Guide the CEO to enable branch protection on `main` (require PR + `verify` check).

## Limits

No production deploy, no hosting choice (D-009). No WhatsApp, CRM, campaigns, POS, payments, reservations, AI, Wallet or integrations. Never claim an unexecuted step; mark it BLOQUEADO with the cause.

## Report for Claude Code

One single code block, no keys, this exact format:

```
REPORTE PARA CLAUDE CODE — SMART TAP
Rama: codex/live-smoke-mfa | Commit: <hash> | PR: <n y URL> | CI verify: verde/rojo | Árbol limpio: sí/no
npm run verify: <diagnósticos> / <aprobadas de total>
Runtime env confirmado: sí/no — cómo
Config Supabase por el CEO (pasos 1-8): sí/no cada uno
MFA platform_admin: archivos — cómo se exige aal2 — pruebas — probado en vivo sí/no
Prueba en vivo (1-9): PASÓ/FALLÓ/BLOQUEADO — evidencia
Defectos: archivo:línea — síntoma — corrección — prueba
Decisiones nuevas (D-xxx):
Matriz Glasswing: controles que cambiaron de estado
Función vieja eliminada: sí/no | Protección de rama: sí/no | Datos de prueba eliminados: sí/no
Pendientes y bloqueos:
Preguntas para el Reviewer:
```
