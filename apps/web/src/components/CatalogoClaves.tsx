import { useState, type FormEvent } from 'react'
import { Button } from './Button'
import { Card } from './Card'
import { Field } from './Field'
import { Modal } from './Modal'
import { ActivaBadge } from './Badge'
import { ApiError } from '../lib/api'

interface ItemClave {
  id: number
  nombre: string
  clave: string
  is_active: boolean
}

interface Props {
  titulo: string
  singular: string
  items: ItemClave[] | undefined
  cargando: boolean
  error: boolean
  onGuardar: (v: { id?: number; nombre: string; clave: string }) => Promise<unknown>
  onEstado: (v: { id: number; activa: boolean }) => Promise<unknown>
}

export function CatalogoClaves({ titulo, singular, items, cargando, error, onGuardar, onEstado }: Props) {
  const [editando, setEditando] = useState<ItemClave | null>(null)
  const [abierto, setAbierto] = useState(false)

  function abrirNuevo() {
    setEditando(null)
    setAbierto(true)
  }
  function abrirEditar(item: ItemClave) {
    setEditando(item)
    setAbierto(true)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-semibold text-ink">{titulo}</h1>
        <Button onClick={abrirNuevo}>Nueva {singular}</Button>
      </div>

      {cargando && <SkeletonTabla />}
      {error && !cargando && (
        <Card className="p-4 border-danger text-danger text-sm">
          No se pudo cargar. Reintenta.
        </Card>
      )}
      {!cargando && !error && items?.length === 0 && (
        <p className="text-center text-ink-muted py-12">No hay registros.</p>
      )}
      {!cargando && !error && items && items.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-muted border-b border-border">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Clave</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                  <td className="px-4 py-3">{it.nombre}</td>
                  <td className="px-4 py-3 font-mono">{it.clave}</td>
                  <td className="px-4 py-3">
                    <ActivaBadge activa={it.is_active} />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      className="text-accent hover:underline mr-4"
                      onClick={() => abrirEditar(it)}
                    >
                      Editar
                    </button>
                    <button
                      className="text-ink-muted hover:underline"
                      onClick={() => void onEstado({ id: it.id, activa: !it.is_active })}
                    >
                      {it.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {abierto && (
        <FormularioClave
          singular={singular}
          inicial={editando}
          onGuardar={onGuardar}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </div>
  )
}

function FormularioClave({
  singular,
  inicial,
  onGuardar,
  onCerrar,
}: {
  singular: string
  inicial: ItemClave | null
  onGuardar: (v: { id?: number; nombre: string; clave: string }) => Promise<unknown>
  onCerrar: () => void
}) {
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [clave, setClave] = useState(inicial?.clave ?? '')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await onGuardar({ id: inicial?.id, nombre: nombre.trim(), clave: clave.trim().toUpperCase() })
      onCerrar()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : `No se pudo guardar la ${singular}.`,
      )
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal title={inicial ? `Editar ${singular}` : `Nueva ${singular}`} onClose={onCerrar}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <Field
          label="Clave (3 letras)"
          value={clave}
          onChange={(e) => setClave(e.target.value.toUpperCase().slice(0, 3))}
          maxLength={3}
          required
          className="font-mono uppercase"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={enviando}>
            {enviando ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function SkeletonTabla() {
  return (
    <Card className="p-4">
      <div className="animate-pulse space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-6 bg-surface-2 rounded" />
        ))}
      </div>
    </Card>
  )
}
