import { Button } from './Button'

/** Paginación reutilizable. Solo se muestra si hay más de una página. */
export function Pagination({
  page,
  perPage,
  total,
  onPage,
}: {
  page: number
  perPage: number
  total: number
  onPage: (p: number) => void
}) {
  const paginas = Math.max(1, Math.ceil(total / perPage))
  if (total <= perPage) return null

  const desde = (page - 1) * perPage + 1
  const hasta = Math.min(page * perPage, total)

  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <span className="text-ink-muted">
        Mostrando {desde}–{hasta} de {total}
      </span>
      <div className="flex items-center gap-3">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Anterior
        </Button>
        <span className="text-ink-muted">Página {page} de {paginas}</span>
        <Button variant="secondary" disabled={page >= paginas} onClick={() => onPage(page + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  )
}
