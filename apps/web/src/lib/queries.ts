import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './apiClient'
import type { Activo, FiltrosActivos, Rol } from './api'

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
export function useUsuarios(page = 1) {
  return useQuery({ queryKey: ['usuarios', page], queryFn: () => api.listarUsuarios(page) })
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

type NuevoActivo = Omit<Activo, 'id' | 'codigo' | 'estado' | 'qr_url' | 'factura_url' | 'creado_en'>

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
