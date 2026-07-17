# 00 — Auditoría de Fuentes

| Campo | Valor |
|---|---|
| Documento | 00 — Auditoría de Fuentes |
| Proyecto | SiRe — Sistema de Resguardos OSC |
| Versión | 1.0 |
| Fecha | 2026-07-17 |
| Depende de | Fuentes externas (definición de producto vigente + GUIDELINE y SOW previos) |

> **Propósito.** Registrar qué cambió entre el material previo del proyecto (GUIDELINE y SOW de mayo 2026) y la **Definición de Producto vigente** (17-jul-2026), antes de generar cualquier documento de arquitectura o datos. Es el primer documento del proyecto según la Gobernanza de Proceso v3. Ningún hallazgo reproduce contenido sensible de las fuentes.

## 1. Fuentes auditadas

| ID | Documento | Fecha | Ubicación | Autoridad | Estado |
|---|---|---|---|---|---|
| **F1** | `DEFINICION-PRODUCTO-SiRe.md` | 2026-07-17 | `00-fuentes/` (copia) | **Máxima — fuente de verdad vigente** | Auditada |
| **F2** | `GUIDELINE — Sistema de Resguardos OSC.md` (v1.0) | 2026-05-26 | Eliminada — solo auditada aquí | Histórica — stack y modelo superados | Auditada |
| **F3** | `SOW — Sistema de Resguardos OSC.md` (v1.0) | 2026-05-26 | Eliminada — solo auditada aquí | Histórica — alcance contractual base | Auditada |

**Regla de precedencia:** ante cualquier conflicto, **F1 prevalece** sobre F2 y F3. Los archivos F2/F3 (stack Laravel/Livewire, ya superado) fueron **eliminados del repositorio**; su registro y lo que motivó el cambio de stack quedan documentados en esta auditoría y en el `ADR-001`. Las decisiones abiertas en F1 fueron resueltas por David el 17-jul-2026 y se marcan como *(Decisión David)* en el detalle.

## 2. Tabla resumen de hallazgos

| ID | Hallazgo | Fuente / sección | Severidad |
|---|---|---|---|
| H-01 | **Cambio total de stack:** F2/F3 definen Laravel 13 + Livewire 4 + Flux UI + Spatie; F1 fija React + Vite + CI4 + MySQL como stack destino dado | F2 §2, F3 §9 vs F1 §8 | 🔴 |
| H-02 | **Cambio de modelo de acceso:** F2 aísla por organización (middleware, roles acotados, visibilidad restringida); F1 elimina el aislamiento — datos compartidos por todo el grupo | F2 §3.2/§5 vs F1 §1/§7.1 | 🔴 |
| H-03 | **Fusión de roles:** F2 define 4 roles (super_admin, org_admin, custodian, auditor); se adopta modelo de **3 roles** (Administrador, Custodio, Auditor) | F2 §5.1 vs F1 §5 *(Decisión David)* | 🟠 |
| H-04 | **Mecanismo de autenticación:** F2 usa auth nativa Laravel/Sanctum; se adopta **Firebase Auth** como IdP único con verificación y revocación real al desactivar | F2 §3.1/§7 vs F1 §7 reglas 8–10 *(Decisión David)* | 🟠 |
| H-05 | **Identificación doble + categorías como entidad:** F2 usa `code` genérico y `category` como ENUM fijo; F1 exige código físico `CAT-ORG-###` correlativo + QR con deep-link y **categorías gestionables con clave de 3 letras** | F2 §4.2 vs F1 §6.3/§6.4 | 🟠 |
| H-06 | **Almacenamiento de archivos:** F2 asume rutas de filesystem (`photo_path`, `logo_path`); se adopta **Firebase Storage** para copias de factura y etiquetas QR | F2 §4.2 vs F1 §6.4/§8 *(Decisión David)* | 🟠 |
| H-07 | **Datos de factura y proveedor:** F1 exige datos de compra + proveedor/dónde se compró + copia digitalizada del comprobante; F2 solo tiene fecha y valor de adquisición | F1 §6.4 vs F2 §4.2 | 🟡 |
| H-08 | **Alcance de reportes en MVP:** F3 incluía PDFs de inventario/por-org/movimientos; F1 §9 difiere el "módulo de reportes"; MVP = **carta responsiva + PDFs de inventario/movimientos**, sin Excel/CSV | F3 §2.1 vs F1 §6.6/§9 *(Decisión David)* | 🟡 |
| H-09 | **Custodio con login limitado en MVP:** F1 §5 le da acceso pero §9 difiere el portal ampliado "Mis resguardos"; se confirma login limitado (ve lo suyo, registra/devuelve préstamos) | F1 §5 vs §9 *(Decisión David)* | 🟡 |
| H-10 | **Fotos del activo fuera del MVP:** F3 listaba "foto del activo" y F2 tiene `photo_path`; F1 §9 difiere las fotos a evolución posterior | F1 §9 vs F2 §4.2 / F3 §2.1 | 🟡 |
| H-11 | **Notificaciones:** F3 define correo 1 día antes + al vencer; F1 exige "sin avisos repetidos"; se mantiene correo SMTP + tarea programada sin repetición | F3 §2.1 / F1 §6.8 | 🟢 |
| H-12 | **Bitácora inmutable vs soft-delete:** F2 aplica soft-delete a todo; F1 exige bitácora **inmutable** (nunca se edita ni borra) y baja como estado, no como borrado del historial | F1 §6.9/§7.3 vs F2 §1 | 🟡 |
| H-13 | **Infraestructura:** hosting de producción con Redis (colas) + cron real para alertas por tarea programada | F1 §6.8 *(Decisión David)* | 🟢 |
| H-14 | **Sin secretos expuestos:** el `.env` de ejemplo de F2 contiene únicamente marcadores vacíos; no hay credenciales, tokens ni claves reales en ninguna fuente | F2 §7.2 | 🟢 |

