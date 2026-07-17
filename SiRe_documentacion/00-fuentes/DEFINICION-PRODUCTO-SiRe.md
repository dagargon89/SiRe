# Definición del Producto — Sistema de Resguardos (SiRe)

> **Qué es este documento:** La declaración de **qué debe lograr** el sistema. Define propósito, objetivos, usuarios, alcance funcional y reglas innegociables. No describe cómo se construye (sin código, sin diseño de base de datos) ni cuándo (las fases las define otro agente).
> **Naturaleza:** Desarrollo nuevo desde cero. Base de datos limpia. No hay migración de datos.
> **Modelo de operación:** Grupo de organizaciones que trabajan **en conjunto**; el inventario y los datos se comparten entre todos los usuarios autorizados.
> **Idioma base:** Español.
> **Fecha:** 2026-07-17

---

## 1. Propósito

SiRe es un sistema de **control de resguardos (custodia) de activos** —equipo y mobiliario— para un **grupo de organizaciones de la sociedad civil (OSC) que operan en conjunto**. Su razón de existir es responder, en cualquier momento y sin ambigüedad, a tres preguntas: **qué bienes existen, en qué estado están y quién es responsable de cada uno.**

Es un sistema **de grupo, con datos compartidos**: cualquier usuario autorizado ve y opera sobre los bienes de todo el grupo. Las organizaciones **existen para identificar el origen** de cada bien y de cada persona (y para construir los códigos de activo), **no para aislar el acceso**.

---

## 2. Problema que resuelve

El control de activos en una OSC suele vivir en hojas de cálculo y documentos sueltos: se pierde el rastro de quién tiene qué, no hay evidencia formal de responsabilidad, los préstamos no se devuelven a tiempo y no existe un historial confiable. SiRe sustituye eso por una **fuente única de verdad compartida por el grupo**, con responsabilidad formalizada (carta responsiva), identificación ágil de cada bien (código físico + QR) y trazabilidad completa respaldada con evidencia documental.

---

## 3. Objetivos del proyecto

El sistema se considera exitoso si logra, de forma sostenida:

1. **Inventario confiable y compartido.** Saber en todo momento qué bienes existen, su estado y su responsable actual, con acceso común a todo el grupo.
2. **Trazabilidad total.** Que cada bien tenga un historial **inmutable** de todo lo que le ha pasado, y que su origen quede respaldado con **datos de factura** y una copia digitalizada.
3. **Identificación y rastreo ágil.** Que cada bien se localice tanto por un **código físico legible** (búsqueda manual) como por un **código QR escaneable** desde la app.
4. **Responsabilidad formal.** Emitir en el momento la **carta responsiva** oficial que respalda la custodia de una persona.
5. **Control de préstamos.** Gestionar préstamos temporales con fecha de devolución y alertas de vencimiento, sin dejar bienes "perdidos" en el limbo.

---

## 4. Resultados esperados (criterios de éxito)

Concretan cuándo los objetivos están cumplidos:

- Cualquier bien puede localizarse por **código físico, nombre o escaneo de su QR**, y se sabe al instante quién lo custodia y en qué estado está.
- Escanear el QR de un bien **abre su ficha** directamente en la app.
- Cada bien conserva un **código físico legible** impreso, utilizable si el escaneo no está disponible.
- Cada bien puede respaldarse con **datos de factura** (incluido dónde se compró) y una **copia digitalizada** del comprobante.
- **Toda** operación sobre un bien queda registrada en la bitácora; ninguna acción altera o borra el historial.
- Un usuario **desactivado** pierde el acceso de inmediato (no solo "en apariencia").
- Los datos personales (ficha, inventario a cargo, carta) solo son accesibles para quien tiene derecho a verlos.

---

## 5. Usuarios y para qué usan el sistema

Cuatro perfiles. Como el acceso es compartido, la diferencia entre roles es **qué pueden hacer**, no qué organización pueden ver.

| Perfil | Para qué usa el sistema |
|---|---|
| **Administrador global** | Gobierna el grupo completo: catálogo de organizaciones, usuarios, categorías y la operación entera. Es el único que crea otros administradores globales. |
| **Administrador de organización** | Opera el inventario compartido del grupo: gestiona activos, asignaciones, préstamos, usuarios y categorías. No administra el catálogo de organizaciones ni crea administradores globales. |
| **Custodio** | Es la persona que recibe bienes en resguardo. Consulta el inventario, registra y devuelve préstamos, y ve lo que tiene a su cargo. |
| **Auditor** | Solo lectura. Consulta activos, asignaciones y préstamos de todo el grupo; no modifica nada. |

