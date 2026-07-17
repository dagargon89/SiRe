import { Card } from '../components/Card'
import { useAuth } from '../lib/auth'

const ROL_LABEL: Record<string, string> = {
  administrador: 'Administrador',
  custodio: 'Custodio',
  auditor: 'Auditor',
}

export function Perfil() {
  const { perfil } = useAuth()
  if (!perfil) return null

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-ink mb-5">Mi perfil</h1>
      <Card className="p-6 flex flex-col gap-4">
        <Dato etiqueta="Nombre" valor={perfil.nombre} />
        <Dato etiqueta="Correo" valor={perfil.email} />
        <Dato etiqueta="Rol" valor={ROL_LABEL[perfil.rol] ?? perfil.rol} />
        <Dato etiqueta="Organización de origen" valor={`#${perfil.organizacion_id}`} />
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
