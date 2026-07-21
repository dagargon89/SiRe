# 05 — Especificación de API (borrador)

| Campo | Valor |
|---|---|
| Documento | 05 — Especificación de API |
| Proyecto | SiRe — Sistema de Resguardos OSC |
| Versión | 1.0 (borrador — se congela tras Sprint D) |
| Fecha | 2026-07-17 |
| Depende de | [01_SRS](../01-vision/01_SRS_especificacion_requisitos.md), [03_modelo_de_datos](../03-datos/03_modelo_de_datos.md), [04_plan_de_seguridad](../04-seguridad/04_plan_de_seguridad.md) |

> **Estado.** Borrador. La interfaz `ApiClient` (§4) es la que se prototipa en la herramienta externa y se **congela** al re-sincronizar tras el Sprint D. A partir del freeze, cualquier cambio en la implementación de Fase 2 actualiza este documento en la misma sesión (Gobernanza v3, mejora 4).

## 1. Convenciones

- **Base URL:** `/api/v1`. Versionado en la ruta.
- **Autenticación:** `Authorization: Bearer <Firebase ID token>` en toda ruta salvo salud. Verificación en `FirebaseAuthFilter`.
- **Formato:** JSON (`Content-Type: application/json`); fechas ISO 8601 (`YYYY-MM-DDTHH:mm:ss`, TZ `America/Ciudad_Juarez`).
- **Códigos HTTP:** `200` ok · `201` creado · `204` sin contenido · `400` validación · `401` no autenticado · `403` sin permiso · `404` no existe · `409` conflicto de estado · `422` regla de negocio · `429` rate limit · `500` error.
- **Errores:** `{ "error": "codigo_maquina", "mensaje": "texto", "detalles": { campo: [..] } }`.
- **Paginación:** `?page=1&per_page=25`; respuesta `{ data: [...], meta: { page, per_page, total } }`.
- **Rate limiting:** por usuario/IP en Redis; más estricto en auth. Respuesta `429` con `Retry-After`.
- **Idempotencia:** las mutaciones de estado validan precondición server-side (409 si el estado no lo permite).

## 2. Recursos y endpoints

### Autenticación / sesión
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/v1/me` | cualquiera autenticado | Perfil y rol del usuario del token |

### Organizaciones
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/v1/organizaciones` | todos | Lista (filtro `?activa=`) |
| POST | `/api/v1/organizaciones` | administrador | Crea (nombre + clave 3 letras) |
| PUT | `/api/v1/organizaciones/{id}` | administrador | Edita |
| PATCH | `/api/v1/organizaciones/{id}/estado` | administrador | Activa/desactiva |

### Categorías
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/v1/categorias` | todos | Lista (`?activa=`) |
| POST | `/api/v1/categorias` | administrador | Crea (nombre + clave 3 letras) |
| PUT | `/api/v1/categorias/{id}` | administrador | Edita |
| PATCH | `/api/v1/categorias/{id}/estado` | administrador | Activa/desactiva |

### Usuarios
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/v1/usuarios` | administrador | Lista |
| POST | `/api/v1/usuarios` | administrador | Crea (Firebase + perfil) |
| GET | `/api/v1/usuarios/{id}` | administrador · titular | Ficha (PII restringida) |
| PUT | `/api/v1/usuarios/{id}` | administrador | Edita |
| PATCH | `/api/v1/usuarios/{id}/rol` | administrador | Cambia rol (no a sí mismo; solo admin otorga admin) |
| PATCH | `/api/v1/usuarios/{id}/desactivar` | administrador | Revoca tokens + inactiva (no a sí mismo) |
| GET | `/api/v1/usuarios/{id}/carta` | administrador · titular | Carta responsiva PDF |
| GET | `/api/v1/usuarios/{id}/activos` | administrador · titular | Equipos vigentes a cargo (resguardos activos) |
| GET | `/api/v1/usuarios/{id}/prestamos` | administrador · titular | Préstamos vigentes del usuario (como prestatario) |

