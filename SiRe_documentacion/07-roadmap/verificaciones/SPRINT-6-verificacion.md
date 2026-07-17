# Sprint 6 — Verificación de cierre (QA, hardening y despliegue)

**Fecha:** 2026-07-17

## Definición de Hecho — Fase 2 (8 puntos)

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Cero N+1 en listados | ✅ | listados (activos/préstamos/usuarios) usan una sola consulta paginada; dashboard usa agregados; ficha 2–3 consultas fijas. Sin bucles por fila. |
| 2 | Toda Policy con prueba negativa | ✅ | 403 para Custodio/Auditor mutando; PII ajena 403; reportes 403; préstamo/asignación por rol (Sprints 1–5) |
| 3 | JSON del doc 09 sembró la BD sin transformación | ✅ | `InitialSeederTest` (Sprint 0) |
| 4 | Cobertura y análisis estático con el comando real | 🟡 | Cobertura se mide en **CI** (`pcov` en `.github/workflows/ci.yml`); no hay driver local en este entorno |
| 5 | Controles OWASP re-verificados contra el código | ✅ | ver tabla OWASP abajo |
| 6 | Transacciones multi-tabla confirmadas | ✅ | asignar/revocar/transferir/prestar/devolver/alta usan `transBegin/transCommit` + `FOR UPDATE` |
| 7 | `api.ts` idéntico al doc 05 | ✅ | contrato congelado; extensión `asignacion_vigente` sincronizada en ambos |
| 8 | Generación de código a prueba de concurrencia | ✅ | `GeneradorCodigo` (FOR UPDATE) + test de correlativos sin colisión (Sprint 2) |

## Controles OWASP (doc 04 §4)

| Control | Verificación | Prueba |
|---|---|---|
| A01 (Broken Access Control) | RBAC por rol; PII restringida a titular/admin | Sprint1 (PII 403), Sprint2/5 (reportes/mutaciones 403) |
| A03 (Injection) | Query Builder con binding; sin concatenación SQL | modelos CI4 + parámetros ligados |
| A05 (Misconfiguration) | CORS lista blanca; factura vía URL firmada; DebugToolbar off en API | Sprint0 (CORS), Sprint2 (factura RBAC) |
| A07 (Auth Failures) | verifica `aud`/`iss`/`exp`/firma; perfil inactivo→403; token ausente/ inválido→401 | Sprint0 (borde de auth) |
| A04/A08 (Race / Integrity) | precondiciones releídas con `FOR UPDATE`; 409 en transición inválida | Sprint2/3/4 (matriz de estados) |

## Pruebas (gate acumulado)

- **Backend — PHPUnit: 59/59 verdes, 178 aserciones.**
- **Frontend — Vitest: 31/31 verdes.**
- Total: **90 pruebas** en verde. Build de producción del frontend limpio.

## Artefactos de despliegue (nuevos)

- `deploy/nginx-api.conf`, `deploy/nginx-web.conf` — Nginx para API (PHP-FPM) y SPA.
- `apps/api/Dockerfile`, `apps/web/Dockerfile` — imágenes de producción.
- `deploy/crontab` — cron diario de alertas (TZ CJS).
- `SiRe_documentacion/07-roadmap/DESPLIEGUE.md` — guía paso a paso.

## Pendiente (requiere infraestructura del cliente)

- **Despliegue real** a servidor (Nginx + PHP-FPM + MySQL + Redis) siguiendo `DESPLIEGUE.md`.
- **UAT** con datos reales (sustituir el seed demo por organizaciones/categorías reales).
- **Cobertura** con umbrales: ejecutar el pipeline de CI (pcov) y confirmar Services/Policies 100 %, Controllers 85 %.
- **Rotar** la clave del service account expuesta durante el desarrollo.
- Ajuste fino de rendimiento (dashboard < 300 ms con caché caliente; listado < 400 ms con 5 000 registros) sobre datos de volumen real.
