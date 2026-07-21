// apps/web/src/lib/api.ts — contrato ApiClient CONGELADO tras Sprint D.
// Fuente de verdad: SiRe_documentacion/05-api/05_especificacion_api.md §4.
// Cualquier cambio aquí debe reflejarse en el doc 05 en la misma sesión (Gobernanza v3).

export type Rol = 'administrador' | 'custodio' | 'auditor'
export type EstadoUsuario = 'pendiente' | 'aprobado' | 'rechazado'
/** Filtro de la lista de usuarios: estados reales + 'desactivado' (virtual: aprobados con is_active=0). */
export type FiltroUsuarios = EstadoUsuario | 'desactivado'
export type CondicionActivo = 'excelente' | 'bueno' | 'regular' | 'malo' | 'baja'
export type EstadoActivo = 'disponible' | 'asignado' | 'prestado' | 'mantenimiento' | 'baja'
export type EstadoPrestamo = 'activo' | 'vencido' | 'devuelto'
export type TipoMovimiento =
  | 'alta' | 'asignacion' | 'revocacion' | 'prestamo'
  | 'devolucion' | 'transferencia' | 'mantenimiento' | 'baja'

export interface Paginado<T> { data: T[]; meta: { page: number; per_page: number; total: number } }

export interface Organizacion { id: number; nombre: string; clave: string; is_active: boolean }
export interface Categoria { id: number; nombre: string; clave: string; is_active: boolean }
export interface Usuario {
  id: number; nombre: string; email: string; rol: Rol
  organizacion_id: number | null; is_active: boolean
  estado?: EstadoUsuario           // auto-registro con aprobación
}
export interface Activo {
  id: number; codigo: string; nombre: string; descripcion?: string
  observaciones?: string | null          // HTML enriquecido (WYSIWYG), saneado en el servidor
  categoria_id: number; organizacion_id: number
  marca?: string; modelo?: string; serie?: string
  fecha_compra?: string; valor_compra?: number; proveedor?: string; factura_numero?: string
  factura_url?: string; qr_url?: string
  condicion: CondicionActivo; estado: EstadoActivo; creado_en: string
}
export interface Asignacion {
  id: number; activo_id: number; usuario_id: number
  usuario_nombre?: string | null          // enriquecido en la ficha (sprint pulido)
  asignada_en: string; revocada_en?: string | null; revocacion_motivo?: string
}
/** Ficha reducida y de solo lectura para el destino público del QR (GET /activos/{id}/publico, sin login). */
export interface ActivoPublico {
  id: number; codigo: string; nombre: string
  marca?: string; modelo?: string; serie?: string
  categoria: string | null
  condicion: CondicionActivo; estado: EstadoActivo
  custodio_actual: string | null       // solo si estado === 'asignado'
  prestamo_vigente: { prestatario_nombre: string; devolucion_esperada: string } | null  // solo si estado === 'prestado'
}
/** Equipo vigente a cargo de un usuario (GET /usuarios/{id}/activos). */
export interface ActivoACargo {
  id: number; codigo: string; nombre: string
  condicion: CondicionActivo; estado: EstadoActivo
}
/** Préstamo vigente de un usuario como prestatario (GET /usuarios/{id}/prestamos). */
export interface PrestamoDeUsuario {
  id: number; activo_id: number
  activo_codigo: string; activo_nombre: string
  prestado_en: string; devolucion_esperada: string
  estado: EstadoPrestamo
}
export interface Prestamo {
  id: number; activo_id: number; prestatario_id: number; prestamista_id: number
  activo_codigo?: string | null           // enriquecido para la UI (Sprint pulido)
  prestatario_nombre?: string | null
  prestamista_nombre?: string | null
  prestado_en: string; devolucion_esperada: string; devuelto_en?: string | null
  condicion_prestamo: Exclude<CondicionActivo, 'baja'>
  condicion_devolucion?: Exclude<CondicionActivo, 'baja'>
  estado: EstadoPrestamo
}
export interface Movimiento {
  id: number; activo_id: number; tipo: TipoMovimiento
  activo_codigo?: string | null            // enriquecido en ultimos_movimientos del dashboard
  activo_nombre?: string | null
  de_usuario_id?: number | null; a_usuario_id?: number | null
  realizado_por: number; notas?: string; creado_en: string
}
export interface ResumenDashboard {
  activos_por_estado: Record<EstadoActivo, number>
  prestamos_activos: number; prestamos_vencidos: number
  ultimos_movimientos: Movimiento[]
  por_organizacion: { organizacion_id: number; nombre: string; total: number }[]
}

export interface FiltrosActivos {
  q?: string; categoria_id?: number; estado?: EstadoActivo
  condicion?: CondicionActivo; organizacion_id?: number; page?: number; per_page?: number
}