### Activos
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/v1/activos` | todos | Lista con búsqueda (`?q=`) y filtros (`categoria_id`, `estado`, `condicion`, `organizacion_id`) |
| POST | `/api/v1/activos` | administrador | Alta (genera código físico + QR) |
| GET | `/api/v1/activos/{id}` | todos | Ficha + historial |
| GET | `/api/v1/activos/{id}/publico` | público (sin login) | Destino del QR: ficha reducida de solo lectura + custodio/prestatario vigente (sin historial ni datos financieros) |
| PUT | `/api/v1/activos/{id}` | administrador | Edita |
| POST | `/api/v1/activos/{id}/factura` | administrador | Sube copia de factura (URL firmada) |
| GET | `/api/v1/activos/{id}/factura` | administrador · auditor | URL firmada de descarga |
| GET | `/api/v1/activos/{id}/etiqueta` | administrador | PDF/PNG imprimible (código + QR) |
| PATCH | `/api/v1/activos/{id}/baja` | administrador | Da de baja (motivo) |
| PATCH | `/api/v1/activos/{id}/mantenimiento` | administrador | Entra/sale de mantenimiento |

### Asignaciones
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/api/v1/asignaciones` | administrador | Asigna activo disponible |
| PATCH | `/api/v1/asignaciones/{id}/revocar` | administrador | Revoca (motivo) |
| POST | `/api/v1/asignaciones/transferir` | administrador | Revoca+reasigna (atómico) |

### Préstamos
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/v1/prestamos` | todos | Lista (`?estado=activo\|vencido\|devuelto`) |
| POST | `/api/v1/prestamos` | administrador | Presta activo disponible |
| PATCH | `/api/v1/prestamos/{id}/devolver` | administrador · custodio | Registra devolución + condición |

### Dashboard y reportes
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/api/v1/dashboard` | administrador · auditor · custodio(parcial) | Totales, préstamos activos/vencidos, últimos movimientos, por organización |
| GET | `/api/v1/reportes/inventario` | administrador · auditor | PDF de inventario (con filtros) |
| GET | `/api/v1/reportes/movimientos` | administrador · auditor | PDF por rango de fechas |

## 3. Ejemplos

**POST `/api/v1/activos`** (201)
```json
// request
{ "nombre": "Laptop Dell Latitude", "categoria_id": 1, "organizacion_id": 2,
  "marca": "Dell", "modelo": "5440", "serie": "SN-8842", "condicion": "excelente" }
// response
{ "id": 128, "codigo": "CMP-AVZ-014", "estado": "disponible",
  "qr_url": "https://.../activos/128", "creado_en": "2026-07-17T10:22:03" }
```

**POST `/api/v1/prestamos`** con activo no disponible (409)
```json
{ "error": "activo_no_disponible", "mensaje": "El activo no está disponible para préstamo." }
```

**GET `/api/v1/usuarios/{id}`** por un Custodio sobre PII ajena (403)
```json
{ "error": "sin_permiso_pii", "mensaje": "No tienes permiso para ver esta ficha." }
```

## 4. Contrato de cliente — interfaz `ApiClient` (a congelar tras Sprint D)

