# Sprint 5 — Verificación de cierre (dashboard, reportes y carta final)

**Fecha:** 2026-07-17

## Entregables

| Ítem | Estado | Evidencia |
|---|---|---|
| Dashboard con caché Redis | ✅ | `Services/Dashboard/DashboardService` (TTL 30s + invalidación) |
| Agregados (por estado, préstamos, últimos mov., por org.) | ✅ | `DashboardService::calcular` |
| Vista parcial para Custodio | ✅ | `resumen(false)` (sin desglose por org. ni bitácora global) |
| Invalidación de caché en mutaciones | ✅ | `invalidarCache()` en alta/estado de activo, resguardos y préstamos |
| Reporte de inventario PDF (con filtros) | ✅ | `Services/Reportes/ReportePdf::inventario`; `Reportes::inventario` |
| Reporte de movimientos PDF (por rango) | ✅ | `ReportePdf::movimientos`; `Reportes::movimientos` |
| Carta responsiva | ✅ | `Services/Resguardos/CartaResponsiva` (cláusulas + tabla + firma) |
| Frontend: Dashboard y Reportes | ✅ | `pages/Dashboard.tsx`, `pages/Reportes.tsx` |

## Pruebas (gate)

**Backend — PHPUnit: 59/59 verdes, 178 aserciones** (54 previas + 5 de Sprint 5):
- Agregados correctos (por estado, préstamos activos/vencidos, total por organización).
- Vista parcial de Custodio (`por_organizacion` y `ultimos_movimientos` vacíos).
- Resumen + invalidación de caché.
- Reporte de inventario PDF; RBAC (Auditor sí, Custodio 403).
- Reporte de movimientos PDF.

**Frontend — Vitest: 31/31 verdes**; build limpio.

**E2E real (backend + token de Google):**
- `GET /dashboard` → agregados completos (5 estados, préstamos, 4 orgs, 10 últimos movimientos).
- `GET /reportes/inventario` y `GET /reportes/movimientos` → `%PDF-1.4` limpios.

## Notas

- La caché del dashboard usa Redis en producción (TTL 30s) y se invalida tras mutaciones relevantes. En pruebas se usa `MockCache`; el gate verifica correctez del agregado e invalidación.
- El umbral de rendimiento (dashboard < 300 ms con caché caliente) se valida en el hardening de Sprint 6.
