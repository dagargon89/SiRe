import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Select } from '../components/Select'
import { DatePicker } from '../components/DatePicker'
import { Modal } from '../components/Modal'
import { EstadoActivoBadge } from '../components/Badge'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { api } from '../lib/apiClient'
import {
  useActivo, useDarDeBaja, useMantenimiento,
  useAsignar, useRevocar, useTransferir, useUsuarios, usePrestar,
} from '../lib/queries'
import type { CondicionActivo } from '../lib/api'

const TIPO_LABEL: Record<string, string> = {
  alta: 'Alta', asignacion: 'Asignación', revocacion: 'Revocación', prestamo: 'Préstamo',
  devolucion: 'Devolución', transferencia: 'Transferencia', mantenimiento: 'Mantenimiento', baja: 'Baja',
}

type ModalTipo = null | 'baja' | 'asignar' | 'transferir' | 'revocar' | 'prestar'

export function ActivoFicha() {
  const { id } = useParams()
  const activoId = Number(id)
  const navigate = useNavigate()
  const { perfil } = useAuth()
  const toast = useToast()
  const q = useActivo(activoId)
  const baja = useDarDeBaja()
  const mant = useMantenimiento()
  const asignar = useAsignar()
  const revocar = useRevocar()
  const transferir = useTransferir()
  const prestar = usePrestar()
  const esAdmin = perfil?.rol === 'administrador'
  const usuarios = useUsuarios(1)
  const [modal, setModal] = useState<ModalTipo>(null)

  if (q.isLoading) return <p className="text-ink-muted py-8">Cargando…</p>
  if (q.isError || !q.data) return <Card className="p-4 border-danger text-danger">No se pudo cargar el activo.</Card>

  const { activo, historial, asignacion_vigente } = q.data
  const nombreUsuario = (uid?: number) =>
    usuarios.data?.data.find((u) => u.id === uid)?.nombre ?? (uid ? `Custodio #${uid}` : '—')

  async function descargarEtiqueta() {
    const blob = await api.descargarEtiqueta(activoId)
    window.open(URL.createObjectURL(blob), '_blank')
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
        {asignacion_vigente && (
          <Dato
            k="Custodio actual"
            v={asignacion_vigente.usuario_nombre ?? nombreUsuario(asignacion_vigente.usuario_id)}
          />
        )}
      </Card>

      {activo.observaciones && (
        <Card className="p-6 mb-4">
          <h2 className="text-sm font-medium text-ink-muted mb-2">Observaciones</h2>
          {/* HTML saneado en el servidor (SanitizadorHtml) antes de persistir. */}
          <div className="sire-prose text-sm text-ink" dangerouslySetInnerHTML={{ __html: activo.observaciones }} />
        </Card>
      )}

      <div className="flex flex-wrap gap-2 mb-6">
        <Button variant="secondary" onClick={descargarEtiqueta}>Etiqueta (QR)</Button>
        {esAdmin && (
          <>
            <Button variant="secondary" onClick={() => navigate(`/activos/${activoId}/editar`)}>Editar</Button>
            {activo.estado === 'disponible' && (
              <>
                <Button onClick={() => setModal('asignar')}>Asignar</Button>
                <Button variant="secondary" onClick={() => setModal('prestar')}>Prestar</Button>
              </>
            )}
            {activo.estado === 'asignado' && (
              <>
                <Button onClick={() => setModal('transferir')}>Transferir</Button>
                <Button variant="secondary" onClick={() => setModal('revocar')}>Revocar resguardo</Button>
              </>
            )}
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
            {['disponible', 'mantenimiento'].includes(activo.estado) && (
              <Button variant="danger" onClick={() => setModal('baja')}>Dar de baja</Button>
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

      {modal === 'baja' && (
        <ModalMotivo
          titulo="Dar de baja" etiqueta="Motivo de baja" accionLabel="Confirmar baja" peligro
          onCerrar={() => setModal(null)}
          onConfirmar={async (m) => { await baja.mutateAsync({ id: activoId, motivo: m }); toast.exito('Activo dado de baja'); setModal(null) }}
        />
      )}
      {modal === 'revocar' && asignacion_vigente && (
        <ModalMotivo
          titulo="Revocar resguardo" etiqueta="Motivo de revocación" accionLabel="Revocar"
          onCerrar={() => setModal(null)}
          onConfirmar={async (m) => {
            await revocar.mutateAsync({ id: asignacion_vigente.id, motivo: m, activo_id: activoId })
            toast.exito('Resguardo revocado')
            setModal(null)
          }}
        />
      )}
      {modal === 'asignar' && (
        <ModalUsuario
          titulo="Asignar activo" usuarios={usuarios.data?.data ?? []}
          onCerrar={() => setModal(null)}
          onConfirmar={async (uid, notas) => {
            await asignar.mutateAsync({ activo_id: activoId, usuario_id: uid, notas })
            toast.exito('Activo asignado')
            setModal(null)
          }}
        />
      )}
      {modal === 'transferir' && (
        <ModalUsuario
          titulo="Transferir activo" usuarios={usuarios.data?.data ?? []}
          onCerrar={() => setModal(null)}
          onConfirmar={async (uid, notas) => {
            await transferir.mutateAsync({ activo_id: activoId, nuevo_usuario_id: uid, notas })
            toast.exito('Activo transferido')
            setModal(null)
          }}
        />
      )}
      {modal === 'prestar' && (
        <ModalPrestar
          usuarios={usuarios.data?.data ?? []}
          onCerrar={() => setModal(null)}
          onConfirmar={async (uid, devolucion, condicion, notas) => {
            await prestar.mutateAsync({
              activo_id: activoId, prestatario_id: uid,
              devolucion_esperada: devolucion, condicion_prestamo: condicion, notas,
            })
            toast.exito('Préstamo registrado')
            setModal(null)
          }}
        />
      )}
    </div>
  )
}

function ModalPrestar({ usuarios, onCerrar, onConfirmar }: {
  usuarios: { id: number; nombre: string; rol: string }[]
  onCerrar: () => void
  onConfirmar: (uid: number, devolucion: string, condicion: Exclude<CondicionActivo, 'baja'>, notas?: string) => Promise<void>
}) {
  const [uid, setUid] = useState<number | ''>('')
  const [devolucion, setDevolucion] = useState('')
  const [condicion, setCondicion] = useState<Exclude<CondicionActivo, 'baja'>>('bueno')
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)

  return (
    <Modal title="Prestar activo" onClose={onCerrar}>
      <div className="flex flex-col gap-4">
        <Select
          label="Prestatario"
          value={uid === '' ? null : String(uid)}
          onChange={(v) => setUid(v === '' ? '' : Number(v))}
          options={usuarios.map((u) => ({ value: String(u.id), label: `${u.nombre} (${u.rol})` }))}
        />
        <DatePicker label="Devolución esperada" withTime value={devolucion} onChange={setDevolucion} />
        <Select
          label="Condición al prestar"
          value={condicion}
          onChange={(v) => setCondicion(v as Exclude<CondicionActivo, 'baja'>)}
          options={(['excelente', 'bueno', 'regular', 'malo'] as const).map((c) => ({ value: c, label: c }))}
        />
        <Field label="Notas (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button disabled={enviando || uid === '' || devolucion === ''}
            onClick={async () => {
              setEnviando(true)
              // datetime-local → "YYYY-MM-DDTHH:mm"; el API acepta ISO.
              await onConfirmar(Number(uid), devolucion.replace('T', ' ') + ':00', condicion, notas.trim() || undefined)
            }}>
            Prestar
          </Button>
        </div>
      </div>
    </Modal>
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

function ModalMotivo({ titulo, etiqueta, accionLabel, peligro, onCerrar, onConfirmar }: {
  titulo: string; etiqueta: string; accionLabel: string; peligro?: boolean
  onCerrar: () => void; onConfirmar: (m: string) => Promise<void>
}) {
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)
  return (
    <Modal title={titulo} onClose={onCerrar}>
      <div className="flex flex-col gap-4">
        <Field label={etiqueta} value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button
            variant={peligro ? 'danger' : 'primary'}
            disabled={enviando || motivo.trim() === ''}
            onClick={async () => { setEnviando(true); await onConfirmar(motivo.trim()) }}
          >
            {accionLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function ModalUsuario({ titulo, usuarios, onCerrar, onConfirmar }: {
  titulo: string
  usuarios: { id: number; nombre: string; rol: string }[]
  onCerrar: () => void
  onConfirmar: (uid: number, notas?: string) => Promise<void>
}) {
  const [uid, setUid] = useState<number | ''>('')
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  return (
    <Modal title={titulo} onClose={onCerrar}>
      <div className="flex flex-col gap-4">
        <Select
          label="Custodio"
          value={uid === '' ? null : String(uid)}
          onChange={(v) => setUid(v === '' ? '' : Number(v))}
          options={usuarios.map((u) => ({ value: String(u.id), label: `${u.nombre} (${u.rol})` }))}
        />
        <Field label="Notas (opcional)" value={notas} onChange={(e) => setNotas(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button
            disabled={enviando || uid === ''}
            onClick={async () => { setEnviando(true); await onConfirmar(Number(uid), notas.trim() || undefined) }}
          >
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
