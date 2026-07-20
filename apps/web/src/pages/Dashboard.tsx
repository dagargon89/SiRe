import { Card } from '../components/Card'
import { KpiCard } from '../components/KpiCard'
import { Button } from '../components/Button'
import { useDashboard } from '../lib/queries'
import type { EstadoActivo, Movimiento } from '../lib/api'

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
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="text-lg font-semibold text-ink">Últimos movimientos</h2>
            <Button variant="secondary" onClick={() => descargarMovimientosCsv(d.ultimos_movimientos)}>
              Descargar Excel (CSV)
            </Button>
          </div>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-muted border-b border-border">
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Activo</th>
                </tr>
              </thead>
              <tbody>
                {d.ultimos_movimientos.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-ink-muted whitespace-nowrap">{fechaCorta(m.creado_en)}</td>
                    <td className="px-4 py-3 font-medium">{TIPO_LABEL[m.tipo] ?? m.tipo}</td>
                    <td className="px-4 py-3 font-mono">{m.activo_codigo ?? `#${m.activo_id}`}</td>
                    <td className="px-4 py-3">{m.activo_nombre ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  )
}

function fechaCorta(s?: string): string {
  return s ? s.slice(0, 16).replace('T', ' ') : ''
}

/** Genera y descarga un CSV (compatible con Excel: BOM UTF-8 + CRLF) de los movimientos mostrados. */
function descargarMovimientosCsv(movimientos: Movimiento[]): void {
  const encabezados = ['Fecha', 'Tipo', 'Código', 'Activo']
  const filas = movimientos.map((m) => [
    fechaCorta(m.creado_en),
    TIPO_LABEL[m.tipo] ?? m.tipo,
    m.activo_codigo ?? `#${m.activo_id}`,
    m.activo_nombre ?? '',
  ])
  const escapar = (v: string) => `"${v.replace(/"/g, '""')}"`
  const csv = [encabezados, ...filas].map((fila) => fila.map(escapar).join(',')).join('\r\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = 'ultimos-movimientos.csv'
  enlace.click()
  URL.revokeObjectURL(url)
}