```typescript
// apps/web/src/lib/api.ts  — un método por endpoint del §2
export type Rol = 'administrador' | 'custodio' | 'auditor';
export type CondicionActivo = 'excelente' | 'bueno' | 'regular' | 'malo' | 'baja';
export type EstadoActivo = 'disponible' | 'asignado' | 'prestado' | 'mantenimiento' | 'baja';
export type EstadoPrestamo = 'activo' | 'vencido' | 'devuelto';
export type EstadoUsuario = 'pendiente' | 'aprobado' | 'rechazado';
export type FiltroUsuarios = EstadoUsuario | 'desactivado'; // 'desactivado' = aprobados con is_active=0
export type TipoMovimiento =
  | 'alta' | 'asignacion' | 'revocacion' | 'prestamo'
  | 'devolucion' | 'transferencia' | 'mantenimiento' | 'baja';

export interface Paginado<T> { data: T[]; meta: { page: number; per_page: number; total: number } }

export interface Organizacion { id: number; nombre: string; clave: string; is_active: boolean }
export interface Categoria { id: number; nombre: string; clave: string; is_active: boolean }
export interface Usuario {
  id: number; nombre: string; email: string; rol: Rol;
  organizacion_id: number; is_active: boolean;
}
export interface Activo {
  id: number; codigo: string; nombre: string; descripcion?: string;
  observaciones?: string | null; // HTML enriquecido (WYSIWYG); saneado en el servidor (añadido tras Sprint 6)
  categoria_id: number; organizacion_id: number;
  marca?: string; modelo?: string; serie?: string;
  fecha_compra?: string; valor_compra?: number; proveedor?: string; factura_numero?: string;
  factura_url?: string; qr_url?: string;
  condicion: CondicionActivo; estado: EstadoActivo; creado_en: string;
}
export interface Asignacion {
  id: number; activo_id: number; usuario_id: number;
  usuario_nombre?: string | null; // enriquecido en asignacion_vigente (sprint de pulido)
  asignada_en: string; revocada_en?: string | null; revocacion_motivo?: string;
}
export interface ActivoACargo { // equipos vigentes a cargo de un usuario (añadido tras Sprint 6)
  id: number; codigo: string; nombre: string;
  condicion: CondicionActivo; estado: EstadoActivo;
}
export interface ActivoPublico { // destino del QR, GET sin login (añadido tras Sprint 7)
  id: number; codigo: string; nombre: string;
  marca?: string; modelo?: string; serie?: string;
  categoria: string | null;
  condicion: CondicionActivo; estado: EstadoActivo;
  custodio_actual: string | null; // solo si estado === 'asignado'
  prestamo_vigente: { prestatario_nombre: string; devolucion_esperada: string } | null; // solo si estado === 'prestado'
}
export interface PrestamoDeUsuario { // préstamos vigentes del usuario como prestatario (añadido tras Sprint 6)
  id: number; activo_id: number;
  activo_codigo: string; activo_nombre: string;
  prestado_en: string; devolucion_esperada: string;
  estado: EstadoPrestamo;
}
export interface Prestamo {
  id: number; activo_id: number; prestatario_id: number; prestamista_id: number;
  // Enriquecidos para la UI (sprint de pulido): código y nombres resueltos por el backend.
  activo_codigo?: string | null; prestatario_nombre?: string | null; prestamista_nombre?: string | null;
  prestado_en: string; devolucion_esperada: string; devuelto_en?: string | null;
  condicion_prestamo: Exclude<CondicionActivo, 'baja'>;
  condicion_devolucion?: Exclude<CondicionActivo, 'baja'>;
  estado: EstadoPrestamo;
}
export interface Movimiento {
  id: number; activo_id: number; tipo: TipoMovimiento;
  activo_codigo?: string | null; activo_nombre?: string | null; // enriquecidos en ultimos_movimientos del dashboard (añadido tras Sprint 6)
  de_usuario_id?: number | null; a_usuario_id?: number | null;
  realizado_por: number; notas?: string; creado_en: string;
}
export interface ResumenDashboard {
  activos_por_estado: Record<EstadoActivo, number>;
  prestamos_activos: number; prestamos_vencidos: number;
  ultimos_movimientos: Movimiento[];
  por_organizacion: { organizacion_id: number; nombre: string; total: number }[];
}

export interface FiltrosActivos {
  q?: string; categoria_id?: number; estado?: EstadoActivo;
  condicion?: CondicionActivo; organizacion_id?: number; page?: number; per_page?: number;
}

export interface ApiClient {
  // sesión
  me(): Promise<Usuario>;
  // organizaciones
  listarOrganizaciones(activa?: boolean): Promise<Organizacion[]>;
  crearOrganizacion(data: { nombre: string; clave: string }): Promise<Organizacion>;
  editarOrganizacion(id: number, data: { nombre: string; clave: string }): Promise<Organizacion>;
  cambiarEstadoOrganizacion(id: number, activa: boolean): Promise<Organizacion>;
  // categorías
  listarCategorias(activa?: boolean): Promise<Categoria[]>;
  crearCategoria(data: { nombre: string; clave: string }): Promise<Categoria>;
  editarCategoria(id: number, data: { nombre: string; clave: string }): Promise<Categoria>;
  cambiarEstadoCategoria(id: number, activa: boolean): Promise<Categoria>;
  // usuarios
  listarUsuarios(page?: number, estado?: FiltroUsuarios): Promise<Paginado<Usuario>>; // 'desactivado' filtra aprobados con is_active=0 (añadido tras Sprint 6)
  crearUsuario(data: { nombre: string; email: string; rol: Rol; organizacion_id: number }): Promise<Usuario>;
  obtenerUsuario(id: number): Promise<Usuario>;               // PII: admin o titular
  editarUsuario(id: number, data: Partial<Pick<Usuario, 'nombre' | 'organizacion_id'>>): Promise<Usuario>;
  cambiarRol(id: number, rol: Rol): Promise<Usuario>;
  desactivarUsuario(id: number): Promise<void>;
  descargarCarta(id: number): Promise<Blob>;                  // PDF; admin o titular
  activosACargo(id: number): Promise<ActivoACargo[]>;         // resguardos vigentes; admin o titular (añadido tras Sprint 6)
  prestamosDeUsuario(id: number): Promise<PrestamoDeUsuario[]>; // préstamos vigentes; admin o titular (añadido tras Sprint 6)
  // activos
  listarActivos(filtros?: FiltrosActivos): Promise<Paginado<Activo>>;
  crearActivo(data: Omit<Activo, 'id' | 'codigo' | 'estado' | 'qr_url' | 'factura_url' | 'creado_en'>): Promise<Activo>;
  obtenerActivo(id: number): Promise<{ activo: Activo; historial: Movimiento[]; asignacion_vigente: Asignacion | null }>; // asignacion_vigente añadido en Sprint 3
  obtenerActivoPublico(id: number): Promise<ActivoPublico>; // público: destino del QR, sin login (añadido tras Sprint 7)
  editarActivo(id: number, data: Partial<Activo>): Promise<Activo>;
  subirFactura(id: number, archivo: File): Promise<{ factura_url: string }>;
  urlFactura(id: number): Promise<{ url: string }>;
  descargarEtiqueta(id: number): Promise<Blob>;               // código + QR imprimible
  darDeBaja(id: number, motivo: string): Promise<Activo>;
  cambiarMantenimiento(id: number, enMantenimiento: boolean): Promise<Activo>;
  // asignaciones
  asignar(data: { activo_id: number; usuario_id: number; notas?: string }): Promise<Asignacion>;
  revocarAsignacion(id: number, motivo: string): Promise<Asignacion>;
  transferir(data: { activo_id: number; nuevo_usuario_id: number; notas?: string }): Promise<Asignacion>;
  // préstamos
  listarPrestamos(estado?: EstadoPrestamo, page?: number): Promise<Paginado<Prestamo>>;
  prestar(data: {
    activo_id: number; prestatario_id: number; devolucion_esperada: string;
    condicion_prestamo: Exclude<CondicionActivo, 'baja'>; notas?: string;
  }): Promise<Prestamo>;
  devolver(id: number, data: { condicion_devolucion: Exclude<CondicionActivo, 'baja'>; notas?: string }): Promise<Prestamo>;
  // dashboard / reportes
  dashboard(): Promise<ResumenDashboard>;
  reporteInventario(filtros?: FiltrosActivos): Promise<Blob>; // PDF
  reporteMovimientos(desde: string, hasta: string): Promise<Blob>; // PDF
}
```

---

*Especificación de API (borrador) · Proyecto SiRe / Grupo OSC Plan Juárez · v1.0 · 2026-07-17*
