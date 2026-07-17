import type { ButtonHTMLAttributes } from 'react'

/**
 * Botón base (doc 08 §6.3 / prototipo). Variantes primario, secundario y peligro.
 * Foco visible vía outline global (theme.css). Área táctil ≥ 40px de alto.
 */
type Variant = 'primary' | 'secondary' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const base =
  'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-sm font-semibold ' +
  'cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-contrast hover:bg-primary-hover',
  secondary: 'bg-surface text-ink border border-border hover:bg-surface-2',
  danger: 'bg-danger text-white hover:brightness-95',
}

export function Button({ variant = 'primary', className = '', ...rest }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...rest} />
}
