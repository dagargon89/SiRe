import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'

/**
 * Campo de formulario con label y error accesible (doc 08 §6.5):
 * aria-invalid + aria-describedby apuntando al mensaje de error.
 */
interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function Field({ label, error, id, className = '', ...rest }: FieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const errorId = `${inputId}-error`

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={
          'h-11 px-3.5 rounded-[6px] border bg-surface text-ink text-sm ' +
          'outline-none focus-visible:outline-2 focus-visible:outline-accent ' +
          (error ? 'border-danger' : 'border-border') +
          ` ${className}`
        }
        {...rest}
      />
      {error && (
        <p id={errorId} className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  )
}