## 3. Detalle por hallazgo

### H-01 · Cambio total de stack — 🔴

- **Dónde se propone:** F2 §2 y F3 §9 fijan Laravel 13.x + Livewire 4.x + Flux UI 2.x + Spatie Permission 6.x + Pest; F1 §8 declara "el stack destino ya está decidido: **React + Vite + CI4 + MySQL**, y se toma como dado".
- **Situación actual (fuentes viejas):** toda la arquitectura de F2 (componentes Livewire full-page, Action classes, Policies de Laravel, Eloquent) es un monolito server-side con render en el servidor.
- **Propuesta:** SPA React + TypeScript servida estáticamente que consume una API REST de CodeIgniter 4; MySQL como persistencia; Redis para caché/colas/rate-limit. Se descarta Livewire/Flux/Spatie/Eloquent.
- **Impacto:** README, CLAUDE, arquitectura (02), API (05), seguridad (04), pruebas (06), roadmap (07), design system (08) y demo (09). El RBAC deja de ser Spatie y pasa a Policies/Filters propios de CI4.
- **Acción sugerida:** registrar el cambio en **ADR-001 (stack)**; construir toda la documentación nueva sobre el stack de F1. ✔ Programado.

### H-02 · Cambio de modelo de acceso — 🔴

- **Dónde se propone:** F2 §3.2 incluye `EnsureOrganizationAccess`, `org_admin` acotado a su organización y `custodian` que ve solo lo suyo; F1 §1 y §7.1 establecen operación **compartida**: "cualquier usuario autorizado opera sobre el inventario de todo el grupo; las organizaciones identifican el origen de bienes y personas, no restringen el acceso".
- **Situación actual:** el diseño previo trataba cada OSC como un silo de datos.
- **Propuesta:** eliminar el aislamiento por organización. `users.organization_id` **se conserva** (identifica el origen de la persona y alimenta los códigos de activo) pero **no filtra** el acceso; la diferencia entre roles es *qué pueden hacer*, no *qué organización ven*. La visibilidad de datos personales (ficha/carta) sí se restringe por titularidad o rol competente (F1 regla 11).
- **Impacto:** modelo de datos (03), Policies (04), SRS roles (01), API (05).
- **Acción sugerida:** registrar en **ADR-003 (modelo de acceso y roles)**. ✔ Programado.

### H-03 · Fusión de roles a 3 — 🟠

- **Dónde se propone:** F1 §5 deja abierta la decisión de conservar 4 roles diferenciados por capacidad o fusionar los dos administradores.
- **Situación actual:** F2 §5.1 define `super_admin`, `org_admin` (por organización), `custodian`, `auditor` con matriz de permisos de 12 celdas.
- **Propuesta *(Decisión David)*:** **3 roles** — **Administrador** (gobierna catálogo de organizaciones, categorías, usuarios y toda la operación; único que crea otros administradores), **Custodio** (login limitado; ve lo suyo, registra/devuelve préstamos) y **Auditor** (solo lectura de todo el grupo). Las reglas 6 y 7 de F1 se reexpresan: nadie cambia su propio rol ni se autodesactiva, y solo un Administrador puede crear/otorgar el rol Administrador.
- **Impacto:** SRS §Roles y matriz de permisos, seguridad (Policies + pruebas negativas 403), API.
- **Acción sugerida:** matriz de permisos de 3 roles en SRS; documentar en ADR-003. ✔

### H-04 · Firebase Auth como mecanismo único — 🟠

