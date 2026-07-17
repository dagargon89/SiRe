import { Card } from './Card'

/** Tarjeta KPI (doc 08 §6.7 / prototipo): label muted + cifra grande coloreable. */
export function KpiCard({
  label,
  value,
  sub,
  tone = 'ink',
}: {
  label: string
  value: string | number
  sub?: string
  tone?: 'ink' | 'success' | 'warning' | 'danger' | 'accent'
}) {
  const toneClass = {
    ink: 'text-ink',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    accent: 'text-accent',
  }[tone]

  return (
    <Card className="p-5">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className={`text-[26px] font-bold leading-tight ${toneClass}`}>{value}</p>
      {sub && <p className="text-xs text-ink-muted mt-1">{sub}</p>}
    </Card>
  )
}
