import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './apiClient'
import type { Activo, CondicionActivo, EstadoPrestamo, FiltroUsuarios, FiltrosActivos, Rol } from './api'

// ─── Organizaciones ───────────────────────────────────────────────
export function useOrganizaciones() {
  return useQuery({ queryKey: ['organizaciones'], queryFn: () => api.listarOrganizaciones() })
}

export function useGuardarOrganizacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id?: number; nombre: string; clave: string }) =>
      v.id
        ? api.editarOrganizacion(v.id, { nombre: v.nombre, clave: v.clave })
        : api.crearOrganizacion({ nombre: v.nombre, clave: v.clave }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizaciones'] }),
  })
}

export function useEstadoOrganizacion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: number; activa: boolean }) =>
      api.cambiarEstadoOrganizacion(v.id, v.activa),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['organizaciones'] }),
  })
}

// ─── Categorías ───────────────────────────────────────────────────
export function useCategorias() {
  return useQuery({ queryKey: ['categorias'], queryFn: () => api.listarCategorias() })
}

export function useGuardarCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id?: number; nombre: string; clave: string }) =>
      v.id
        ? api.editarCategoria(v.id, { nombre: v.nombre, clave: v.clave })
        : api.crearCategoria({ nombre: v.nombre, clave: v.clave }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  })
}

export function useEstadoCategoria() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: number; activa: boolean }) => api.cambiarEstadoCategoria(v.id, v.activa),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categorias'] }),
  })
}

// ─── Usuarios ─────────────────────────────────────────────────────
export function useUsuarios(page = 1, estado?: FiltroUsuarios) {
  return useQuery({ queryKey: ['usuarios', page, estado], queryFn: () => api.listarUsuarios(page, estado) })
}

export function useActivosACargo(id: number | undefined) {
  return useQuery({
    queryKey: ['activos-a-cargo', id],
    queryFn: () => api.activosACargo(id!),
    enabled: id != null,
  })
}

export function usePrestamosDeUsuario(id: number | undefined) {
  return useQuery({
    queryKey: ['prestamos-de-usuario', id],
    queryFn: () => api.prestamosDeUsuario(id!),
    enabled: id != null,
  })
}

export function useUsuario(id: number | undefined) {
  return useQuery({
    queryKey: ['usuario', id],
    queryFn: () => api.obtenerUsuario(id!),
    enabled: id != null,
  })
}

export function useAprobarUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: number; rol: Rol; organizacion_id: number }) =>
      api.aprobarUsuario(v.id, { rol: v.rol, organizacion_id: v.organizacion_id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

export function useRechazarUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.rechazarUsuario(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

export function useCrearUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { nombre: string; email: string; rol: Rol; organizacion_id: number }) =>
      api.crearUsuario(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

export function useCambiarRol() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: number; rol: Rol }) => api.cambiarRol(v.id, v.rol),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}

export function useDesactivarUsuario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.desactivarUsuario(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })
}


// ─── Activos ──────────────────────────────────────────────────────
export function useActivos(filtros: FiltrosActivos) {
  return useQuery({
    queryKey: ['activos', filtros],
    queryFn: () => api.listarActivos(filtros),
  })
}

export function useActivo(id: number) {
  return useQuery({ queryKey: ['activo', id], queryFn: () => api.obtenerActivo(id) })
}

/** Ficha pública (sin login) para la página destino del QR. */
export function useActivoPublico(id: number) {
  return useQuery({ queryKey: ['activo-publico', id], queryFn: () => api.obtenerActivoPublico(id) })
}

type NuevoActivo = Omit<Activo, 'id' | 'codigo' | 'estado' | 'qr_url' | 'creado_en'>

export function useGuardarActivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id?: number; datos: NuevoActivo }) =>
      v.id ? api.editarActivo(v.id, v.datos) : api.crearActivo(v.datos),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ['activos'] })
      if (v.id) qc.invalidateQueries({ queryKey: ['activo', v.id] })
    },
  })
}

export function useDarDeBaja() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: number; motivo: string }) => api.darDeBaja(v.id, v.motivo),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ['activos'] })
      qc.invalidateQueries({ queryKey: ['activo', v.id] })
    },
  })
}

export function useMantenimiento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: number; enMantenimiento: boolean }) =>
      api.cambiarMantenimiento(v.id, v.enMantenimiento),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ['activos'] })
      qc.invalidateQueries({ queryKey: ['activo', v.id] })
    },
  })
}

// ─── Resguardos ───────────────────────────────────────────────────
function invalidarActivo(qc: ReturnType<typeof useQueryClient>, activoId: number) {
  qc.invalidateQueries({ queryKey: ['activos'] })
  qc.invalidateQueries({ queryKey: ['activo', activoId] })
}

export function useAsignar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { activo_id: number; usuario_id: number; notas?: string }) => api.asignar(v),
    onSuccess: (_r, v) => invalidarActivo(qc, v.activo_id),
  })
}

export function useRevocar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: number; motivo: string; activo_id: number }) =>
      api.revocarAsignacion(v.id, v.motivo),
    onSuccess: (_r, v) => invalidarActivo(qc, v.activo_id),
  })
}

export function useTransferir() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { activo_id: number; nuevo_usuario_id: number; notas?: string }) => api.transferir(v),
    onSuccess: (_r, v) => invalidarActivo(qc, v.activo_id),
  })
}

// ─── Dashboard ────────────────────────────────────────────────────
export function useDashboard() {
  return useQuery({ queryKey: ['dashboard'], queryFn: () => api.dashboard(), staleTime: 15_000 })
}

// ─── Préstamos ────────────────────────────────────────────────────
export function usePrestamos(estado?: EstadoPrestamo, page = 1) {
  return useQuery({ queryKey: ['prestamos', estado, page], queryFn: () => api.listarPrestamos(estado, page) })
}

export function usePrestar() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: {
      activo_id: number; prestatario_id: number; devolucion_esperada: string
      condicion_prestamo: Exclude<CondicionActivo, 'baja'>; notas?: string
    }) => api.prestar(v),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: ['prestamos'] })
      invalidarActivo(qc, v.activo_id)
    },
  })
}

export function useDevolver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: number; condicion_devolucion: Exclude<CondicionActivo, 'baja'>; notas?: string }) =>
      api.devolver(v.id, { condicion_devolucion: v.condicion_devolucion, notas: v.notas }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prestamos'] })
      qc.invalidateQueries({ queryKey: ['activos'] })
    },
  })
}
