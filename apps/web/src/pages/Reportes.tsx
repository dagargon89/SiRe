import { useState } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { api } from '../lib/apiClient'

function abrirBlob(blob: Blob) {
  window.open(URL.createObjectURL(blob), '_blank')
}

export function Reportes() {
  const hoy = new Date().toISOString().slice(0, 10)
  const [desde, setDesde] = useState(hoy.slice(0, 8) + '01')
  const [hasta, setHasta] = useState(hoy)
  const [cargando, setCargando] = useState<string | null>(null)

  async function inventario() {
    setCargando('inv')
    try { abrirBlob(await api.reporteInventario()) } finally { setCargando(null) }
  }
  async function movimientos() {
    setCargando('mov')
    try { abrirBlob(await api.reporteMovimientos(desde, hasta)) } finally { setCargando(null) }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink mb-5">Reportes</h1>

      <Card className="p-6 mb-4">
        <h2 className="text-lg font-semibold text-ink mb-1">Inventario</h2>
        <p className="text-ink-muted text-sm mb-4">PDF con todos los activos y su estado.</p>
        <Button onClick={inventario} disabled={cargando === 'inv'}>
          {cargando === 'inv' ? 'Generando…' : 'Descargar inventario (PDF)'}
        </Button>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-ink mb-1">Movimientos</h2>
        <p className="text-ink-muted text-sm mb-4">PDF de la bitácora por rango de fechas.</p>
        <div className="flex flex-wrap gap-4 items-end">
          <Field label="Desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <Field label="Hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
          <Button onClick={movimientos} disabled={cargando === 'mov'}>
            {cargando === 'mov' ? 'Generando…' : 'Descargar movimientos (PDF)'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
