import { useState } from 'react'
import { Card } from '../components/Card'
import type { Movimiento } from '../lib/api'

const TIPO_LABEL: Record<string, string> = {
  alta: 'Alta', asignacion: 'Asignación', revocacion: 'Revocación', prestamo: 'Préstamo',
  devolucion: 'Devolución', transferencia: 'Transferencia', mantenimiento: 'Mantenimiento', baja: 'Baja', evidencia: 'Foto',
}

type Filtro = 'todos' | 'movimientos' | 'fotos'
const FILTROS: { value: Filtro; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'movimientos', label: 'Movimientos' },
  { value: 'fotos', label: 'Fotos' },
]
const VISIBLES = 10

/** '2026-07-21 09:51:19' → '21/07/2026 09:51' (el mismo formato que los reportes). */
export function fechaCorta(valor?: string): string {
  const m = valor?.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : (valor ?? '')
}

/** Historial del activo: del más reciente al más antiguo, filtrable y acotado. */
export function ActivoHistorial({ historial }: { historial: Movimiento[] }) {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [verTodo, setVerTodo] = useState(false)

  const filtrados = [...historial].reverse().filter((m) =>
    filtro === 'todos' ? true : filtro === 'fotos' ? m.tipo === 'evidencia' : m.tipo !== 'evidencia')
  const visibles = verTodo ? filtrados : filtrados.slice(0, VISIBLES)

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-lg font-semibold text-ink">Historial</h2>
        <div role="group" aria-label="Filtrar historial" className="inline-flex rounded-md border border-border p-0.5 bg-bg">
          {FILTROS.map((f) => (
            <button key={f.value} type="button" aria-pressed={filtro === f.value}
              onClick={() => { setFiltro(f.value); setVerTodo(false) }}
              className={'px-2.5 py-1 rounded text-xs font-semibold transition-colors ' +
                (filtro === f.value ? 'bg-surface text-ink shadow-[var(--sire-shadow)]' : 'text-ink-muted hover:text-ink')}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="text-sm text-ink-muted">Sin registros.</p>
      ) : (
        <ol className="divide-y divide-border">
          {visibles.map((m) => (
            <li key={m.id} className="py-3 first:pt-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-ink">{TIPO_LABEL[m.tipo] ?? m.tipo}</span>
                <time dateTime={m.creado_en} className="text-xs text-ink-muted whitespace-nowrap tabular-nums">
                  {fechaCorta(m.creado_en)}
                </time>
              </div>
              {m.notas && <p className="text-sm text-ink mt-0.5 break-words">{m.notas}</p>}
              {m.realizado_por_nombre && <p className="text-xs text-ink-muted mt-0.5">Por {m.realizado_por_nombre}</p>}
            </li>
          ))}
        </ol>
      )}

      {filtrados.length > VISIBLES && (
        <button type="button" onClick={() => setVerTodo((v) => !v)}
          className="mt-3 text-sm font-semibold text-accent hover:underline">
          {verTodo ? 'Ver menos' : `Ver todo (${filtrados.length})`}
        </button>
      )}
    </Card>
  )
}
