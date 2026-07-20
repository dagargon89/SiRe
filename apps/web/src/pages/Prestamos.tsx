import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Modal } from '../components/Modal'
import { Select } from '../components/Select'
import { Pagination } from '../components/Pagination'
import { EstadoPrestamoBadge } from '../components/Badge'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { usePrestamos, useDevolver } from '../lib/queries'
import { ApiError, type CondicionActivo, type EstadoPrestamo, type Prestamo } from '../lib/api'

const FILTROS: { value: EstadoPrestamo | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'activo', label: 'Activos' },
  { value: 'vencido', label: 'Vencidos' },
  { value: 'devuelto', label: 'Devueltos' },
]

export function Prestamos() {
  const { perfil } = useAuth()
  const [estado, setEstado] = useState<EstadoPrestamo | ''>('')
  const [page, setPage] = useState(1)
  const q = usePrestamos(estado || undefined, page)
  const [devolviendo, setDevolviendo] = useState<Prestamo | null>(null)

  function cambiarFiltro(e: EstadoPrestamo | '') {
    setEstado(e)
    setPage(1)
  }

  const puedeDevolver = perfil?.rol === 'administrador' || perfil?.rol === 'custodio'

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink mb-5">Préstamos</h1>

      <div className="flex gap-2 mb-4">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => cambiarFiltro(f.value)}
            className={
              'px-3 py-1.5 rounded-md text-sm border ' +
              (estado === f.value ? 'bg-primary text-primary-contrast border-primary' : 'border-border text-ink hover:bg-surface-2')
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {q.isLoading && <p className="text-ink-muted py-8">Cargando…</p>}
      {q.isError && <Card className="p-4 border-danger text-danger text-sm">No se pudo cargar.</Card>}
      {q.data && q.data.data.length === 0 && (
        <p className="text-center text-ink-muted py-12">No hay préstamos.</p>
      )}

      {q.data && q.data.data.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-muted border-b border-border">
                <th className="px-4 py-3 font-medium">Activo</th>
                <th className="px-4 py-3 font-medium">Prestatario</th>
                <th className="px-4 py-3 font-medium">Devolución esperada</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody>
              {q.data.data.map((p) => (
                <tr
                  key={p.id}
                  className={
                    'border-b border-border last:border-0 hover:bg-surface-2 ' +
                    (p.estado === 'vencido' ? 'bg-danger/5' : '')
                  }
                >
                  <td className="px-4 py-3">
                    <Link to={`/activos/${p.activo_id}`} className="text-accent hover:underline font-mono">
                      {p.activo_codigo ?? `#${p.activo_id}`}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{p.prestatario_nombre ?? `#${p.prestatario_id}`}</td>
                  <td className="px-4 py-3 tabular-nums">{p.devolucion_esperada?.slice(0, 16).replace('T', ' ')}</td>
                  <td className="px-4 py-3"><EstadoPrestamoBadge estado={p.estado} /></td>
                  <td className="px-4 py-3 text-right">
                    {p.estado !== 'devuelto' && puedeDevolver && (
                      <button className="text-accent hover:underline" onClick={() => setDevolviendo(p)}>
                        Devolver
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {q.data && (
        <Pagination page={page} perPage={q.data.meta.per_page} total={q.data.meta.total} onPage={setPage} />
      )}

      {devolviendo && (
        <ModalDevolver prestamo={devolviendo} onCerrar={() => setDevolviendo(null)} />
      )}
    </div>
  )
}

function ModalDevolver({ prestamo, onCerrar }: { prestamo: Prestamo; onCerrar: () => void }) {
  const devolver = useDevolver()
  const toast = useToast()
  const [condicion, setCondicion] = useState<Exclude<CondicionActivo, 'baja'>>('bueno')
  const [enviando, setEnviando] = useState(false)

  return (
    <Modal title={`Devolver préstamo (activo #${prestamo.activo_id})`} onClose={onCerrar}>
      <div className="flex flex-col gap-4">
        <Select
          label="Condición de devolución"
          value={condicion}
          onChange={(v) => setCondicion(v as Exclude<CondicionActivo, 'baja'>)}
          options={(['excelente', 'bueno', 'regular', 'malo'] as const).map((c) => ({ value: c, label: c }))}
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button
            disabled={enviando}
            onClick={async () => {
              setEnviando(true)
              try {
                await devolver.mutateAsync({ id: prestamo.id, condicion_devolucion: condicion })
                toast.exito('Devolución registrada')
                onCerrar()
              } catch (e) {
                toast.error(e instanceof ApiError ? e.message : 'No se pudo devolver')
                setEnviando(false)
              }
            }}
          >
            Registrar devolución
          </Button>
        </div>
      </div>
    </Modal>
  )
}