> **Decisión pendiente de confirmar:** al eliminarse el aislamiento por organización, el rol "Administrador de organización" ya no está acotado a una OSC; se conserva diferenciado solo por capacidad (no gestiona organizaciones ni crea administradores globales). Puede mantenerse así o **fusionarse con "Administrador global" en un único rol "Administrador"**. Falta tu decisión.

---

## 6. Alcance funcional (qué debe poder hacerse)

El **núcleo** que el sistema debe cubrir. Descrito como capacidades, no como pantallas.

### 6.1 Organizaciones
Alta, edición y activación/desactivación de las OSC del grupo. Cada organización tiene un nombre y una **clave de 3 letras** única que se usa para construir los códigos de activo. Sirven para **identificar el origen** de bienes y personas y para reportar por procedencia; **no restringen el acceso**. Una organización inactiva no se ofrece al registrar nuevos bienes o usuarios.

### 6.2 Usuarios y roles
Alta, edición, activación/desactivación y cambio de rol de personas. Un administrador de organización no puede crear administradores globales. Nadie puede desactivarse ni cambiarse el rol a sí mismo.

### 6.3 Categorías
Clasificación de bienes (ej. Cómputo, Mobiliario) con nombre, **clave de 3 letras** única y estado activo/inactivo. Solo las activas se ofrecen al crear activos.

### 6.4 Activos e identificación
Registro del inventario. Cada bien debe contar con:

- **Código físico legible y único**, con formato `CLAVE_CATEGORÍA-CLAVE_ORG-###` (ej. `CMP-AVZ-001`), correlativo por categoría + organización. Es el identificador imprimible para **búsqueda manual**.
- **Código QR escaneable** asociado al bien, que al leerse desde la app **abre su ficha**. Debe poder imprimirse como etiqueta. Facilita el inventario físico y el registro rápido de entrega/devolución.
- **Datos descriptivos:** nombre, descripción, marca, modelo, número de serie.
- **Datos de compra y factura:** fecha y valor de compra, **proveedor / dónde se compró**, y la posibilidad de **subir una copia digitalizada de la factura** como respaldo. *(La ubicación de almacenamiento de esos archivos la determina David; este documento solo exige que la capacidad exista.)*
- **Condición física** (Excelente/Bueno/Regular/Malo/Baja) y **estado operativo** (Disponible/Asignado/Prestado/Mantenimiento/Baja).
- **Auditoría:** quién lo creó, actualizó y (en su caso) eliminó.

Debe poder listarse con búsqueda y filtros, verse en detalle con su historial completo y editarse. La **generación del código debe ser robusta**: única, correlativa y a prueba de concurrencia (dos altas simultáneas nunca producen el mismo código ni el mismo QR).

### 6.5 Asignaciones / Resguardos
Entregar un bien disponible a una persona bajo su responsabilidad (custodia de largo plazo), revocar esa entrega para regresar el bien a inventario, y **transferir** (revocar y reasignar a otra persona u organización en un solo paso). Desde aquí se genera la carta responsiva.

### 6.6 Carta responsiva (PDF)
Documento descargable por persona custodia con los datos de la organización, el custodio, la tabla de bienes a su cargo, las cláusulas de responsabilidad y los espacios de firma. Requiere que la persona tenga al menos una asignación vigente.

### 6.7 Préstamos
Entregar temporalmente un bien disponible con fecha esperada de devolución y condición al prestar; devolverlo registrando su condición. Un bien no puede tener dos préstamos activos a la vez. Estados derivados: activo, vencido, devuelto.

### 6.8 Alertas de vencimiento
Detección periódica de préstamos vencidos y **notificación** al prestatario y al prestamista, sin generar avisos repetidos e innecesarios.

### 6.9 Bitácora de movimientos
Registro **inmutable** que se genera automáticamente en cada operación (Alta, Asignación, Revocación, Préstamo, Devolución, Transferencia, Baja, Mantenimiento). Es la fuente de verdad del historial de cada bien.