export interface ApiClient {
  // sesión
  me(): Promise<Usuario>
  // organizaciones
  listarOrganizaciones(activa?: boolean): Promise<Organizacion[]>
  crearOrganizacion(data: { nombre: string; clave: string }): Promise<Organizacion>
  editarOrganizacion(id: number, data: { nombre: string; clave: string }): Promise<Organizacion>
  cambiarEstadoOrganizacion(id: number, activa: boolean): Promise<Organizacion>
  // categorías
  listarCategorias(activa?: boolean): Promise<Categoria[]>
  crearCategoria(data: { nombre: string; clave: string }): Promise<Categoria>
  editarCategoria(id: number, data: { nombre: string; clave: string }): Promise<Categoria>
  cambiarEstadoCategoria(id: number, activa: boolean): Promise<Categoria>
  // usuarios
  listarUsuarios(page?: number, estado?: FiltroUsuarios): Promise<Paginado<Usuario>>
  crearUsuario(data: { nombre: string; email: string; rol: Rol; organizacion_id: number }): Promise<Usuario>
  obtenerUsuario(id: number): Promise<Usuario>               // PII: admin o titular
  editarUsuario(id: number, data: Partial<Pick<Usuario, 'nombre' | 'organizacion_id'>>): Promise<Usuario>
  cambiarRol(id: number, rol: Rol): Promise<Usuario>
  aprobarUsuario(id: number, data: { rol: Rol; organizacion_id: number }): Promise<Usuario>
  rechazarUsuario(id: number): Promise<Usuario>
  desactivarUsuario(id: number): Promise<void>
  descargarCarta(id: number): Promise<Blob>                  // PDF; admin o titular
  activosACargo(id: number): Promise<ActivoACargo[]>         // resguardos vigentes; admin o titular
  prestamosDeUsuario(id: number): Promise<PrestamoDeUsuario[]> // préstamos vigentes; admin o titular
  // activos
  listarActivos(filtros?: FiltrosActivos): Promise<Paginado<Activo>>
  crearActivo(data: Omit<Activo, 'id' | 'codigo' | 'estado' | 'qr_url' | 'factura_url' | 'creado_en'>): Promise<Activo>
  obtenerActivo(id: number): Promise<{ activo: Activo; historial: Movimiento[]; asignacion_vigente: Asignacion | null }>
  obtenerActivoPublico(id: number): Promise<ActivoPublico>  // público: destino del QR, sin login
  editarActivo(id: number, data: Partial<Activo>): Promise<Activo>
  subirFactura(id: number, archivo: File): Promise<{ factura_url: string }>
  urlFactura(id: number): Promise<{ url: string }>
  descargarEtiqueta(id: number): Promise<Blob>               // código + QR imprimible
  darDeBaja(id: number, motivo: string): Promise<Activo>
  cambiarMantenimiento(id: number, enMantenimiento: boolean): Promise<Activo>
  // asignaciones
  asignar(data: { activo_id: number; usuario_id: number; notas?: string }): Promise<Asignacion>
  revocarAsignacion(id: number, motivo: string): Promise<Asignacion>
  transferir(data: { activo_id: number; nuevo_usuario_id: number; notas?: string }): Promise<Asignacion>
  // préstamos
  listarPrestamos(estado?: EstadoPrestamo, page?: number): Promise<Paginado<Prestamo>>
  prestar(data: {
    activo_id: number; prestatario_id: number; devolucion_esperada: string
    condicion_prestamo: Exclude<CondicionActivo, 'baja'>; notas?: string
  }): Promise<Prestamo>
  devolver(id: number, data: { condicion_devolucion: Exclude<CondicionActivo, 'baja'>; notas?: string }): Promise<Prestamo>
  // dashboard / reportes
  dashboard(): Promise<ResumenDashboard>
  reporteInventario(filtros?: FiltrosActivos): Promise<Blob>  // PDF
  reporteMovimientos(desde: string, hasta: string): Promise<Blob> // PDF
}

// ─────────────────────────────────────────────────────────────
// Implementación fetch del contrato.
// ─────────────────────────────────────────────────────────────

/** Error tipado que refleja el cuerpo de error del API (doc 05 §1). */
export class ApiError extends Error {
  status: number
  codigo: string
  detalles?: Record<string, string[]>

  constructor(
    status: number,
    codigo: string,
    mensaje: string,
    detalles?: Record<string, string[]>,
  ) {
    super(mensaje)
    this.name = 'ApiError'
    this.status = status
    this.codigo = codigo
    this.detalles = detalles
  }
}

export interface ApiClientOptions {
  baseUrl?: string
  /** Devuelve el Firebase ID token vigente (o null si no hay sesión). */
  getToken: () => Promise<string | null>
}

const DEFAULT_BASE_URL =
  (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? '/api/v1'

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return ''
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ''
}

