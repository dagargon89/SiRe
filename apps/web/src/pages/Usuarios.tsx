import { useState, type FormEvent } from 'react'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { Field } from '../components/Field'
import { Modal } from '../components/Modal'
import { Pagination } from '../components/Pagination'
import { ActivaBadge } from '../components/Badge'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import { api } from '../lib/apiClient'
import { ApiError, type EstadoUsuario, type Rol, type Usuario } from '../lib/api'
import {
  useUsuarios, useCrearUsuario, useCambiarRol, useDesactivarUsuario,
  useOrganizaciones, useAprobarUsuario, useRechazarUsuario,
} from '../lib/queries'

const ROLES: Rol[] = ['administrador', 'custodio', 'auditor']

const FILTROS: { value: EstadoUsuario | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'aprobado', label: 'Aprobados' },
  { value: 'rechazado', label: 'Rechazados' },
]

function EstadoBadge({ u }: { u: Usuario }) {
  if (u.estado === 'pendiente') {
    return <span className="inline-flex items-center gap-1 rounded-full text-xs px-2.5 py-1 text-warning" style={{ background: 'rgba(176,122,30,.14)' }}>⏳ Pendiente</span>
  }
  if (u.estado === 'rechazado') {
    return <span className="inline-flex items-center gap-1 rounded-full text-xs px-2.5 py-1 text-danger" style={{ background: 'rgba(179,65,58,.14)' }}>✕ Rechazado</span>
  }
  return <ActivaBadge activa={u.is_active} />
}

