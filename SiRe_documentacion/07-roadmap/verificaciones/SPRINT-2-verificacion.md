# Sprint 2 — Verificación de cierre (activos e identificación)

**Fecha:** 2026-07-17

## Entregables

| Ítem | Estado | Evidencia |
|---|---|---|
| CRUD de activos (API) | ✅ | `app/Controllers/Activos.php`, `ActivoModel` |
| Código `CAT-ORG-###` a prueba de concurrencia | ✅ | `Services/Activos/GeneradorCodigo` (SELECT … FOR UPDATE) |
| Alta atómica (código + activo + movimiento 'alta') | ✅ | `Services/Activos/CrearActivoService` |
| Bitácora append-only | ✅ | `MovimientoModel::registrar` (sin update/delete) |
| Listado con búsqueda `?q=` y filtros, sin N+1 | ✅ | `Activos::index` (una consulta paginada) |
| Precondiciones de estado (baja/mantenimiento) | ✅ | `Activos::baja` / `::mantenimiento` (409) |
| QR (endroid) + etiqueta imprimible PDF (mPDF) | ✅ | `Services/Activos/GeneradorQr`, `EtiquetaPdf`; `Activos::etiqueta` |
| Factura → Firebase Storage + URL firmada | ✅ | `Storage/ArchivoStorage` (+ `FirebaseStorage`), `GuardarFacturaService` |
| Frontend: lista con filtros, ficha+historial, alta/edición, etiqueta | ✅ | `apps/web/src/pages/Activos*.tsx` |

## Pruebas (gate)

**Backend — PHPUnit: 39/39 verdes, 112 aserciones** (27 previas + 12 de Sprint 2). Cubre:
- Alta con código `CMP-AVZ-001` + movimiento 'alta'.
- **Correlativos sin colisión**: 5 altas consecutivas → `001…005`, todos únicos, `secuencias_codigo.ultimo = 5`.
- RBAC: Custodio no crea (403), sí lista (200).
- Filtros por estado; ficha con historial.
- Precondiciones: baja bloqueada si asignado (409); mantenimiento ida/vuelta con 409 al repetir.
- Etiqueta devuelve PDF; factura: URL firmada con Storage (doble), 404 sin factura, Custodio sin acceso (403); `GuardarFacturaService` sube y actualiza la referencia.

**Frontend — Vitest: 26/26 verdes** (incluye lista de activos: filas, estados, RBAC del botón de alta, estado vacío).

**E2E real (backend + token de Google):**
- `POST /activos` → `CMP-AVZ-003` (correlativo real), `estado: disponible`, `qr_url` deep-link.
- `GET /activos/{id}` → ficha + historial `['alta']`.
- `GET /activos/{id}/etiqueta` → `%PDF-1.4` **limpio** (verificado en servidor real).

## Notas

- **Concurrencia del código:** garantizada por `SELECT … FOR UPDATE` sobre `secuencias_codigo` dentro de la transacción de alta (regla 6). El gate verifica la corrección del contador con altas repetidas sin colisión; la exclusión mutua real entre procesos la provee el bloqueo de fila de InnoDB.
- **Fix de infraestructura:** se desactivó el DebugToolbar en `apps/api` (es una API REST); negociaba por `Accept` y corrompía respuestas binarias (PDF) en dev.
