# SiRe · Sistema de Resguardos — Grupo OSC Plan Juárez

| Campo | Valor |
|---|---|
| Proyecto | SiRe — Control de resguardos (custodia) de activos compartidos |
| Organización | Grupo OSC Plan Juárez |
| Versión de la documentación | 1.0 |
| Fecha | 2026-07-17 |
| Proceso | Gobernanza v3 (v1 docs + v2 Demo-First + v3 gates) |
| Estado | Fase 0 en curso |

Aplicación web interna para el control de resguardos de equipo y mobiliario de un **grupo de organizaciones de la sociedad civil que operan en conjunto**. Responde en todo momento a tres preguntas: **qué bienes existen, en qué estado están y quién es responsable de cada uno.** Los datos son **compartidos** por todo el grupo; las organizaciones identifican el origen de bienes y personas (y construyen los códigos de activo), no restringen el acceso. Sustituye el control informal en hojas de cálculo por una fuente única de verdad con responsabilidad formalizada (carta responsiva), identificación doble (código físico + QR) y trazabilidad inmutable.

## Estado de fase

| Fase | Estado | DoD verificada |
|---|---|---|
| 0 — Documentación (00–08) | ✅ Completa (2026-07-17) | Sí |
| 1 — Especificación de Demo UI/UX (`demo-ux/09_demo_ux_guia.md`) + prototipo | 🟡 En revisión (2026-07-17) | Pendiente visto bueno · [SPRINT-D-verificacion](demo-ux/prototipo/SPRINT-D-verificacion.md) |
| 2 — Backend (CI4 + MySQL + Redis) + `apps/web` | 🟡 En curso — Sprints 0–5 cerrados; Sprint 6 (QA/deploy) siguiente (2026-07-17) | [S0](07-roadmap/verificaciones/SPRINT-0-verificacion.md) · [S1](07-roadmap/verificaciones/SPRINT-1-verificacion.md) · [S2](07-roadmap/verificaciones/SPRINT-2-verificacion.md) · [S3](07-roadmap/verificaciones/SPRINT-3-verificacion.md) · [S4](07-roadmap/verificaciones/SPRINT-4-verificacion.md) · [S5](07-roadmap/verificaciones/SPRINT-5-verificacion.md) |

> **Regla de gate:** ningún agente genera trabajo de la Fase N+1 si la Fase N tiene "DoD verificada: No", salvo excepción justificada por escrito en esta misma tabla.
>
> **Nota de origen:** el proyecto tuvo un GUIDELINE y un SOW previos (mayo 2026) sobre stack Laravel/Livewire y con aislamiento por organización. La [Definición de Producto](00-fuentes/DEFINICION-PRODUCTO-SiRe.md) del 17-jul-2026 reorienta stack y modelo de acceso; los cambios están auditados en [00_auditoria_fuentes](00-fuentes/00_auditoria_fuentes.md).

## Stack

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React + TypeScript | 19.x / 5.x |
| Build | Vite | 7.x |
| Estilos | Tailwind CSS (design system SiRe vía `@theme`) | 4.x |
| Datos remotos (front) | TanStack Query + interfaz `lib/api.ts` | 5.x |
| Backend | CodeIgniter 4 (PHP 8.3) | 4.7.x |
| Base de datos | MySQL | 8.4 |
| Caché / colas ligeras / rate limit | Redis | 7.x |
| Autenticación | Firebase Authentication (email/password; Google restringido a dominio, opcional) | — |
| Almacenamiento de archivos | Firebase Storage (copias de factura, etiquetas QR) | — |
| Generación de PDF | mPDF (server-side, CI4) — carta responsiva + reportes | 8.x |
| Generación de QR | endroid/qr-code (server-side, CI4) | 5.x |
| Correo | SMTP (`noreply@planjuarez.org`) vía comando `spark` programado | — |

## Arquitectura en un párrafo

SPA React servida estáticamente que consume una API REST de CodeIgniter 4. El cliente obtiene un **ID token de Firebase Auth** y lo envía en `Authorization: Bearer`; un Filter de CI4 lo verifica contra las claves públicas de Google y resuelve el usuario local (rol) en MySQL. MySQL persiste el dominio (organizaciones, categorías, usuarios, activos, asignaciones, préstamos y una **bitácora de movimientos inmutable**); Redis cachea la verificación de tokens, el resumen del dashboard y actúa como rate limiter. Las **copias de factura y las etiquetas QR** viven en Firebase Storage, referenciadas desde MySQL. Un comando `spark` programado (cron diario, TZ `America/Ciudad_Juarez`) detecta préstamos por vencer y vencidos y envía correos idempotentes. Toda operación multi-tabla ocurre en transacción; la generación de códigos e identificadores es correlativa y a prueba de concurrencia.

## Índice de documentos

