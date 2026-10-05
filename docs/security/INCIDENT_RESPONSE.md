# Smart Tap — Respuesta a incidentes (GS-54)

Adoptado el 2026-10-05 por decisión del CEO. Quien decide: **Gerardo Navas, CEO**. Canal de aviso: **Telegram interno** (chat `8348522203`), el mismo que usa el Worker `health-check`. Este documento no inventa plazos legales: la obligación de avisar a negocios o personas afectadas se revisa caso por caso con el abogado (ver paso 6).

## 1. Qué cuenta como incidente

| Severidad | Ejemplos | Primera respuesta |
|---|---|---|
| CRÍTICO | Datos de clientes de un negocio visibles para otro; clave secreta de Supabase (`SUPABASE_SECRET_KEY`) expuesta; acceso de un tercero al panel de administración | Contener en menos de 1 hora |
| ALTO | Cuenta de un dueño usada por otra persona; contraseña o factor MFA comprometido; ataque de bots que llena la base de registros falsos | Contener el mismo día |
| MEDIO | Servicio caído (alerta de `health-check`); correo de invitación o recuperación que no llega | Revisar el mismo día |
| BAJO | Intento fallido sin acceso; aviso de dependencia vulnerable | Próxima revisión semanal |

## 2. Contener (lo primero, antes de investigar)

Elegir el paso más pequeño que detenga el daño:

1. **Un negocio afectado:** en `/admin/[id]`, pausar el negocio. El panel y la tarjeta dejan de funcionar al instante; los datos se conservan (GS-31, verificado en vivo).
2. **Una tarjeta copiada o abusada:** en `/admin/[id]`, desactivar esa etiqueta NFC. Los registros con ese código se rechazan.
3. **Un usuario comprometido:** en `/admin/[id]`, pausar al miembro. En Supabase → Authentication → Users → usuario → **Sign out user** para cerrar todas sus sesiones, y reiniciar su factor MFA si aplica.
4. **Clave secreta expuesta:** en Supabase → Project Settings → API Keys, crear una clave secreta nueva y revocar la expuesta. El CEO pega la nueva en Render → `smart-tap` → Environment (nunca un agente). Render redespliega.
5. **Todo el servicio:** Render → `smart-tap` → Settings → **Suspend service**. Las tarjetas muestran error hasta reactivarlo. Usar solo si 1–4 no alcanzan.

## 3. Preservar evidencia

Antes de borrar o corregir nada:

- Exportar la tabla `audit_log` del periodo afectado (Claude Code puede hacerlo con lectura SQL; el resultado se guarda fuera del repositorio porque puede contener identificadores).
- Guardar los logs de Render (Logs → rango de fechas) y de Supabase (Logs → Auth y API).
- Anotar hora de detección, quién lo detectó y qué se vio.

## 4. Recuperar

- Corregir la causa con un PR revisado (nunca directo a `main`).
- Si se perdieron o alteraron datos: restaurar desde el backup diario de Supabase Pro en un proyecto aislado, comparar y copiar solo lo necesario (GS-25).
- Reactivar lo pausado en orden inverso al paso 2 y confirmar con `docs/PRODUCTION_SMOKE_TEST.md`.

## 5. Registrar

Agregar una entrada en `docs/DECISIONS.md` con: fecha, severidad, qué pasó, qué datos y negocios se afectaron, cómo se contuvo, causa raíz, corrección y la prueba de regresión que la cubre (GS-56).

## 6. Comunicar

- El CEO decide a quién avisar y con qué texto, con revisión del abogado cuando haya datos personales de clientes involucrados.
- Florida (s. 501.171, F.S.) y otras normas pueden exigir aviso dentro de plazos específicos cuando hay acceso no autorizado a cierta información personal. Smart Tap guarda nombre, teléfono y cumpleaños; **si esos datos entran en la definición legal se confirma con el abogado en cada caso**, no se presume.
- **Compromiso contractual vigente:** Términos de servicio, punto 12: si un incidente afecta los datos de un negocio, se le avisa **sin demora indebida** con lo que se sepa en ese momento. Ese aviso al negocio no espera a tener la investigación completa.

## 7. Accesos que necesita quien responde

| Acción | Cuenta |
|---|---|
| Pausar negocio, etiqueta o miembro | Administrador de plataforma de Smart Tap (con MFA) |
| Cerrar sesiones, rotar claves, ver logs, restaurar backup | Supabase, organización "Smart Tap Produccion" |
| Suspender el servicio, ver logs, cambiar variables | Render |
| DNS, proxy, reglas de bloqueo | Cloudflare |
| Revertir código | GitHub, repositorio `smart-tap` |

Todas con verificación en dos pasos activa (GS-53).
