# Smart Tap

Plataforma multi-tenant de Automate IT para captar clientes y registrar visitas desde NFC.

## Estado actual

El estado corto y canónico del proyecto está en `docs/CURRENT_STATE.md`. La evidencia de producción y seguridad está en `docs/VERIFICATION.md` y `docs/security/CONTROL_MATRIX.md`.

## Inicio local

1. Copia `.env.example` a `.env` y completa las variables requeridas para un proyecto Supabase de desarrollo/prueba.
2. Sigue `docs/SETUP.md` para aplicar las migraciones actuales en el orden documentado. No uses nombres históricos de migraciones ni `db push` contra producción.
3. Crea el usuario administrador según `ADMIN_BOOTSTRAP_EMAIL` y la configuración de Auth descrita en `docs/SETUP.md`.
4. Ejecuta `npm ci` y `npm run dev`.

## Producción

La aplicación productiva usa un proyecto Supabase Pro separado del proyecto de prueba. No apuntes entornos locales o pruebas destructivas al proyecto productivo. Los cambios llegan a `main` únicamente mediante PR con `verify` verde y revisión independiente.
