# Smart Tap

Plataforma multi-tenant para captar clientes y registrar visitas desde NFC.

## Inicio local

1. Copia `.env.example` a `.env` y completa las claves de Supabase.
2. Aplica `supabase/migrations/20261001000000_initial_schema.sql` en un proyecto Supabase.
3. Crea el primer usuario en Supabase Auth con el correo indicado en `ADMIN_BOOTSTRAP_EMAIL`.
4. Ejecuta `npm install` y `npm run dev`.

La guía completa está en `docs/SETUP.md`.
