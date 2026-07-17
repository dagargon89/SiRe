import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Modal } from '../components/Modal'
import { EstadoActivoBadge } from '../components/Badge'
import { useAuth } from '../lib/auth'
import { api } from '../lib/apiClient'
import { useActivo, useDarDeBaja, useMantenimiento } from '../lib/queries'

const TIPO_LABEL: Record<string, string> = {
  alta: 'Alta', asignacion: 'Asignación', revocacion: 'Revocación', prestamo: 'Préstamo',
  devolucion: 'Devolución', transferencia: 'Transferencia', mantenimiento: 'Mantenimiento', baja: 'Baja',
}

export function ActivoFicha() {
  const { id } = useParams()
  const activoId = Number(id)
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const q = useActivo(activoId)
  const baja = useDarDeBaja()
  const mant = useMantenimiento()
  const [modalBaja, setModalBaja] = useState(false)

  if (q.isLoading) return <p className="text-ink-muted py-8">Cargando…</p>
  if (q.isError || !q.data) return <Card className="p-4 border-danger text-danger">No se pudo cargar el activo.</Card>

  const { activo, historial } = q.data
  const esAdmin = perfil?.rol === 'administrador'

  async function descargarEtiqueta() {
    const blob = await api.descargarEtiqueta(activoId)
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  }

  return (
    <div className="max-w-3xl">
      <button onClick={() => navigate('/activos')} className="text-accent hover:underline text-sm mb-3">
        ← Volver a activos
      </button>

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">{activo.nombre}</h1>
          <p className="font-mono text-ink-muted">{activo.codigo}</p>
        </div>
        <EstadoActivoBadge estado={activo.estado} />
      </div>

      <Card className="p-6 grid grid-cols-2 gap-4 mb-4 text-sm">
        <Dato k="Marca" v={activo.marca} />
        <Dato k="Modelo" v={activo.modelo} />
        <Dato k="Serie" v={activo.serie} />
        <Dato k="Condición" v={activo.condicion} />
        <Dato k="Proveedor" v={activo.proveedor} />
        <Dato k="Factura" v={activo.factura_numero} />
      </Card>

      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant="secondary" onClick={descargarEtiqueta}>Etiqueta (QR)</Button>
        {esAdmin && (
          <>
            <Button variant="secondary" onClick={() => navigate(`/activos/${activoId}/editar`)}>Editar</Button>
            {activo.estado === 'disponible' && (
              <Button variant="secondary" onClick={() => void mant.mutate({ id: activoId, enMantenimiento: true })}>
                A mantenimiento
              </Button>
            )}
            {activo.estado === 'mantenimiento' && (
              <Button variant="secondary" onClick={() => void mant.mutate({ id: activoId, enMantenimiento: false })}>
                Salir de mantenimiento
              </Button>
            )}
            {activo.estado !== 'baja' && !['asignado', 'prestado'].includes(activo.estado) && (
              <Button variant="danger" onClick={() => setModalBaja(true)}>Dar de baja</Button>
            )}
          </>
        )}
      </div>

      <h2 className="text-lg font-semibold text-ink mb-3">Historial</h2>
      <Card className="p-4">
        <ol className="space-y-3">
          {historial.map((m) => (
            <li key={m.id} className="flex gap-3 text-sm">
              <span className="text-ink-muted whitespace-nowrap">{m.creado_en?.slice(0, 16).replace('T', ' ')}</span>
              <span className="font-medium">{TIPO_LABEL[m.tipo] ?? m.tipo}</span>
              {m.notas && <span className="text-ink-muted">— {m.notas}</span>}
            </li>
          ))}
        </ol>
      </Card>

      {modalBaja && (
        <ModalBaja
          onCerrar={() => setModalBaja(false)}
          onConfirmar={async (motivo) => {
            await baja.mutateAsync({ id: activoId, motivo })
            setModalBaja(false)
          }}
        />
      )}
    </div>
  )
}

function Dato({ k, v }: { k: string; v?: string | null }) {
  return (
    <div>
      <div className="text-ink-muted">{k}</div>
      <div className="text-ink">{v || '—'}</div>
    </div>
  )
}

function ModalBaja({ onCerrar, onConfirmar }: { onCerrar: () => void; onConfirmar: (m: string) => Promise<void> }) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  return (
    <Modal title="Dar de baja" onClose={onCerrar}>
      <div className="flex flex-col gap-4">
        <Field label="Motivo de baja" value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button
            variant="danger"
            disabled={enviando || motivo.trim() === ''}
            onClick={async () => { setEnviando(true); await onConfirmar(motivo.trim()); }}
          >
            Confirmar baja
          </Button>
        </div>
      </div>
    </Modal>
  )
}