- **Dónde se propone:** F1 §7 reglas 8–10 exigen: desactivar bloquea de verdad (sesiones invalidadas de inmediato), un solo mecanismo de autenticación y ningún canal paralelo que consulte datos solo con contraseña. La regla 10 responde explícitamente a un defecto del proyecto anterior.
- **Situación actual:** F2 §3.1/§7 usa sesión de Sanctum sobre Redis con Spatie, sin verificación de correo obligatoria ni 2FA.
- **Propuesta *(Decisión David)*:** **Firebase Authentication** como IdP único. El cliente obtiene un ID token y lo envía en `Authorization: Bearer`; un Filter de CI4 lo verifica contra las claves públicas de Google y resuelve el usuario local (rol) en MySQL. La **desactivación** ejecuta, en una sola operación atómica, la revocación de refresh tokens en Firebase **y** la marca de perfil inactivo en MySQL, cerrando el canal paralelo que la regla 10 prohíbe.
- **Impacto:** arquitectura (02), seguridad (04), API (05), ADR-002.
- **Acción sugerida:** registrar en **ADR-002 (Firebase Auth + Storage)**; detallar el flujo de verificación y revocación en 02 y 04. ✔

### H-05 · Identificación doble y categorías gestionables — 🟠

- **Dónde se propone:** F1 §6.3 define categorías como entidad con nombre, **clave de 3 letras única** y estado; F1 §6.4 exige por bien un **código físico legible** `CLAVE_CATEGORÍA-CLAVE_ORG-###` correlativo por categoría+organización y un **QR escaneable** que abre la ficha, ambos únicos y a prueba de concurrencia.
- **Situación actual:** F2 §4.2 modela `assets.code` como cadena única autogenerada sin formato definido y `assets.category` como `ENUM('tecnologia','mobiliario','otro')` fijo en el esquema; no hay QR ni claves de organización/categoría.
- **Propuesta:** tabla `categorias` (con `clave` CHAR(3)); `organizaciones.clave` CHAR(3); generación del código físico mediante secuencia correlativa por (categoría, organización) dentro de transacción con bloqueo, para garantizar unicidad ante altas simultáneas; QR generado server-side que codifica el deep-link a la ficha (`/activos/{id}`) y se almacena como etiqueta imprimible.
- **Impacto:** SRS (RF), modelo de datos (03: nueva tabla + columnas + índices únicos + estrategia de secuencia), API (05), pruebas de concurrencia (06).
- **Acción sugerida:** modelar la secuencia y los índices únicos en 03; documentar el algoritmo a prueba de concurrencia. ✔

### H-06 · Firebase Storage para archivos — 🟠

- **Dónde se propone:** F1 §6.4 y §8 dejan la ubicación de almacenamiento a criterio de David, exigiendo solo que la capacidad de subir/consultar exista.
- **Situación actual:** F2 §4.2 asume rutas locales (`assets.photo_path`, `organizations.logo_path`).
- **Propuesta *(Decisión David)*:** **Firebase Storage** para las copias digitalizadas de factura y las etiquetas QR generadas. MySQL guarda únicamente la referencia (ruta/URL y metadatos); el acceso a los archivos se media por permisos (los adjuntos de factura no son públicos).
- **Impacto:** arquitectura (02), modelo de datos (03: columnas de referencia), seguridad (04: control de acceso a archivos, URLs firmadas/expiración).
- **Acción sugerida:** documentar en ADR-002 y en 02/04. ✔

### H-07 · Datos de factura y proveedor — 🟡

- **Dónde se propone:** F1 §6.4 exige datos de compra y factura, incluido **proveedor / dónde se compró**, y la copia digitalizada.
- **Situación actual:** F2 §4.2 solo tiene `acquisition_date` y `acquisition_value`; no hay proveedor ni referencia a comprobante.
- **Propuesta:** añadir a `activos` los campos de factura (proveedor/lugar de compra, número/fecha de factura si aplica) y la referencia al archivo en Storage.
- **Impacto:** modelo de datos (03), SRS (01), API (05).
- **Acción sugerida:** integrar en el diccionario de datos de 03. ✔

### H-08 · Alcance de reportes del MVP — 🟡

- **Dónde se propone:** F1 §6.6 hace core la **carta responsiva (PDF)**; F1 §9 difiere el "módulo de reportes y exportación (Excel/CSV/PDF)".
- **Situación actual:** F3 §2.1 incluía en alcance PDF de inventario completo, por organización y de movimientos por rango, y marcaba Excel como fuera de alcance.
- **Propuesta *(Decisión David)*:** MVP incluye **carta responsiva + PDFs de inventario y de movimientos** (server-side en CI4). Exportación a **Excel/CSV queda fuera** del MVP (evolución §9).
- **Impacto:** SRS §Alcance, roadmap (07).
- **Acción sugerida:** fijar el alcance de reportes en 01 y 07. ✔

### H-09 · Custodio con login limitado — 🟡

