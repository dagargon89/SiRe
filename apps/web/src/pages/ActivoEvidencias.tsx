import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Modal } from '../components/Modal'
import { Select } from '../components/Select'
import { useToast } from '../lib/toast'
import { ApiError, type Evidencia, type TipoEvidencia } from '../lib/api'
import { useEditarEvidencia, useEliminarEvidencia, useEvidencias, useImagenEvidencia, useSubirEvidencia } from '../lib/queries'

const TIPOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024
const TIPO_LABEL: Record<TipoEvidencia, string> = { equipo: 'Equipo', accesorio: 'Accesorios', dano: 'Daños' }
const TIPO_OPCION: Record<TipoEvidencia, string> = { equipo: 'Equipo', accesorio: 'Accesorio', dano: 'Daño' }
const ORDEN: TipoEvidencia[] = ['equipo', 'accesorio', 'dano']

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
  const editar = useEditarEvidencia()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)

  const [archivos, setArchivos] = useState<File[] | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [tipo, setTipo] = useState<TipoEvidencia | ''>('')
  const [progreso, setProgreso] = useState<string | null>(null)
  const [errores, setErrores] = useState<string[]>([])
  const [viendo, setViendo] = useState<Evidencia | null>(null)
  // Edición dentro de la foto abierta: null = solo viendo.
  const [edicion, setEdicion] = useState<null | { campo: 'tipo'; valor: TipoEvidencia } | { campo: 'descripcion'; valor: string }>(null)

  // Arrastrar y soltar (solo administrador). El contador evita el parpadeo de
  // dragenter/dragleave al pasar sobre los elementos hijos de la tarjeta.
  const [arrastrando, setArrastrando] = useState(false)
  const capas = useRef(0)
  const puedeSoltar = esAdmin && !archivos && !viendo
  const traeArchivos = (e: DragEvent) => e.dataTransfer.types.includes('Files')

  // Si el arrastre termina fuera de la tarjeta (o se cancela con Esc), quita el resaltado.
  useEffect(() => {
    if (!arrastrando) return
    const limpiar = () => { capas.current = 0; setArrastrando(false) }
    window.addEventListener('drop', limpiar)
    window.addEventListener('dragend', limpiar)
    return () => {
      window.removeEventListener('drop', limpiar)
      window.removeEventListener('dragend', limpiar)
    }
  }, [arrastrando])

  function elegir(e: ChangeEvent<HTMLInputElement>) {
    recibir(Array.from(e.target.files ?? []))
    e.target.value = '' // permite volver a elegir los mismos archivos
  }

  function recibir(lista: File[]) {
    if (lista.length === 0) return
    setDescripcion('')
    setTipo('')
    setErrores([])
    setArchivos(lista)
  }

  async function enviar() {
    if (!archivos || !tipo) return
    const fallos: string[] = []
    for (const [i, f] of archivos.entries()) {
      setProgreso(`Subiendo ${i + 1} de ${archivos.length}…`)
      if (!TIPOS.includes(f.type)) { fallos.push(`${f.name}: solo JPG, PNG o WebP.`); continue }
      if (f.size > MAX_BYTES) { fallos.push(`${f.name}: supera 10 MB.`); continue }
      try {
        await subir.mutateAsync({ activoId, foto: f, tipo, descripcion: descripcion.trim() || undefined })
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

  function abrir(ev: Evidencia | null) {
    setEdicion(null)
    setViendo(ev)
  }

  const sinCambios = (ev: Evidencia) =>
    edicion === null ||
    (edicion.campo === 'tipo' ? edicion.valor === ev.tipo : edicion.valor.trim() === (ev.descripcion ?? ''))

  async function guardarEdicion(ev: Evidencia) {
    if (edicion === null || sinCambios(ev)) { setEdicion(null); return }
    const datos = edicion.campo === 'tipo' ? { tipo: edicion.valor } : { descripcion: edicion.valor.trim() || null }
    try {
      const actualizada = await editar.mutateAsync({ id: ev.id, activoId, datos })
      setViendo(actualizada)
      setEdicion(null)
      toast.exito(edicion.campo === 'tipo'
        ? `Tipo cambiado a ${TIPO_OPCION[actualizada.tipo].toLowerCase()}`
        : 'Descripción actualizada')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo guardar el cambio.')
    }
  }

  async function borrar(ev: Evidencia) {
    if (!window.confirm('¿Eliminar esta foto? Quedará registrado en el historial.')) return
    try {
      await eliminar.mutateAsync({ id: ev.id, activoId })
      toast.exito('Foto eliminada')
      abrir(null)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo eliminar la foto.')
    }
  }

  const evidencias = q.data ?? []

  return (
    <Card
      className={`p-6 mb-4 relative ${arrastrando ? 'outline-2 outline-dashed outline-accent' : ''}`}
      onDragEnter={(e) => {
        if (!puedeSoltar || !traeArchivos(e)) return
        e.preventDefault()
        capas.current += 1
        setArrastrando(true)
      }}
      onDragOver={(e) => {
        if (!puedeSoltar || !traeArchivos(e)) return
        e.preventDefault() // necesario para que el navegador permita soltar
        e.dataTransfer.dropEffect = 'copy'
      }}
      onDragLeave={() => {
        if (!puedeSoltar) return
        capas.current = Math.max(0, capas.current - 1)
        if (capas.current === 0) setArrastrando(false)
      }}
      onDrop={(e) => {
        if (!puedeSoltar || !traeArchivos(e)) return
        e.preventDefault()
        capas.current = 0
        setArrastrando(false)
        recibir(Array.from(e.dataTransfer.files))
      }}
    >
      {arrastrando && (
        <div className="absolute inset-0 z-10 grid place-items-center rounded-[10px] bg-surface/90 pointer-events-none">
          <p className="text-sm font-semibold text-accent">Suelta las fotos para agregarlas</p>
        </div>
      )}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">
            Evidencias
            {evidencias.length > 0 && <span className="ml-2 text-sm font-medium text-ink-muted">{evidencias.length}</span>}
          </h2>
          <p className="text-sm text-ink-muted">Fotos del equipo, sus accesorios y daños.</p>
        </div>
        {esAdmin && evidencias.length > 0 && (
          <Button variant="secondary" className="flex-none" onClick={() => inputRef.current?.click()}>Agregar fotos</Button>
        )}
        {esAdmin && (
          <input ref={inputRef} type="file" accept={TIPOS.join(',')} multiple hidden onChange={elegir}
            aria-label="Elegir fotos de evidencia" />
        )}
      </div>

      {q.isLoading && <p className="text-sm text-ink-muted">Cargando…</p>}
      {q.isError && <p className="text-sm text-danger">No se pudieron cargar las fotos.</p>}
      {!q.isLoading && !q.isError && evidencias.length === 0 && (
        esAdmin ? (
          <button type="button" onClick={() => inputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-1.5 py-8 px-4 rounded-md border-2 border-dashed border-border bg-bg text-center transition-colors hover:border-accent hover:bg-surface-2">
            <span aria-hidden="true" className="text-2xl leading-none text-ink-muted">⤒</span>
            <span className="text-sm font-semibold text-ink">
              Arrastra fotos aquí o <span className="text-accent">elígelas</span>
            </span>
            <span className="text-xs text-ink-muted">JPG, PNG o WebP · hasta 10 MB cada una</span>
          </button>
        ) : (
          <p className="text-sm text-ink-muted">Aún no hay fotos de este activo.</p>
        )
      )}

      {ORDEN.map((t) => {
        const grupo = evidencias.filter((ev) => ev.tipo === t)
        if (grupo.length === 0) return null
        return (
          <section key={t} className="mt-4 first-of-type:mt-0">
            <h3 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${t === 'dano' ? 'text-danger' : 'text-ink-muted'}`}>
              {TIPO_LABEL[t]} ({grupo.length})
            </h3>
            <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {grupo.map((ev) => (
                <li key={ev.id}>
                  <button type="button" onClick={() => abrir(ev)}
                    className="block w-full text-left rounded-md overflow-hidden border border-border hover:border-accent">
                    <ImagenEvidencia evidencia={ev} miniatura className="w-full aspect-square object-cover" />
                    {ev.descripcion && <span className="block px-2 py-1 text-xs text-ink truncate">{ev.descripcion}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {archivos && (
        <Modal title="Agregar fotos" onClose={() => { if (!progreso) setArchivos(null) }}>
          <p className="text-sm text-ink mb-3">
            {archivos.length === 1 ? '1 foto seleccionada.' : `${archivos.length} fotos seleccionadas.`}
            {' '}Se reducen a 1600 px y se les quitan los datos de ubicación.
          </p>
          <div className="mb-3">
            <Select label="Tipo" value={tipo || null} onChange={(v) => setTipo(v as TipoEvidencia)} disabled={!!progreso}
              options={ORDEN.map((t) => ({ value: t, label: TIPO_OPCION[t] }))} />
          </div>
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
              <Button onClick={() => void enviar()} disabled={!!progreso || !tipo}>{progreso ?? 'Subir'}</Button>
            )}
          </div>
        </Modal>
      )}

      {viendo && (
        <Modal title={`${TIPO_OPCION[viendo.tipo] ?? 'Evidencia'}${viendo.descripcion ? ` · ${viendo.descripcion}` : ''}`} onClose={() => abrir(null)} wide>
          <ImagenEvidencia evidencia={viendo} miniatura={false} className="w-full max-h-[65vh] object-contain bg-surface-2 rounded-md" />
          {esAdmin && edicion !== null ? (
            <form className="flex flex-wrap items-end justify-end gap-2 mt-4"
              onSubmit={(e) => { e.preventDefault(); void guardarEdicion(viendo) }}>
              {edicion.campo === 'tipo' ? (
                <div className="w-48">
                  <Select label="Nuevo tipo" value={edicion.valor} onChange={(v) => setEdicion({ campo: 'tipo', valor: v as TipoEvidencia })}
                    disabled={editar.isPending} options={ORDEN.map((t) => ({ value: t, label: TIPO_OPCION[t] }))} />
                </div>
              ) : (
                <div className="flex-1 min-w-[220px]">
                  <Field label="Descripción" placeholder="Ej. cargador, estado al entregar…" maxLength={255} autoFocus
                    value={edicion.valor} onChange={(e) => setEdicion({ campo: 'descripcion', valor: e.target.value })}
                    disabled={editar.isPending} />
                </div>
              )}
              <Button type="button" variant="secondary" onClick={() => setEdicion(null)} disabled={editar.isPending}>Cancelar</Button>
              <Button type="submit" disabled={editar.isPending || sinCambios(viendo)}>
                {editar.isPending ? 'Guardando…' : 'Guardar'}
              </Button>
            </form>
          ) : (
            <div className="flex items-center justify-between gap-2 mt-4">
              <span className="text-xs text-ink-muted">{viendo.creado_en?.slice(0, 16).replace('T', ' ')}</span>
              {esAdmin && (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="secondary" onClick={() => setEdicion({ campo: 'descripcion', valor: viendo.descripcion ?? '' })}>
                    Editar descripción
                  </Button>
                  <Button variant="secondary" onClick={() => setEdicion({ campo: 'tipo', valor: viendo.tipo })}>Cambiar tipo</Button>
                  <Button variant="danger" onClick={() => void borrar(viendo)} disabled={eliminar.isPending}>Eliminar</Button>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </Card>
  )
}
