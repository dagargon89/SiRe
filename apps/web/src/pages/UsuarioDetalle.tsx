import { Link, useParams } from 'react-router-dom'
import { Card } from '../components/Card'
import { EstadoActivoBadge, EstadoPrestamoBadge } from '../components/Badge'
import { useUsuario, useOrganizaciones, useActivosACargo, usePrestamosDeUsuario } from '../lib/queries'

const ROL_LABEL: Record<string, string> = {
  administrador: 'Administrador', custodio: 'Custodio', auditor: 'Auditor',
}
const CONDICION_LABEL: Record<string, string> = {
  excelente: 'Excelente', bueno: 'Bueno', regular: 'Regular', malo: 'Malo', baja: 'Baja',
}
const ESTADO_USUARIO_LABEL: Record<string, string> = {
  pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado',
}

function fechaCorta(s?: string): string {
  return s ? s.slice(0, 10) : ''
}

export function UsuarioDetalle() {
  const { id } = useParams()
  const usuarioId = id ? Number(id) : undefined

  const usuario = useUsuario(usuarioId)
  const orgs = useOrganizaciones()
  const equipos = useActivosACargo(usuarioId)
  const prestamos = usePrestamosDeUsuario(usuarioId)

  if (usuario.isLoading) return <p className="text-ink-muted py-8">Cargando…</p>
  if (usuario.isError || !usuario.data) {
    return <Card className="p-4 border-danger text-danger text-sm">No se pudo cargar el usuario.</Card>
  }

  const u = usuario.data
  const nombreOrg =
    u.organizacion_id == null
      ? '—'
      : (orgs.data?.find((o) => o.id === u.organizacion_id)?.nombre ?? '—')

  const activos = equipos.data ?? []
  const items = prestamos.data ?? []

  return (
    <div className="max-w-3xl">
      <Link to="/usuarios" className="text-sm text-accent hover:underline">← Usuarios</Link>
      <h1 className="text-2xl font-semibold text-ink mt-2 mb-5">{u.nombre}</h1>

      <Card className="p-6 grid grid-cols-2 gap-4 mb-6 text-sm">
        <Dato etiqueta="Correo" valor={u.email} />
        <Dato etiqueta="Rol" valor={ROL_LABEL[u.rol] ?? u.rol} />
        <Dato etiqueta="Organización de origen" valor={nombreOrg} />
        <Dato etiqueta="Estado" valor={u.estado ? (ESTADO_USUARIO_LABEL[u.estado] ?? u.estado) : '—'} />
      </Card>

      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-semibold text-ink">Resguardos a su cargo</h2>
        {!equipos.isLoading && <span className="text-sm text-ink-muted">({activos.length})</span>}
      </div>
      <Card className="overflow-x-auto mb-8">
        {equipos.isLoading ? (
          <p className="p-6 text-sm text-ink-muted">Cargando resguardos…</p>
        ) : activos.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">Sin equipos asignados actualmente.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-muted border-b border-border">
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Activo</th>
                <th className="px-4 py-3 font-medium">Condición</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {activos.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono">
                    <Link to={`/activos/${a.id}`} className="text-accent hover:underline">{a.codigo}</Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{a.nombre}</td>
                  <td className="px-4 py-3 text-ink-muted">{CONDICION_LABEL[a.condicion] ?? a.condicion}</td>
                  <td className="px-4 py-3"><EstadoActivoBadge estado={a.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-semibold text-ink">Préstamos vigentes</h2>
        {!prestamos.isLoading && <span className="text-sm text-ink-muted">({items.length})</span>}
      </div>
      <Card className="overflow-x-auto">
        {prestamos.isLoading ? (
          <p className="p-6 text-sm text-ink-muted">Cargando préstamos…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">Sin préstamos vigentes.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-muted border-b border-border">
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Activo</th>
                <th className="px-4 py-3 font-medium">Prestado</th>
                <th className="px-4 py-3 font-medium">Devolución</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono">
                    <Link to={`/activos/${p.activo_id}`} className="text-accent hover:underline">{p.activo_codigo}</Link>
                  </td>
                  <td className="px-4 py-3 text-ink">{p.activo_nombre}</td>
                  <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{fechaCorta(p.prestado_en)}</td>
                  <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{fechaCorta(p.devolucion_esperada)}</td>
                  <td className="px-4 py-3"><EstadoPrestamoBadge estado={p.estado} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <div className="text-ink-muted">{etiqueta}</div>
      <div className="text-ink font-medium">{valor}</div>
    </div>
  )
}
