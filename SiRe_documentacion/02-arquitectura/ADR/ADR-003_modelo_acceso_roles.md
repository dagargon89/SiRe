# ADR-003 — Modelo de acceso compartido y sistema de roles

| Campo | Valor |
|---|---|
| ADR | 003 |
| Título | Acceso compartido por el grupo y fusión a tres roles |
| Estado | Aceptado |
| Fecha | 2026-07-17 |
| Depende de | [00_auditoria_fuentes](../../00-fuentes/00_auditoria_fuentes.md) (H-02, H-03) |

## 1. Contexto

El GUIDELINE previo (F2) aislaba los datos por organización: `EnsureOrganizationAccess`, `org_admin` acotado a su OSC y `custodian` que solo veía lo suyo. La Definición de Producto (§1, §5, §7.1) redefine el sistema como **de grupo, con datos compartidos**: cualquier usuario autorizado ve y opera sobre los bienes de todo el grupo; las organizaciones **existen para identificar el origen** de bienes y personas (y construir códigos de activo), **no para aislar el acceso**. La §5 dejaba abierta la estructura de roles.

## 2. Decisión

### 2.1 Acceso compartido

Eliminar el aislamiento por organización. No hay filtro de acceso por `organization_id`. La única restricción a nivel de dato es la **PII**: la ficha y la carta responsiva de una persona solo son accesibles para un Administrador o para el propio titular (regla 11).

### 2.2 Tres roles

| Rol | Antes (F2) | Ahora |
|---|---|---|
| **Administrador** | `super_admin` + `org_admin` fusionados | Gobierna todo: organizaciones, categorías, usuarios, activos, asignaciones, préstamos. Único que crea/otorga el rol Administrador. |
| **Custodio** | `custodian` | Login limitado: consulta el inventario, ve lo que tiene a su cargo, registra y devuelve préstamos. Sin portal ampliado (§9). |
| **Auditor** | `auditor` | Solo lectura de activos, asignaciones y préstamos de todo el grupo. No muta nada. |

### 2.3 Matriz de permisos

| Capacidad | Administrador | Custodio | Auditor |
|---|:---:|:---:|:---:|
| Ver inventario del grupo | ✅ | ✅ | ✅ |
| Ver ficha/carta de una persona (PII) | ✅ | Solo la propia | ❌ |
| Crear/editar activos | ✅ | ❌ | ❌ |
| Dar de baja activos | ✅ | ❌ | ❌ |
| Asignar / revocar / transferir | ✅ | ❌ | ❌ |
| Generar carta responsiva | ✅ | Solo la propia | ❌ |
| Crear préstamo | ✅ | ❌ | ❌ |
| Registrar devolución | ✅ | ✅ (de lo que custodia/prestó) | ❌ |
| Gestionar organizaciones y categorías | ✅ | ❌ | ❌ |
| Gestionar usuarios y roles | ✅ | ❌ | ❌ |
| Ver reportes / dashboard | ✅ | Parcial (lo suyo) | ✅ |

> La matriz definitiva y sus criterios de aceptación viven en el SRS §Roles; aquí se fija la decisión de diseño.

## 3. Consecuencias

**Positivas**
- Coincide con la realidad operativa: un grupo que comparte espacio y recursos necesita ver todo el inventario común.
- Simplifica el modelo respecto a F2: sin middleware de scope por organización, sin la ambigüedad del `org_admin`.

**Negativas**
- Se pierde el aislamiento como capa de defensa; la protección de PII se vuelve la restricción crítica y debe implementarse con rigor (Policies + pruebas negativas).
- Un solo tipo de Administrador concentra capacidades; se mitiga con bitácora de auditoría y la regla de que nadie modifica su propio rol.

**Neutrales**
- `usuarios.organization_id` y `organizaciones.clave` se conservan por su rol en el origen y en los códigos de activo, no para acceso.

## 4. Impacto en documentos

SRS (01: roles, matriz, RF de PII), seguridad (04: Policies, pruebas negativas 403/401 sobre PII y sobre acciones de mutación), modelo de datos (03: se conserva `organization_id` sin semántica de scope), API (05: endpoints y sus autorizaciones).

## 5. Implicaciones de seguridad

Al no haber aislamiento por organización, cada endpoint que expone PII (`GET /usuarios/{id}`, `GET /usuarios/{id}/carta`, ficha) debe autorizar por titularidad o rol Administrador, con prueba negativa que confirme 403 para Custodio/Auditor sobre datos ajenos. Las acciones de mutación (crear/editar/asignar/dar de baja) se reservan a Administrador vía Policy; el Custodio solo puede la devolución de lo que le corresponde. La regla de no auto-perjuicio (nadie se desactiva ni cambia su rol) y la de escalamiento controlado (solo Administrador crea Administradores) se validan en el Service de usuarios.

## 6. Plan de migración

Base nueva: el Seeder crea el primer Administrador. No hay roles previos que convertir.

---

*ADR-003 · Proyecto SiRe · v1.0 · 2026-07-17*
