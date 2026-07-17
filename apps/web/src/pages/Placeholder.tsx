import { Card } from '../components/Card'

/** Placeholder para secciones que se habilitan en sprints posteriores. */
export function Placeholder({ titulo }: { titulo: string }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink mb-5">{titulo}</h1>
      <Card className="p-8 text-center text-ink-muted">
        Esta sección se habilita en un sprint posterior.
      </Card>
    </div>
  )
}