| # | Documento | Ruta |
|---|---|---|
| 00 | Auditoría de fuentes | [00-fuentes/00_auditoria_fuentes.md](00-fuentes/00_auditoria_fuentes.md) |
| — | Guía operativa para agentes | [CLAUDE.md](CLAUDE.md) |
| ADR-001 | Stack del proyecto (React + CI4) | [02-arquitectura/ADR/ADR-001_stack_ci4_react.md](02-arquitectura/ADR/ADR-001_stack_ci4_react.md) |
| ADR-002 | Firebase Authentication + Storage | [02-arquitectura/ADR/ADR-002_firebase_auth_storage.md](02-arquitectura/ADR/ADR-002_firebase_auth_storage.md) |
| ADR-003 | Modelo de acceso compartido y roles | [02-arquitectura/ADR/ADR-003_modelo_acceso_roles.md](02-arquitectura/ADR/ADR-003_modelo_acceso_roles.md) |
| 01 | SRS — Especificación de requisitos | [01-vision/01_SRS_especificacion_requisitos.md](01-vision/01_SRS_especificacion_requisitos.md) |
| 02 | Arquitectura del sistema | [02-arquitectura/02_arquitectura_sistema.md](02-arquitectura/02_arquitectura_sistema.md) |
| 03 | Modelo de datos | [03-datos/03_modelo_de_datos.md](03-datos/03_modelo_de_datos.md) |
| 04 | Plan de seguridad | [04-seguridad/04_plan_de_seguridad.md](04-seguridad/04_plan_de_seguridad.md) |
| 05 | Especificación de API (borrador — se congela tras Sprint D) | [05-api/05_especificacion_api.md](05-api/05_especificacion_api.md) |
| 06 | Plan de pruebas | [06-pruebas/06_plan_de_pruebas.md](06-pruebas/06_plan_de_pruebas.md) |
| 07 | Roadmap por sprints | [07-roadmap/07_roadmap_sprints.md](07-roadmap/07_roadmap_sprints.md) |
| 08 | Identidad visual y design system | [01-vision/08_identidad_visual_design_system.md](01-vision/08_identidad_visual_design_system.md) |
| 09 | Guía del demo UX | [demo-ux/09_demo_ux_guia.md](demo-ux/09_demo_ux_guia.md) |

## Decisiones clave del MVP

| Decisión | Valor | Justificación / ADR |
|---|---|---|
| Stack | React + Vite + CI4 + MySQL + Redis | Estándar de la organización; sustituye Laravel/Livewire (ADR-001) |
| Modelo de acceso | Datos compartidos por el grupo; organización = origen, no silo | ADR-003, definición §1/§7.1 |
| Roles | Administrador · Custodio (login limitado) · Auditor | ADR-003 (fusión de los dos admins) |
| Autenticación | Firebase Auth (IdP único); CI4 verifica ID token | ADR-002; reglas 8–10 de la definición |
| Desactivar bloquea | Revoca refresh tokens en Firebase + perfil inactivo en MySQL (atómico) | ADR-002, regla 8 |
| Identificación del activo | Código físico `CAT-ORG-###` correlativo + QR con deep-link | Definición §6.4; a prueba de concurrencia |
| Categorías | Entidad gestionable con clave de 3 letras | Definición §6.3 |
| Almacenamiento de archivos | Firebase Storage (factura + etiqueta QR) | ADR-002 |
| Bitácora de movimientos | Append-only, inmutable, atómica con el cambio de estado | Definición §6.9/§7 |
| Reportes MVP | Carta responsiva + PDF de inventario y de movimientos | Definición §6.6; Excel/CSV fuera (§9) |
| Fotos del activo | Fuera del MVP | Definición §9 |
| Notificaciones | Correo SMTP, 1 día antes + al vencer, idempotente | Definición §6.8 |
| Registro de cuentas | Solo Administrador crea (sin auto-registro) | Definición regla 9 |
| Zona horaria | `America/Ciudad_Juarez` en BD, backend y jobs | Estándar Plan Juárez |

## Cómo leer esta documentación

1. Lee [00_auditoria_fuentes](00-fuentes/00_auditoria_fuentes.md) para entender qué cambió entre el material previo y la definición vigente.
2. Sigue con el [SRS](01-vision/01_SRS_especificacion_requisitos.md) (qué hace el sistema y para quién) y los tres ADRs (por qué el stack y el modelo de acceso son estos).
3. Con el dominio claro, revisa [arquitectura](02-arquitectura/02_arquitectura_sistema.md) y [modelo de datos](03-datos/03_modelo_de_datos.md) — el DDL es la fuente de verdad que el bloque JSON del demo espeja.
4. Antes de escribir backend, lee [plan de seguridad](04-seguridad/04_plan_de_seguridad.md) y [especificación de API](05-api/05_especificacion_api.md).
5. Para el frontend, usa el [design system](01-vision/08_identidad_visual_design_system.md) + la [guía del demo](demo-ux/09_demo_ux_guia.md); el orden de construcción vive en el [roadmap](07-roadmap/07_roadmap_sprints.md).

---

*README · Proyecto SiRe / Grupo OSC Plan Juárez · v1.0 · 2026-07-17*
