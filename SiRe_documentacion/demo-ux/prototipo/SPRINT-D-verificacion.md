# Sprint D — Verificación de cierre

**Fecha:** 2026-07-17

## Entregables

| Ítem | Estado | Evidencia |
|---|---|---|
| Prototipo importado (Claude Design) | ✅ | `SiRe Prototipo.dc.html` (105 KB) con las 13 pantallas del doc 09 §2 |
| Tokens de color extraídos 1:1 | ✅ | `apps/web/src/styles/theme.css` (navy/teal, claro+oscuro) |
| Tipografía 1:1 (Public Sans + IBM Plex Mono) | ✅ | `apps/web/index.html` |
| Discrepancia vs doc 08 documentada | ✅ | `DISCREPANCIAS.md` |
| Componentes base extraídos | ✅ | `Badge`, `Button`, `Card`, `KpiCard`, `Field` + tests |
| Contrato `ApiClient` **congelado** | ✅ | `apps/web/src/lib/api.ts` = doc 05 §4, literal |

## Gate v3 — Bloque JSON (doc 09 §5) ↔ DDL (doc 03)

**Resultado: PASA. Sin discrepancias.**

- Las **9 tablas** aparecen con nombre exacto: `organizaciones`, `categorias`, `usuarios`, `secuencias_codigo`, `activos`, `asignaciones`, `prestamos`, `movimientos`, `avisos_prestamo`.
- **Columnas** coinciden 1:1 con el DDL en cada tabla (incluye auditoría `creado_por`/`actualizado_por`, `de_org_id`/`a_org_id`, `prestado_por`/`devuelto_a`, `baja_motivo`).
- **Enums** válidos: `rol` (administrador/custodio/auditor), `condicion`, `estado`, `movimientos.tipo`, `avisos_prestamo.tipo`, `condicion_prestamo` (sin `baja`).
- **Integridad referencial** verificada: FKs de usuarios→orgs; activos→cat/org/usuarios; secuencias↔códigos (`ultimo=2` para CMP-AVZ con 2 activos, `=1` en el resto); asignaciones/préstamos/movimientos/avisos íntegros.
- **Escenarios cubiertos**: disponible, asignado, prestado (activo y vencido), mantenimiento, baja; préstamo `id:1` vencido sin aviso `vencido` (ejercita idempotencia del job en Sprint 4).

Este bloque JSON se copiará **sin transformación** al `InitialSeeder` en Sprint 0.

## Pruebas del frontend (gate)

`npm run test` → **9 tests / 3 archivos, 100% verdes** (theme, App, componentes base).
`npm run build` → **compila limpio** (tsc + vite).

## Pendiente (no bloqueante para Sprint 0)

- Re-sincronizar el doc 08 §2/§4 con la paleta/tipografía del prototipo (opcional, trazabilidad).
- El porteo pantalla-por-pantalla 1:1 se hace dentro de cada sprint usando el prototipo como referencia (login en Sprint 0; catálogos en Sprint 1; etc.).
