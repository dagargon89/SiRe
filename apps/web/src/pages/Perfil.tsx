import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { EstadoActivoBadge } from '../components/Badge'
import { useAuth } from '../lib/auth'
import { api } from '../lib/apiClient'
import { useOrganizaciones, useActivosACargo } from '../lib/queries'

const ROL_LABEL: Record<string, string> = {
  administrador: 'Administrador',
  custodio: 'Custodio',
  auditor: 'Auditor',
}

const CONDICION_LABEL: Record<string, string> = {
  excelente: 'Excelente',
  bueno: 'Bueno',
  regular: 'Regular',
  malo: 'Malo',
  baja: 'Baja',
}

export function Perfil() {
  const { perfil } = useAuth()
  const orgs = useOrganizaciones()
  const equipos = useActivosACargo(perfil?.id)
  if (!perfil) return null

  const nombreOrg =
    perfil.organizacion_id == null
      ? '—'
      : (orgs.data?.find((o) => o.id === perfil.organizacion_id)?.nombre ?? '—')

  async function descargarCarta() {
    const blob = await api.descargarCarta(perfil!.id)
    window.open(URL.createObjectURL(blob), '_blank')
  }

  const items = equipos.data ?? []

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-ink mb-5">Mi perfil</h1>
      <Card className="p-6 flex flex-col gap-4">
        <Dato etiqueta="Nombre" valor={perfil.nombre} />
        <Dato etiqueta="Correo" valor={perfil.email} />
        <Dato etiqueta="Rol" valor={ROL_LABEL[perfil.rol] ?? perfil.rol} />
        <Dato etiqueta="Organización de origen" valor={nombreOrg} />
        <div className="pt-2">
          <Button variant="secondary" onClick={descargarCarta}>Descargar mi carta responsiva</Button>
        </div>
      </Card>

      <div className="flex items-center gap-2 mt-8 mb-3">
        <h2 className="text-lg font-semibold text-ink">Equipos a mi cargo</h2>
        {!equipos.isLoading && (
          <span className="text-sm text-ink-muted">({items.length})</span>
        )}
      </div>
      <Card className="p-0 overflow-hidden">
        {equipos.isLoading ? (
          <p className="p-6 text-sm text-ink-muted">Cargando equipos…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-sm text-ink-muted">No tienes equipos asignados actualmente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink-muted border-b border-border">
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Condición</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-ink">{a.codigo}</td>
                    <td className="px-4 py-3 text-ink">{a.nombre}</td>
                    <td className="px-4 py-3 text-ink-muted">{CONDICION_LABEL[a.condicion] ?? a.condicion}</td>
                    <td className="px-4 py-3"><EstadoActivoBadge estado={a.estado} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <div className="text-sm text-ink-muted">{etiqueta}</div>
      <div className="text-ink font-medium">{valor}</div>
    </div>
  )
}