export function Usuarios() {
  const { perfil } = useAuth()
  const toast = useToast()
  const [page, setPage] = useState(1)
  const [estado, setEstado] = useState<EstadoUsuario | ''>('')
  const q = useUsuarios(page, estado || undefined)
  const orgs = useOrganizaciones()
  const cambiarRol = useCambiarRol()
  const desactivar = useDesactivarUsuario()
  const rechazar = useRechazarUsuario()
  const [nuevo, setNuevo] = useState(false)
  const [aprobando, setAprobando] = useState<Usuario | null>(null)

  const yo = perfil?.id
  const nombreOrg = (id: number | null) =>
    id == null ? '—' : (orgs.data?.find((o) => o.id === id)?.nombre ?? '—')

  function filtrar(e: EstadoUsuario | '') {
    setEstado(e)
    setPage(1)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-semibold text-ink">Usuarios</h1>
        <Button onClick={() => setNuevo(true)}>Nuevo usuario</Button>
      </div>

      <div className="flex gap-2 mb-4">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => filtrar(f.value)}
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
      {q.isError && <Card className="p-4 border-danger text-danger text-sm">No se pudo cargar. Reintenta.</Card>}
      {q.data && q.data.data.length === 0 && <p className="text-center text-ink-muted py-12">No hay usuarios.</p>}

      {q.data && q.data.data.length > 0 && (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-muted border-b border-border">
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Correo</th>
                <th className="px-4 py-3 font-medium max-md:hidden">Organización</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {q.data.data.map((u) => {
                const esYo = u.id === yo
                const pendienteORech = u.estado === 'pendiente' || u.estado === 'rechazado'
                return (
                  <tr key={u.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                    <td className="px-4 py-3">{u.nombre}</td>
                    <td className="px-4 py-3 text-ink-muted">{u.email}</td>
                    <td className="px-4 py-3 max-md:hidden text-ink-muted">{nombreOrg(u.organizacion_id)}</td>
                    <td className="px-4 py-3">
                      {pendienteORech ? (
                        <span className="text-ink-muted">—</span>
                      ) : (
                        <select
                          aria-label={`Rol de ${u.nombre}`}
                          value={u.rol}
                          disabled={esYo}
                          onChange={(e) => void cambiarRol.mutate({ id: u.id, rol: e.target.value as Rol })}
                          className="border border-border rounded-md bg-surface text-ink px-2 py-1 text-sm disabled:opacity-50"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-3"><EstadoBadge u={u} /></td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {pendienteORech ? (
                        <>
                          <button className="text-success hover:underline mr-4" onClick={() => setAprobando(u)}>
                            Aprobar
                          </button>
                          {u.estado === 'pendiente' && (
                            <button
                              className="text-danger hover:underline"
                              onClick={async () => {
                                await rechazar.mutateAsync(u.id)
                                toast.info('Solicitud rechazada')
                              }}
                            >
                              Rechazar
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button
                            className="text-accent hover:underline mr-4"
                            onClick={async () => {
                              const blob = await api.descargarCarta(u.id)
                              window.open(URL.createObjectURL(blob), '_blank')
                            }}
                          >
                            Carta
                          </button>
                          <button
                            className="text-danger hover:underline disabled:opacity-40 disabled:no-underline"
                            disabled={esYo || !u.is_active}
                            onClick={() => void desactivar.mutate(u.id)}
                          >
                            Desactivar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
      )}

      {q.data && <Pagination page={page} perPage={q.data.meta.per_page} total={q.data.meta.total} onPage={setPage} />}

      {nuevo && <FormularioUsuario onCerrar={() => setNuevo(false)} />}
      {aprobando && <ModalAprobar usuario={aprobando} onCerrar={() => setAprobando(null)} />}
    </div>
  )
}

function ModalAprobar({ usuario, onCerrar }: { usuario: Usuario; onCerrar: () => void }) {
  const aprobar = useAprobarUsuario()
  const orgs = useOrganizaciones()
  const toast = useToast()
  const [rol, setRol] = useState<Rol>('custodio')
  const [orgId, setOrgId] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (orgId === '') {
      setError('Selecciona una organización.')
      return
    }
    setEnviando(true)
    try {
      await aprobar.mutateAsync({ id: usuario.id, rol, organizacion_id: orgId })
      toast.exito('Solicitud aprobada')
      onCerrar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo aprobar.')
      setEnviando(false)
    }
  }

  return (
    <Modal title={`Aprobar a ${usuario.nombre}`} onClose={onCerrar}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">{usuario.email}</p>
        <div className="flex flex-col gap-1">
          <label htmlFor="ap-rol" className="text-sm font-medium text-ink">Rol</label>
          <select id="ap-rol" value={rol} onChange={(e) => setRol(e.target.value as Rol)}
            className="h-11 px-3 rounded-[6px] border border-border bg-surface text-ink text-sm">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="ap-org" className="text-sm font-medium text-ink">Organización de origen</label>
          <select id="ap-org" value={orgId} onChange={(e) => setOrgId(e.target.value === '' ? '' : Number(e.target.value))}
            className="h-11 px-3 rounded-[6px] border border-border bg-surface text-ink text-sm">
            <option value="">Selecciona…</option>
            {orgs.data?.filter((o) => o.is_active).map((o) => (
              <option key={o.id} value={o.id}>{o.nombre} ({o.clave})</option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={enviando}>{enviando ? 'Aprobando…' : 'Aprobar'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function FormularioUsuario({ onCerrar }: { onCerrar: () => void }) {
  const crear = useCrearUsuario()
  const orgs = useOrganizaciones()
  const toast = useToast()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState<Rol>('custodio')
  const [orgId, setOrgId] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (orgId === '') {
      setError('Selecciona una organización.')
      return
    }
    setEnviando(true)
    try {
      await crear.mutateAsync({ nombre: nombre.trim(), email: email.trim(), rol, organizacion_id: orgId })
      toast.exito('Usuario creado')
      onCerrar()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el usuario.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal title="Nuevo usuario" onClose={onCerrar}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <Field label="Correo" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div className="flex flex-col gap-1">
          <label htmlFor="u-rol" className="text-sm font-medium text-ink">Rol</label>
          <select id="u-rol" value={rol} onChange={(e) => setRol(e.target.value as Rol)}
            className="h-11 px-3 rounded-[6px] border border-border bg-surface text-ink text-sm">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="u-org" className="text-sm font-medium text-ink">Organización de origen</label>
          <select id="u-org" value={orgId} onChange={(e) => setOrgId(e.target.value === '' ? '' : Number(e.target.value))}
            className="h-11 px-3 rounded-[6px] border border-border bg-surface text-ink text-sm">
            <option value="">Selecciona…</option>
            {orgs.data?.filter((o) => o.is_active).map((o) => (
              <option key={o.id} value={o.id}>{o.nombre} ({o.clave})</option>
            ))}
          </select>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <p className="text-xs text-ink-muted">
          El usuario recibirá acceso con este correo; define su contraseña mediante «restablecer contraseña».
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={enviando}>{enviando ? 'Creando…' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  )
}
