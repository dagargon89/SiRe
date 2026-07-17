# CLAUDE.md — Guía operativa para agentes · SiRe

| Campo | Valor |
|---|---|
| Documento | Guía operativa para agentes IA |
| Proyecto | SiRe — Sistema de Resguardos OSC |
| Versión | 1.0 |
| Fecha | 2026-07-17 |
| Depende de | [README.md](README.md), Gobernanza v3 |

## Qué es SiRe

Sistema web interno de **control de resguardos (custodia) de activos** —equipo y mobiliario— para un grupo de OSC que operan en conjunto. Los datos son **compartidos**: cualquier usuario autorizado opera sobre el inventario de todo el grupo. El sistema formaliza responsabilidad (carta responsiva PDF), identifica cada bien con **código físico + QR** y mantiene una **bitácora inmutable** de todo lo que le pasa a cada bien.

## Núcleo de dominio

`organizaciones` (origen + clave de 3 letras) · `categorias` (clave de 3 letras) · `usuarios` (perfil local ligado a Firebase UID + rol) · `activos` (código físico + QR, condición, estado, factura) · `asignaciones` (resguardo de largo plazo) · `prestamos` (temporal con fecha de devolución) · `movimientos` (bitácora append-only).

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript 5 + Vite 7 + Tailwind 4 + TanStack Query 5 |
| Backend | CodeIgniter 4.7 (PHP 8.3) |
| Datos | MySQL 8.4 |
| Caché/colas/rate-limit | Redis 7 |
| Auth | Firebase Authentication (ID token verificado en CI4) |
| Archivos | Firebase Storage |
| PDF / QR | mPDF / endroid/qr-code (server-side) |
| Correo | SMTP vía `spark` programado (cron) |

## Reglas no negociables

1. **Acceso compartido, no aislado.** Nunca filtres el inventario por `organization_id` para restringir acceso. La organización identifica origen y construye códigos; no es un silo. La única restricción por dato es la **PII** (ficha/carta de una persona): solo el titular o un Administrador. *Por qué:* es el cambio de modelo central de la definición (§1/§7.1).
2. **Un solo mecanismo de auth.** Toda autenticación pasa por Firebase Auth + verificación del ID token en CI4. Prohibido cualquier canal paralelo que consulte datos solo con contraseña. *Por qué:* fue el defecto del proyecto anterior (regla 10).
3. **Desactivar bloquea de verdad.** Desactivar un usuario revoca sus refresh tokens en Firebase **y** marca el perfil inactivo en MySQL en una sola operación atómica; el Filter rechaza tokens de perfiles inactivos. *Por qué:* regla 8; "en apariencia" no basta.
4. **Bitácora inmutable y obligatoria.** `movimientos` es append-only: sin `UPDATE`, sin `DELETE`, sin `updated_at`/`deleted_at`, sin endpoints de edición. Cada operación de negocio inserta su movimiento. *Por qué:* es la fuente de verdad del historial (§6.9/§7.3).
5. **Operaciones atómicas.** Todo cambio que toca varias tablas (asignar, revocar, transferir, prestar, devolver, dar de baja) corre dentro de `$db->transException(true)` + `transStart/transComplete`. Estado del activo y movimiento se guardan juntos o no se guarda nada. *Por qué:* regla 4.
6. **Identificadores a prueba de concurrencia.** El código físico `CAT-ORG-###` se genera con una secuencia correlativa por (categoría, organización) dentro de la transacción, con bloqueo de fila; el QR se deriva del `id`. Dos altas simultáneas nunca producen el mismo código ni el mismo QR. *Por qué:* §6.4/regla 2.
7. **Precondiciones de estado.** No se asigna ni presta un activo que no esté `disponible`; no se revoca/devuelve algo ya cerrado. Validar el estado **dentro** de la transacción, releyendo con bloqueo. *Por qué:* regla 5.
8. **Menor privilegio.** Autorización en Policies/Filters, nunca en el componente React ni en query params. Solo un Administrador crea Administradores; nadie cambia su propio rol ni se autodesactiva. *Por qué:* reglas 6 y 7.
9. **Cero N+1.** Toda relación accedida en lista usa carga anticipada (join/`whereIn` batched). El N+1 en producción es un bug, no un detalle. *Por qué:* estándar de rendimiento Plan Juárez.
10. **Secretos solo en entorno.** Ninguna credencial (Firebase service account, SMTP, DB) en el repo; todo en `.env` fuera de webroot. *Por qué:* regla de seguridad de origen.

## Arquitectura en capas (texto)

```
[ React SPA (apps/web) ]  ── Bearer ID token Firebase ──▶  [ CI4 REST API ]
      │  TanStack Query + lib/api.ts                              │
      │                                          Filter: verifica ID token (Redis cache de claves)
      ▼                                                           ▼
[ Firebase Auth (IdP) ]                              [ Controllers finos ]
[ Firebase Storage (archivos) ]                              ▼
                                                    [ Services / Actions (negocio, transacciones) ]
                                                             ▼
                                                    [ Models / Query Builder ]  ──▶  [ MySQL 8.4 ]
                                                             ▲
                                     [ spark cron (alertas) ] ┘        [ Redis: cache, rate-limit ]
```

## Reglas de gate (Gobernanza v3)

- No generar código/documentos de una fase si la anterior tiene **"DoD verificada: No"** en la tabla de Estado de Fase del README, salvo excepción escrita ahí mismo.
- El **contrato de API** (interfaz TypeScript `ApiClient`) vive primero en `demo-ux/09_demo_ux_guia.md`; al congelarse tras el Sprint D se copia **literalmente** al doc 05. Cualquier cambio a esa interfaz en Fase 2 actualiza el doc 05 en la misma sesión — `api.ts` (front) y doc 05 no pueden divergir.
- Antes de cerrar el Sprint D: confrontar el **bloque JSON espejo** del doc 09 contra el **DDL** del doc 03 (tablas, columnas, tipos/nullability, enums, FKs). Discrepancia = bloqueante.
- El mismo bloque JSON del doc 09 se copia sin reescritura al `InitialSeeder` de CI4 en Fase 2.

## Comandos de arranque (Fase 2, referencia)

```bash
# Backend CI4
composer install
cp env .env                      # completar credenciales (nunca commitear)
php spark migrate
php spark db:seed InitialSeeder
php spark serve

# Alertas de vencimiento (cron diario)
php spark resguardos:alertas-prestamos

# Frontend
cd apps/web && npm install && npm run dev
```

## Identidad visual (resumen — ver doc 08)

Design system propio de SiRe (no hay marca previa). Sidebar de navegación + sección de perfil de usuario, **modo claro y oscuro**, responsive **mobile-first**. Todos los colores como **tokens CSS** (`--sire-*`) con contraste **WCAG 2.1 AA** verificado; Tailwind 4 vía `@theme`. Nunca colores hardcodeados fuera de los tokens.

## Orden de lectura

`00_auditoria_fuentes` → `README` → `01_SRS` + ADRs → `02_arquitectura` + `03_modelo_de_datos` → `04_plan_de_seguridad` + `05_especificacion_api` → `08_design_system` + `demo-ux/09` → `07_roadmap`.

---

*CLAUDE.md · Proyecto SiRe / Grupo OSC Plan Juárez · v1.0 · 2026-07-17*
