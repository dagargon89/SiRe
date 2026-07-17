import { Card } from '../components/Card'
import { KpiCard } from '../components/KpiCard'
import { useDashboard } from '../lib/queries'
import type { EstadoActivo } from '../lib/api'

const TIPO_LABEL: Record<string, string> = {
  alta: 'Alta', asignacion: 'Asignación', revocacion: 'Revocación', prestamo: 'Préstamo',
  devolucion: 'Devolución', transferencia: 'Transferencia', mantenimiento: 'Mantenimiento', baja: 'Baja',
}

const ESTADO_LABEL: Record<EstadoActivo, string> = {
  disponible: 'Disponibles', asignado: 'Asignados', prestado: 'Prestados',
  mantenimiento: 'Mantenimiento', baja: 'Baja',
}

export function Dashboard() {
  const q = useDashboard()

  if (q.isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5"><div className="h-14 animate-pulse bg-surface-2 rounded" /></Card>
        ))}
      </div>
    )
  }
  if (q.isError || !q.data) return <Card className="p-4 border-danger text-danger">No se pudo cargar el dashboard.</Card>

  const d = q.data
  const total = Object.values(d.activos_por_estado).reduce((a, b) => a + b, 0)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink mb-5">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Activos totales" value={total} />
        <KpiCard label="Disponibles" value={d.activos_por_estado.disponible} tone="success" />
        <KpiCard label="Préstamos activos" value={d.prestamos_activos} tone="accent" />
        <KpiCard label="Préstamos vencidos" value={d.prestamos_vencidos} tone="danger" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold text-ink mb-3">Activos por estado</h2>
          <Card className="p-4">
            <ul className="text-sm divide-y divide-border">
              {(Object.keys(ESTADO_LABEL) as EstadoActivo[]).map((e) => (
                <li key={e} className="flex justify-between py-2">
                  <span className="text-ink-muted">{ESTADO_LABEL[e]}</span>
                  <span className="tabular-nums font-medium">{d.activos_por_estado[e]}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {d.por_organizacion.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-ink mb-3">Por organización</h2>
            <Card className="p-4">
              <ul className="text-sm divide-y divide-border">
                {d.por_organizacion.map((o) => (
                  <li key={o.organizacion_id} className="flex justify-between py-2">
                    <span className="text-ink-muted">{o.nombre}</span>
                    <span className="tabular-nums font-medium">{o.total}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </div>

      {d.ultimos_movimientos.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-ink mb-3">Últimos movimientos</h2>
          <Card className="p-4">
            <ol className="text-sm space-y-2">
              {d.ultimos_movimientos.map((m) => (
                <li key={m.id} className="flex gap-3">
                  <span className="text-ink-muted whitespace-nowrap">{m.creado_en?.slice(0, 16).replace('T', ' ')}</span>
                  <span className="font-medium">{TIPO_LABEL[m.tipo] ?? m.tipo}</span>
                  <span className="text-ink-muted">activo #{m.activo_id}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      )}
    </div>
  )
}