export function createApiClient(opts: ApiClientOptions): ApiClient {
  const baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '')

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    expect: 'json' | 'blob' | 'void' = 'json',
  ): Promise<T> {
    const token = await opts.getToken()
    const headers: Record<string, string> = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    let payload: BodyInit | undefined
    if (body instanceof FormData) {
      payload = body
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }

    const res = await fetch(`${baseUrl}${path}`, { method, headers, body: payload })

    if (!res.ok) {
      let codigo = 'error'
      let mensaje = res.statusText
      let detalles: Record<string, string[]> | undefined
      try {
        const err = await res.json()
        codigo = err.error ?? codigo
        mensaje = err.mensaje ?? mensaje
        detalles = err.detalles
      } catch {
        /* respuesta sin cuerpo JSON */
      }
      throw new ApiError(res.status, codigo, mensaje, detalles)
    }

    if (expect === 'void' || res.status === 204) return undefined as T
    if (expect === 'blob') return (await res.blob()) as T
    return (await res.json()) as T
  }

  return {
    me: () => request('GET', '/me'),

    listarOrganizaciones: (activa) =>
      request('GET', `/organizaciones${toQuery({ activa })}`),
    crearOrganizacion: (data) => request('POST', '/organizaciones', data),
    editarOrganizacion: (id, data) => request('PUT', `/organizaciones/${id}`, data),
    cambiarEstadoOrganizacion: (id, activa) =>
      request('PATCH', `/organizaciones/${id}/estado`, { activa }),

    listarCategorias: (activa) => request('GET', `/categorias${toQuery({ activa })}`),
    crearCategoria: (data) => request('POST', '/categorias', data),
    editarCategoria: (id, data) => request('PUT', `/categorias/${id}`, data),
    cambiarEstadoCategoria: (id, activa) =>
      request('PATCH', `/categorias/${id}/estado`, { activa }),

    listarUsuarios: (page, estado) => request('GET', `/usuarios${toQuery({ page, estado })}`),
    crearUsuario: (data) => request('POST', '/usuarios', data),
    obtenerUsuario: (id) => request('GET', `/usuarios/${id}`),
    editarUsuario: (id, data) => request('PUT', `/usuarios/${id}`, data),
    cambiarRol: (id, rol) => request('PATCH', `/usuarios/${id}/rol`, { rol }),
    aprobarUsuario: (id, data) => request('PATCH', `/usuarios/${id}/aprobar`, data),
    rechazarUsuario: (id) => request('PATCH', `/usuarios/${id}/rechazar`, undefined),
    desactivarUsuario: (id) => request('PATCH', `/usuarios/${id}/desactivar`, undefined, 'void'),
    descargarCarta: (id) => request('GET', `/usuarios/${id}/carta`, undefined, 'blob'),
    activosACargo: (id) => request('GET', `/usuarios/${id}/activos`),
    prestamosDeUsuario: (id) => request('GET', `/usuarios/${id}/prestamos`),

    listarActivos: (filtros) =>
      request('GET', `/activos${toQuery(filtros as Record<string, unknown> | undefined)}`),
    crearActivo: (data) => request('POST', '/activos', data),
    obtenerActivo: (id) => request('GET', `/activos/${id}`),
    obtenerActivoPublico: (id) => request('GET', `/activos/${id}/publico`),
    editarActivo: (id, data) => request('PUT', `/activos/${id}`, data),
    subirFactura: (id, archivo) => {
      const fd = new FormData()
      fd.append('archivo', archivo)
      return request('POST', `/activos/${id}/factura`, fd)
    },
    urlFactura: (id) => request('GET', `/activos/${id}/factura`),
    descargarEtiqueta: (id) => request('GET', `/activos/${id}/etiqueta`, undefined, 'blob'),
    darDeBaja: (id, motivo) => request('PATCH', `/activos/${id}/baja`, { motivo }),
    cambiarMantenimiento: (id, enMantenimiento) =>
      request('PATCH', `/activos/${id}/mantenimiento`, { en_mantenimiento: enMantenimiento }),

    asignar: (data) => request('POST', '/asignaciones', data),
    revocarAsignacion: (id, motivo) => request('PATCH', `/asignaciones/${id}/revocar`, { motivo }),
    transferir: (data) => request('POST', '/asignaciones/transferir', data),

    listarPrestamos: (estado, page) => request('GET', `/prestamos${toQuery({ estado, page })}`),
    prestar: (data) => request('POST', '/prestamos', data),
    devolver: (id, data) => request('PATCH', `/prestamos/${id}/devolver`, data),

    dashboard: () => request('GET', '/dashboard'),
    reporteInventario: (filtros) =>
      request('GET', `/reportes/inventario${toQuery(filtros as Record<string, unknown> | undefined)}`, undefined, 'blob'),
    reporteMovimientos: (desde, hasta) =>
      request('GET', `/reportes/movimientos${toQuery({ desde, hasta })}`, undefined, 'blob'),
  }
}