### 6.10 Panel de indicadores (Dashboard)
Vista de estado del grupo: totales de activos por estado, préstamos activos y vencidos, últimos movimientos y estadísticas por organización de origen.

---

## 7. Reglas innegociables

Definen el comportamiento correcto del sistema. No son opcionales.

1. **Operación compartida.** Cualquier usuario autorizado opera sobre el inventario de todo el grupo; las organizaciones identifican el origen de bienes y personas, no restringen el acceso.
2. **Identificación doble y única.** Cada bien tiene un código físico legible y un QR escaneable, ambos únicos; su generación es correlativa y a prueba de concurrencia.
3. **Bitácora obligatoria e inmutable.** Cada operación deja un movimiento; el historial no se edita ni se borra.
4. **Operaciones atómicas.** Cada operación ocurre completa o no ocurre (el estado del bien y su movimiento se guardan juntos o no se guarda nada).
5. **Precondiciones de estado.** No se asigna ni presta un bien que no esté Disponible; no se revoca ni devuelve algo ya cerrado.
6. **No autoperjuicio.** Nadie se desactiva ni se cambia el rol a sí mismo.
7. **Escalamiento de privilegios controlado.** Solo el administrador global crea u otorga el rol de administrador global.

### Requisitos de seguridad de origen
Como el sistema arranca de cero, estas condiciones se construyen desde el inicio (fueron defectos en el proyecto anterior y aquí son requisitos):

8. **Desactivar bloquea de verdad.** Un usuario desactivado no puede iniciar sesión y sus sesiones activas se invalidan de inmediato.
9. **Política de registro explícita.** No existe auto-registro anónimo. Las cuentas las crea un administrador (o, si se decide permitir registro, es con verificación de correo y aprobación administrativa).
10. **Un solo mecanismo de autenticación.** No hay canales paralelos que consulten datos con solo la contraseña, sin pasar por el flujo de sesión seguro (2FA/verificación de correo).
11. **Acceso a datos personales restringido.** La carta responsiva y la ficha de una persona solo son accesibles para un administrador competente o para el propio titular.

---

## 8. Fuera de alcance

Explícito, para evitar que el proyecto crezca sin control:

- **Fases y cronograma:** los define otro agente.
- **Decisiones de implementación:** stack, diseño de base de datos, arquitectura y código (el stack destino ya está decidido: React + Vite + CI4 + MySQL, y se toma como dado).
- **Ubicación de almacenamiento de archivos** (copias de facturas y demás adjuntos): la determina David; aquí solo se exige que la capacidad de subir y consultar exista.
- **Migración de datos:** no aplica; la base arranca vacía.
- **Ampliaciones no-núcleo:** ver §9.

---

## 9. Ampliaciones previstas (no forman parte del núcleo)

Se listan para que quien defina las fases conozca el horizonte, pero **no** son parte de lo que se quiere lograr en la primera versión:

Fotos del activo (varias por bien) y documentos adjuntos generales (garantía, manual) · firma electrónica de la carta responsiva con sello de tiempo · módulo de reportes y exportación (Excel/CSV/PDF) · bitácora de auditoría ampliada (login, cambios de rol, ediciones) · centro de notificaciones in-app con recordatorios escalonados · flujo formal de mantenimiento y baja · inventario físico/levantamiento por periodo · ubicaciones físicas con historial de traslados · depreciación y valor contable · flujo de aprobaciones para préstamos/asignaciones · portal del custodio autenticado ("Mis resguardos") · importación masiva · roles y permisos configurables desde la interfaz · políticas de respaldo y anonimización · branding por organización · API · app móvil · tablero ejecutivo histórico.

---

## 10. Definición de "logrado"

El sistema cumple lo que se quiere cuando, sobre una base de datos limpia:

- Cubre íntegramente el alcance funcional del §6, incluyendo la **identificación doble (código físico + QR)** y el **respaldo de factura**.
- Respeta todas las reglas innegociables del §7, **incluyendo** los requisitos de seguridad de origen.
- Alcanza los criterios de éxito del §4 de forma verificable.

Todo lo demás (§9) es evolución posterior y no condiciona la primera entrega.

---

*Documento de definición de producto. Establece qué debe lograr el sistema; no prescribe implementación ni calendario.*