- **Dónde se propone:** F1 §5 asigna al Custodio consultar inventario, registrar/devolver préstamos y ver lo suyo; F1 §9 difiere el "portal del custodio autenticado (Mis resguardos)".
- **Propuesta *(Decisión David)*:** el Custodio **sí inicia sesión** en el MVP con acceso limitado (ve lo que tiene a su cargo y opera préstamos), pero sin el portal ampliado de §9. Coincide con la intención de F2 (`custodian` con `assets.view-own`).
- **Impacto:** SRS (roles + alcance de pantallas), API (05), demo (09).
- **Acción sugerida:** delimitar las pantallas del Custodio en 01 y 09. ✔

### H-10 · Fotos del activo fuera del MVP — 🟡

- **Dónde se propone:** F1 §9 lista "Fotos del activo (varias por bien)" como ampliación posterior.
- **Situación actual:** F2 tenía `assets.photo_path` (una foto) y F3 §2.1 listaba "foto del activo (carga de imagen)" en alcance.
- **Propuesta:** al ser F1 la fuente vigente, **el MVP no incluye fotos del activo**; la capacidad de adjuntos que sí entra es la **copia de factura** (H-07). Se evita el campo `photo_path` en el MVP para no arrastrar alcance no pedido.
- **Impacto:** modelo de datos (03), SRS (01).
- **Acción sugerida:** dejar constancia de la exclusión en 01 §Fuera de alcance. ✔

### H-11 · Notificaciones de vencimiento — 🟢

- **Situación actual:** F3 §2.1 define correo 1 día antes de vencer y correo al vencer; F1 §6.8 exige detección periódica "sin generar avisos repetidos e innecesarios".
- **Propuesta:** correo SMTP (`noreply@planjuarez.org`) disparado por comando `spark` programado (cron diario, TZ America/Ciudad_Juarez); idempotencia por préstamo/tipo de aviso para no reenviar.
- **Impacto:** arquitectura (02), modelo de datos (control de avisos enviados), roadmap.
- **Acción sugerida:** documentar el job y la idempotencia en 02/03. ✔

### H-12 · Bitácora inmutable — 🟡

- **Dónde se propone:** F1 §6.9 y §7.3 exigen una bitácora que se genera automáticamente en cada operación y **no se edita ni se borra**; F1 §7.4 exige atomicidad (estado del bien + movimiento se guardan juntos o nada).
- **Situación actual:** F2 aplicaba `SoftDeletes` de forma general (incluyendo tablas con `deleted_at`), lo que es adecuado para catálogos pero no debe interpretarse como que los movimientos son editables.
- **Propuesta:** `movimientos` es **append-only** (sin `updated_at`, sin `deleted_at`, sin endpoints de edición/borrado); las bajas de activos son un **estado** (`baja`) más su movimiento, nunca un `DELETE` del historial. Toda operación multi-tabla corre en transacción.
- **Impacto:** modelo de datos (03), seguridad (04), pruebas (06).
- **Acción sugerida:** modelar `movimientos` sin columnas de mutación y documentar la atomicidad. ✔

### H-13 · Infraestructura con Redis + cron — 🟢

- **Propuesta *(Decisión David)*:** hosting de producción tipo VPS con **Redis** (caché, colas ligeras, rate-limit) y **cron real** para el `spark` de alertas. Habilita la estrategia asíncrona sin degradar a soluciones de hosting compartido.
- **Impacto:** arquitectura (02), roadmap (07 — Sprint 0 de cimientos).
- **Acción sugerida:** fijar la topología de despliegue en 02. ✔

### H-14 · Sin secretos expuestos — 🟢

- **Situación actual:** F2 §7.2 incluye un `.env` de ejemplo cuyos campos sensibles (`APP_KEY`, `DB_PASSWORD`) están **vacíos**; no hay credenciales, tokens ni claves reales en F1, F2 ni F3.
- **Propuesta:** mantener la práctica — toda credencial vive en variables de entorno fuera del repositorio; se documenta la lista de variables requeridas sin valores.
- **Acción sugerida:** ninguna correctiva; se ratifica en 04. Este documento no transcribe ningún valor. ✔

## 4. Conclusión de la auditoría

La Definición de Producto (F1) reorienta el proyecto respecto al material de mayo en dos ejes de severidad **🔴** — el **stack** (H-01) y el **modelo de acceso** (H-02) — y en cuatro decisiones **🟠** ya resueltas por David (roles, autenticación, identificación doble, almacenamiento). No se detectaron secretos expuestos. Los hallazgos alimentan directamente los ADR-001/002/003 y el resto de la documentación, que se genera a partir de F1 como fuente de verdad. F2 y F3 quedan como contexto histórico y base de alcance contractual.

---

*Documento 00 — Auditoría de Fuentes · Proyecto SiRe / Grupo OSC Plan Juárez · v1.0 · 2026-07-17*
*Proceso: Gobernanza v3 (documento previo al ADR-001).*
