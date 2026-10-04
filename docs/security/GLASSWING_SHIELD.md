# Glasswing Shield — reference

- Standard: **Glasswing Shield v1.0**, adopted 2026-10-02 by Gerardo Navas, CEO.
- Owner document: `Glasswing_Shield.md` in the ADN folder of the Automate IT Drive (file id `1A6seKUsVxyDTQ5As10eXfb77VLIhmEqC`). That file is the source of truth; this repository keeps the version reference, not a second copy that could drift (Manual Maestro §7.1).
- Matrix for this project: `docs/security/CONTROL_MATRIX.md`.

## Rule for every agent working in this repository

> **GLASSWING SHIELD OBLIGATORIO:** antes de construir o modificar cualquier superficie con acceso externo, leer este estándar y aplicar sus controles desde el diseño sin solicitud del usuario. Mantener matriz y evidencia. No entregar a producción con controles aplicables fallidos/no verificados o riesgos CRITICAL/HIGH abiertos. No desactivar seguridad para pasar pruebas. Ejecutar trabajo autorizado hasta resolverlo; pedir intervención solo ante bloqueos reales. Respetar permisos y gates de despliegue del proyecto.

Allowed states: PENDIENTE · IMPLEMENTADO NO VERIFICADO · VERIFICADO LOCALMENTE · VERIFICADO EN EL ENTORNO OBJETIVO · BLOQUEADO · NO APLICA JUSTIFICADO. "No verificado no significa seguro."
