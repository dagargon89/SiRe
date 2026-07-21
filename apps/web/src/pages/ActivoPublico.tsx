import { Link, useParams } from 'react-router-dom'
import { Card } from '../components/Card'
import { EstadoActivoBadge } from '../components/Badge'
import { useActivoPublico } from '../lib/queries'

/**
 * Destino del QR impreso en la etiqueta del activo. Pública y de solo
 * lectura: no requiere login (GET /activos/{id}/publico, sin auth).
 */
export function ActivoPublico() {
  const { id } = useParams()
  const activoId = Number(id)
  const q = useActivoPublico(activoId)

  return (
    <div className="min-h-screen bg-bg grid place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 justify-center mb-5">
          <span
            className="w-[30px] h-[30px] rounded-[7px] grid place-items-center font-bold text-sm text-white flex-none"
            style={{ background: '#2E7D9A' }}
          >
            S
          </span>
          <span className="font-bold text-base text-ink">SiRe</span>
        </div>

        {q.isLoading && <p className="text-ink-muted text-center py-8">Cargando…</p>}

        {q.isError && (
          <Card className="p-6 border-danger text-danger text-center">
            No se pudo cargar la información de este activo.
          </Card>
        )}

        {q.data && (
          <Card className="p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h1 className="text-xl font-semibold text-ink">{q.data.nombre}</h1>
                <p className="font-mono text-sm text-ink-muted">{q.data.codigo}</p>
              </div>
              <EstadoActivoBadge estado={q.data.estado} />
            </div>

            <dl className="grid grid-cols-2 gap-4 text-sm">
              <Dato k="Categoría" v={q.data.categoria} />
              <Dato k="Condición" v={q.data.condicion} />
              <Dato k="Marca" v={q.data.marca} />
              <Dato k="Modelo" v={q.data.modelo} />
              <Dato k="Serie" v={q.data.serie} />
              {q.data.custodio_actual && <Dato k="Custodio actual" v={q.data.custodio_actual} />}
              {q.data.prestamo_vigente && (
                <>
                  <Dato k="Prestado a" v={q.data.prestamo_vigente.prestatario_nombre} />
                  <Dato
                    k="Devolución esperada"
                    v={q.data.prestamo_vigente.devolucion_esperada.slice(0, 16).replace('T', ' ')}
                  />
                </>
              )}
            </dl>
          </Card>
        )}

        <p className="text-center text-xs text-ink-muted mt-4">
          <Link to="/" className="text-accent hover:underline">Iniciar sesión</Link> para ver el historial completo.
        </p>
      </div>
    </div>
  )
}

function Dato({ k, v }: { k: string; v?: string | null }) {
  return (
    <div>
      <dt className="text-ink-muted">{k}</dt>
      <dd className="text-ink">{v || '—'}</dd>
    </div>
  )
}
