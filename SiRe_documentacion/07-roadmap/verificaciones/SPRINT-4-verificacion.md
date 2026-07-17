# Sprint 4 — Verificación de cierre (préstamos y alertas)

**Fecha:** 2026-07-17

## Entregables

| Ítem | Estado | Evidencia |
|---|---|---|
| Prestar / devolver (atómicos) | ✅ | `Services/Prestamos/PrestamoService` (transacción + FOR UPDATE) |
| Estados derivados (activo/vencido/devuelto) | ✅ | `PrestamoModel::estadoDerivado`; filtro en `Prestamos::index` |
| Precondiciones (409) | ✅ | prestar no-disponible; devolver ya-devuelto |
| Job de alertas idempotente | ✅ | `Services/Prestamos/AlertasPrestamosService` (+ `avisos_prestamo` UNIQUE) |
| Comando `spark` (cron) | ✅ | `resguardos:alertas-prestamos` |
| Correo (SMTP) abstraído y mockeable | ✅ | `Notificaciones/Mailer` (+ `EmailMailer`, `FakeMailer`); `Config/Email` lee `.env` |
| Frontend: lista con filtros + devolver; prestar en la ficha | ✅ | `pages/Prestamos.tsx`, `ActivoFicha.tsx` |

## Pruebas (gate)

**Backend — PHPUnit: 54/54 verdes, 160 aserciones** (47 previas + 7 de Sprint 4):
- Prestar disponible → 201 (activo `prestado`, movimiento `prestamo`); no disponible → 409.
- Devolver → activo `disponible`, movimiento `devolucion`; ya devuelto → 409.
- Estado derivado `vencido` en el listado filtrado.
- RBAC: Custodio no presta (403) pero sí devuelve (200).
- **Idempotencia de alertas:** 1.ª corrida envía 1 aviso; 2.ª envía 0; se notifica a prestatario y prestamista; se registra `avisos_prestamo`.

**Frontend — Vitest: 29/29 verdes**; build limpio.

**E2E real (backend + token de Google):**
- Prestar → activo `prestado`; devolver → préstamo `devuelto`, activo `disponible`.
- `php spark resguardos:alertas-prestamos`: 1.ª corrida "Avisos enviados: 1", 2.ª "0" (idempotente). El transporte de correo requiere MTA/SMTP configurado (`.env`); la lógica de avisos es independiente de la entrega.

## Nota de despliegue

En producción, definir `SMTP_*` en `.env` (protocolo smtp) y programar el cron diario `php spark resguardos:alertas-prestamos` en TZ `America/Ciudad_Juarez`.
