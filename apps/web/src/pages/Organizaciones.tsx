import { CatalogoClaves } from '../components/CatalogoClaves'
import {
  useOrganizaciones,
  useGuardarOrganizacion,
  useEstadoOrganizacion,
} from '../lib/queries'

export function Organizaciones() {
  const q = useOrganizaciones()
  const guardar = useGuardarOrganizacion()
  const estado = useEstadoOrganizacion()

  return (
    <CatalogoClaves
      titulo="Organizaciones"
      singular="organización"
      items={q.data}
      cargando={q.isLoading}
      error={q.isError}
      onGuardar={(v) => guardar.mutateAsync(v)}
      onEstado={(v) => estado.mutateAsync(v)}
    />
  )
}
