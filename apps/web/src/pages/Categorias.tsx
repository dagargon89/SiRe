import { CatalogoClaves } from '../components/CatalogoClaves'
import { useCategorias, useGuardarCategoria, useEstadoCategoria } from '../lib/queries'

export function Categorias() {
  const q = useCategorias()
  const guardar = useGuardarCategoria()
  const estado = useEstadoCategoria()

  return (
    <CatalogoClaves
      titulo="Categorías"
      singular="categoría"
      items={q.data}
      cargando={q.isLoading}
      error={q.isError}
      onGuardar={(v) => guardar.mutateAsync(v)}
      onEstado={(v) => estado.mutateAsync(v)}
    />
  )
}
