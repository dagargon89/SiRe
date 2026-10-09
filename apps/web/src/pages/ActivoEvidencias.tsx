import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Modal } from '../components/Modal'
import { useToast } from '../lib/toast'
import { ApiError, type Evidencia } from '../lib/api'
import { useEliminarEvidencia, useEvidencias, useImagenEvidencia, useSubirEvidencia } from '../lib/queries'

const TIPOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

/** URL de objeto para un blob, liberada al desmontar o cambiar. */
function useObjectUrl(blob?: Blob): string | undefined {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : undefined), [blob])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  return url
}

function ImagenEvidencia({ evidencia, miniatura, className }: { evidencia: Evidencia; miniatura: boolean; className?: string }) {
  const q = useImagenEvidencia(evidencia.id, miniatura)
  const url = useObjectUrl(q.data)
  if (q.isError) return <div className={`grid place-items-center text-xs text-ink-muted bg-surface-2 ${className}`}>No disponible</div>
  if (!url) return <div className={`animate-pulse bg-surface-2 ${className}`} />
  return <img src={url} alt={evidencia.descripcion || 'Evidencia del activo'} className={className} />
}

/** Sección de evidencias fotográficas de la ficha del activo. */
export function ActivoEvidencias({ activoId, esAdmin }: { activoId: number; esAdmin: boolean }) {
  const q = useEvidencias(activoId)
  const subir = useSubirEvidencia()
  const eliminar = useEliminarEvidencia()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const [archivos, setArchivos] = useState<File[] | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [progreso, setProgreso] = useState<string | null>(null)
  const [errores, setErrores] = useState<string[]>([])
  const [viendo, setViendo] = useState<Evidencia | null>(null)

  function elegir(e: ChangeEvent<HTMLInputElement>) {
    const lista = Array.from(e.target.files ?? [])
    e.target.value = '' // permite volver a elegir los mismos archivos
    if (lista.length === 0) return
    setDescripcion('')
    setErrores([])
    setArchivos(lista)
  }

  async function enviar() {
    if (!archivos) return
    const fallos: string[] = []
    for (const [i, f] of archivos.entries()) {
      setProgreso(`Subiendo ${i + 1} de ${archivos.length}…`)
      if (!TIPOS.includes(f.type)) { fallos.push(`${f.name}: solo JPG, PNG o WebP.`); continue }
      if (f.size > MAX_BYTES) { fallos.push(`${f.name}: supera 10 MB.`); continue }
      try {
        await subir.mutateAsync({ activoId, foto: f, descripcion: descripcion.trim() || undefined })
      } catch (err) {
        fallos.push(`${f.name}: ${err instanceof ApiError ? err.message : 'no se pudo subir.'}`)
      }
    }
    setProgreso(null)
    const ok = archivos.length - fallos.length
    if (ok > 0) toast.exito(ok === 1 ? 'Foto agregada' : `${ok} fotos agregadas`)
    if (fallos.length === 0) setArchivos(null)
    else setErrores(fallos)
  }

  async function borrar(ev: Evidencia) {
    if (!window.confirm('¿Eliminar esta foto? Quedará registrado en el historial.')) return
    try {
      await eliminar.mutateAsync({ id: ev.id, activoId })
      toast.exito('Foto eliminada')
      setViendo(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar la foto.')
    }
  }

  const evidencias = q.data ?? []

  return (
    <Card className="p-6 mb-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-medium text-ink-muted">Evidencias ({evidencias.length})</h2>
        {esAdmin && (
          <>
            <Button variant="secondary" onClick={() => inputRef.current?.click()}>Agregar fotos</Button>
            <input ref={inputRef} type="file" accept={TIPOS.join(',')} multiple hidden onChange={elegir}
              aria-label="Elegir fotos de evidencia" />
          </>
        )}
      </div>

      {q.isLoading && <p className="text-sm text-ink-muted">Cargando…</p>}
      {q.isError && <p className="text-sm text-danger">No se pudieron cargar las fotos.</p>}
      {!q.isLoading && !q.isError && evidencias.length === 0 && (
        <p className="text-sm text-ink-muted">Sin fotos del equipo ni de sus accesorios.</p>
      )}

      {evidencias.length > 0 && (
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {evidencias.map((ev) => (
            <li key={ev.id}>
              <button type="button" onClick={() => setViendo(ev)}
                className="block w-full text-left rounded-md overflow-hidden border border-border hover:border-accent">
                <ImagenEvidencia evidencia={ev} miniatura className="w-full aspect-square object-cover" />
                {ev.descripcion && <span className="block px-2 py-1 text-xs text-ink truncate">{ev.descripcion}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      {archivos && (
        <Modal title="Agregar fotos" onClose={() => { if (!progreso) setArchivos(null) }}>
          <p className="text-sm text-ink mb-3">
            {archivos.length === 1 ? '1 foto seleccionada.' : `${archivos.length} fotos seleccionadas.`}
            {' '}Se reducen a 1600 px y se les quitan los datos de ubicación.
          </p>
          <Field label="Descripción (opcional)" placeholder="Ej. cargador, estado al entregar…" maxLength={255}
            value={descripcion} onChange={(e) => setDescripcion(e.target.value)} disabled={!!progreso} />
          {errores.length > 0 && (
            <ul className="mt-3 text-sm text-danger list-disc pl-5">{errores.map((e) => <li key={e}>{e}</li>)}</ul>
          )}
          <div className="flex justify-end gap-2 mt-5">
            <Button variant="secondary" onClick={() => setArchivos(null)} disabled={!!progreso}>
              {errores.length > 0 ? 'Cerrar' : 'Cancelar'}
            </Button>
            {errores.length === 0 && (
              <Button onClick={() => void enviar()} disabled={!!progreso}>{progreso ?? 'Subir'}</Button>
            )}
          </div>
        </Modal>
      )}

      {viendo && (
        <Modal title={viendo.descripcion || 'Evidencia'} onClose={() => setViendo(null)} wide>
          <ImagenEvidencia evidencia={viendo} miniatura={false} className="w-full max-h-[65vh] object-contain bg-surface-2 rounded-md" />
          <div className="flex items-center justify-between gap-2 mt-4">
            <span className="text-xs text-ink-muted">{viendo.creado_en?.slice(0, 16).replace('T', ' ')}</span>
            {esAdmin && (
              <Button variant="danger" onClick={() => void borrar(viendo)} disabled={eliminar.isPending}>Eliminar</Button>
            )}
          </div>
        </Modal>
      )}
    </Card>
  )
}
