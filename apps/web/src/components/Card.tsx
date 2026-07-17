import type { HTMLAttributes } from 'react'

/** Superficie base: tarjeta/panel (doc 08 §6.7 / prototipo: bg surface + borde + radio). */
export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-surface border border-border rounded-[10px] shadow-[var(--sire-shadow)] ${className}`}
      {...rest}
    />
  )
}
