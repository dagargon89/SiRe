# Sprint 3 — Verificación de cierre (resguardos y bitácora)

**Fecha:** 2026-07-17

## Entregables

| Ítem | Estado | Evidencia |
|---|---|---|
| Asignar / revocar / transferir (atómicos) | ✅ | `Services/Resguardos/ResguardoService` (transacción + FOR UPDATE) |
| Precondiciones de estado (anti-TOCTOU) | ✅ | relee activo con bloqueo; 409 si no aplica |
| Bitácora inmutable (un movimiento por operación) | ✅ | `MovimientoModel::registrar` (sin update/delete) |
| Asignación vigente en la ficha | ✅ | `Activos::show` → `asignacion_vigente` (contrato actualizado) |
| Carta responsiva PDF | ✅ | `Services/Resguardos/CartaResponsiva`; `Usuarios::carta` (PII) |
| Controlador de asignaciones + rutas | ✅ | `app/Controllers/Asignaciones.php` |
| Frontend: acciones en la ficha + carta | ✅ | `ActivoFicha.tsx` (asignar/revocar/transferir), `Perfil`/`Usuarios` (carta) |

## Pruebas (gate)

**Backend — PHPUnit: 47/47 verdes, 137 aserciones** (39 previas + 8 de Sprint 3). Matriz de estados cubierta:
- Asignar disponible → 201 (activo `asignado` + movimiento `asignacion`).
- Asignar no disponible → 409 `activo_no_disponible`.
- Revocar vigente → 200 (activo `disponible` + movimiento `revocacion`).
- Revocar ya revocada → 409 `ya_revocada`.
- Transferir asignado → 201 (revoca la vigente + crea nueva, activo sigue `asignado`, movimiento `transferencia`).
- Transferir no asignado → 409 `activo_no_asignado`.
- RBAC: Custodio no asigna (403).
- Carta: Admin ve la de cualquiera (PDF); Custodio no ve la ajena (403) pero sí la propia (200).

**Frontend — Vitest: 26/26 verdes**; build limpio.

**E2E real (backend + token de Google):**
- Alta → asignar (usuario 2) → transferir (usuario 3): historial `['alta','asignacion','transferencia']`, activo `asignado`.
- `GET /usuarios/3/carta` → `%PDF-1.4` limpio.

## Gobernanza

Se extendió el contrato `obtenerActivo` con `asignacion_vigente: Asignacion | null` (necesario para revocar/transferir desde la UI). Sincronizado en la misma sesión: `apps/web/src/lib/api.ts` y `05-api/05_especificacion_api.md §4`.
