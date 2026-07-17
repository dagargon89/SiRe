import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { ApiError, type CondicionActivo } from '../lib/api'
import { useActivo, useCategorias, useGuardarActivo, useOrganizaciones } from '../lib/queries'

const CONDICIONES: CondicionActivo[] = ['excelente', 'bueno', 'regular', 'malo']

export function ActivoForm() {
  const { id } = useParams()
  const editId = id ? Number(id) : undefined
  const navigate = useNavigate()
  const cats = useCategorias()
  const orgs = useOrganizaciones()
  const guardar = useGuardarActivo()
  const existente = useActivo(editId ?? 0)

  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Prefill en edición.
  const base = editId && existente.data ? existente.data.activo : null
  const [f, setF] = useState<Record<string, string>>({})
  const val = (k: string) =>
    f[k] ?? (base ? String((base as unknown as Record<string, unknown>)[k] ?? '') : '')
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))

  if (editId && existente.isLoading) return <p className="text-ink-muted py-8">Cargando…</p>

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const datos = {
        nombre: val('nombre').trim(),
        descripcion: val('descripcion') || undefined,
        categoria_id: Number(val('categoria_id')),
        organizacion_id: Number(val('organizacion_id')),
        marca: val('marca') || undefined,
        modelo: val('modelo') || undefined,
        serie: val('serie') || undefined,
        proveedor: val('proveedor') || undefined,
        factura_numero: val('factura_numero') || undefined,
        fecha_compra: val('fecha_compra') || undefined,
        valor_compra: val('valor_compra') ? Number(val('valor_compra')) : undefined,
        condicion: (val('condicion') || 'bueno') as CondicionActivo,
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const guardado = await guardar.mutateAsync({ id: editId, datos: datos as any })
      navigate(`/activos/${editId ?? guardado.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el activo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-ink mb-5">{editId ? 'Editar activo' : 'Nuevo activo'}</h1>
      <Card className="p-6">
        <form onSubmit={submit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Nombre" value={val('nombre')} onChange={(e) => set('nombre', e.target.value)} required />
          </div>

          <Selector label="Categoría" value={val('categoria_id')} disabled={!!editId}
            onChange={(v) => set('categoria_id', v)}
            options={(cats.data ?? []).filter((c) => c.is_active).map((c) => ({ value: c.id, label: `${c.nombre} (${c.clave})` }))} />
          <Selector label="Organización" value={val('organizacion_id')} disabled={!!editId}
            onChange={(v) => set('organizacion_id', v)}
            options={(orgs.data ?? []).filter((o) => o.is_active).map((o) => ({ value: o.id, label: `${o.nombre} (${o.clave})` }))} />

          <Field label="Marca" value={val('marca')} onChange={(e) => set('marca', e.target.value)} />
          <Field label="Modelo" value={val('modelo')} onChange={(e) => set('modelo', e.target.value)} />
          <Field label="Serie" value={val('serie')} onChange={(e) => set('serie', e.target.value)} />
          <Selector label="Condición" value={val('condicion')} onChange={(v) => set('condicion', v)}
            options={CONDICIONES.map((c) => ({ value: c, label: c }))} />
          <Field label="Proveedor" value={val('proveedor')} onChange={(e) => set('proveedor', e.target.value)} />
          <Field label="N.º de factura" value={val('factura_numero')} onChange={(e) => set('factura_numero', e.target.value)} />
          <Field label="Fecha de compra" type="date" value={val('fecha_compra')} onChange={(e) => set('fecha_compra', e.target.value)} />
          <Field label="Valor de compra" type="number" step="0.01" value={val('valor_compra')} onChange={(e) => set('valor_compra', e.target.value)} />

          {error && <p className="col-span-2 text-sm text-danger">{error}</p>}
          <div className="col-span-2 flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => navigate('/activos')}>Cancelar</Button>
            <Button type="submit" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function Selector({
  label, value, options, onChange, disabled,
}: {
  label: string
  value: string
  options: { value: string | number; label: string }[]
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-ink">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 px-3 rounded-[6px] border border-border bg-surface text-ink text-sm disabled:opacity-60"
      >
        <option value="">Selecciona…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}
