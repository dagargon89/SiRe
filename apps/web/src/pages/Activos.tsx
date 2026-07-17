import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Pagination } from '../components/Pagination'
import { EstadoActivoBadge } from '../components/Badge'
import { useAuth } from '../lib/auth'
import { useActivos, useOrganizaciones, useCategorias } from '../lib/queries'
import type { EstadoActivo, FiltrosActivos } from '../lib/api'

const ESTADOS: EstadoActivo[] = ['disponible', 'asignado', 'prestado', 'mantenimiento', 'baja']

export function Activos() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const [filtros, setFiltros] = useState<FiltrosActivos>({ page: 1 })
  const q = useActivos(filtros)
  const orgs = useOrganizaciones()
  const cats = useCategorias()

  const set = (patch: Partial<FiltrosActivos>) => setFiltros((f) => ({ ...f, ...patch, page: 1 }))
  const setPage = (p: number) => setFiltros((f) => ({ ...f, page: p }))

  const nombreCat = (id: number) => cats.data?.find((c) => c.id === id)?.nombre ?? '—'
  const nombreOrg = (id: number) => orgs.data?.find((o) => o.id === id)?.nombre ?? '—'

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-semibold text-ink">Activos</h1>
        {perfil?.rol === 'administrador' && (
          <Button onClick={() => navigate('/activos/nuevo')}>Nuevo activo</Button>
        )}
      </div>

      <Card className="p-4 mb-4 flex flex-wrap gap-3 items-end">
        <input
          type="search"
          aria-label="Buscar"
          placeholder="Código, nombre o serie…"
          className="h-10 px-3 rounded-md border border-border bg-surface text-ink text-sm flex-1 min-w-[180px]"
          onChange={(e) => set({ q: e.target.value })}
        />
        <FiltroSelect label="Categoría" onChange={(v) => set({ categoria_id: v ? Number(v) : undefined })}
          options={(cats.data ?? []).map((c) => ({ value: c.id, label: c.nombre }))} />
        <FiltroSelect label="Organización" onChange={(v) => set({ organizacion_id: v ? Number(v) : undefined })}
          options={(orgs.data ?? []).map((o) => ({ value: o.id, label: o.nombre }))} />
        <FiltroSelect label="Estado" onChange={(v) => set({ estado: (v || undefined) as EstadoActivo | undefined })}
          options={ESTADOS.map((e) => ({ value: e, label: e }))} />
      </Card>

      {q.isLoading && <p className="text-ink-muted py-8">Cargando…</p>}
      {q.isError && (
        <Card className="p-4 border-danger text-danger text-sm">No se pudo cargar. Reintenta.</Card>
      )}
      {q.data && q.data.data.length === 0 && (
        <p className="text-center text-ink-muted py-12">No hay activos que coincidan.</p>
      )}

      {q.data && q.data.data.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-muted border-b border-border">
                <th className="px-4 py-3 font-medium">Código</th>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium max-md:hidden">Categoría</th>
                <th className="px-4 py-3 font-medium max-md:hidden">Organización</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {q.data.data.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-border last:border-0 hover:bg-surface-2 cursor-pointer"
                  onClick={() => navigate(`/activos/${a.id}`)}
                >
                  <td className="px-4 py-3 font-mono">
                    <Link to={`/activos/${a.id}`} className="text-accent hover:underline">
                      {a.codigo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{a.nombre}</td>
                  <td className="px-4 py-3 max-md:hidden text-ink-muted">{nombreCat(a.categoria_id)}</td>
                  <td className="px-4 py-3 max-md:hidden text-ink-muted">{nombreOrg(a.organizacion_id)}</td>
                  <td className="px-4 py-3">
                    <EstadoActivoBadge estado={a.estado} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {q.data && (
        <Pagination
          page={filtros.page ?? 1}
          perPage={q.data.meta.per_page}
          total={q.data.meta.total}
          onPage={setPage}
        />
      )}
    </div>
  )
}

function FiltroSelect({
  label,
  options,
  onChange,
}: {
  label: string
  options: { value: string | number; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-ink-muted">
      {label}
      <select
        className="h-10 px-2 rounded-md border border-border bg-surface text-ink text-sm"
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Todas</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}
