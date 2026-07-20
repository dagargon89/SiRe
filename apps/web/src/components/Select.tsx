import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { ChevronDown, Check } from './internal/icons'
import { Panel, useDismiss } from './internal/popover'

export type Opcion = { value: string; label: string; disabled?: boolean }

interface SelectProps {
  value: string | null
  onChange: (value: string) => void
  options: Opcion[]
  placeholder?: string
  label?: string
  /** Etiqueta accesible cuando no hay `label` visible (p. ej. en una celda de tabla). */
  ariaLabel?: string
  error?: string
  /** 'auto' (default): muestra buscador cuando hay más de 8 opciones. */
  searchable?: boolean | 'auto'
  size?: 'sm' | 'md'
  disabled?: boolean
  id?: string
  className?: string
}

const UMBRAL_BUSCADOR = 8

const ALTURA: Record<'sm' | 'md', string> = {
  sm: 'h-9 px-2.5',
  md: 'h-11 px-3.5',
}

/** Normaliza para búsqueda insensible a mayúsculas y acentos. */
function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

export function Select({
  value, onChange, options, placeholder = 'Selecciona…',
  label, ariaLabel, error, searchable = 'auto', size = 'md', disabled, id, className = '',
}: SelectProps) {
  const autoId = useId()
  const baseId = id ?? autoId
  const listId = `${baseId}-list`
  const errorId = `${baseId}-error`

  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const conBuscador = searchable === true || (searchable === 'auto' && options.length > UMBRAL_BUSCADOR)

  const filtradas = useMemo(() => {
    if (!conBuscador || query === '') return options
    const q = normalizar(query)
    return options.filter((o) => normalizar(o.label).includes(q))
  }, [options, query, conBuscador])

  const seleccionada = options.find((o) => o.value === value) ?? null

  useDismiss(open, () => cerrar(), buttonRef, panelRef)

  function abrir() {
    if (disabled) return
    const idx = filtradas.findIndex((o) => o.value === value)
    setActive(idx >= 0 ? idx : 0)
    setOpen(true)
  }

  function cerrar(devolverFoco = true) {
    setOpen(false)
    setQuery('')
    if (devolverFoco) buttonRef.current?.focus()
  }

  function elegir(o: Opcion) {
    if (o.disabled) return
    onChange(o.value)
    cerrar()
  }

  // Al abrir, enfoca el buscador o la lista; mantiene la opción activa visible.
  useEffect(() => {
    if (!open) return
    if (conBuscador) searchRef.current?.focus()
    else listRef.current?.focus()
  }, [open, conBuscador])

  useEffect(() => {
    if (open) setActive(0)
  }, [query, open])

  function onNav(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, filtradas.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Home') {
      e.preventDefault()
      setActive(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      setActive(filtradas.length - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const o = filtradas[active]
      if (o) elegir(o)
    }
  }

  return (
    <div className={'flex flex-col gap-1 ' + className}>
      {label && (
        <label htmlFor={baseId} className="text-sm font-medium text-ink">{label}</label>
      )}
      <div className="relative">
        <button
          type="button"
          id={baseId}
          ref={buttonRef}
          disabled={disabled}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listId : undefined}
          aria-label={!label ? ariaLabel : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onClick={() => (open ? cerrar() : abrir())}
          onKeyDown={(e) => {
            if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault()
              abrir()
            }
          }}
          className={
            ALTURA[size] + ' w-full rounded-[6px] border bg-surface text-ink text-sm text-left ' +
            'inline-flex items-center justify-between gap-2 ' +
            'disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ' +
            (error ? 'border-danger' : 'border-border')
          }
        >
          <span className={seleccionada ? 'truncate' : 'truncate text-ink-muted'}>
            {seleccionada ? seleccionada.label : placeholder}
          </span>
          <ChevronDown className={'shrink-0 text-ink-muted transition-transform ' + (open ? 'rotate-180' : '')} />
        </button>

        {open && (
          <Panel anchorRef={buttonRef} panelRef={panelRef} className="max-w-[min(20rem,90vw)]">
            {conBuscador && (
              <div className="p-1 border-b border-border">
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onNav}
                  placeholder="Buscar…"
                  role="combobox"
                  aria-expanded
                  aria-controls={listId}
                  aria-activedescendant={filtradas[active] ? `${baseId}-opt-${active}` : undefined}
                  className="h-9 w-full px-2.5 rounded-[6px] border border-border bg-surface text-ink text-sm outline-none"
                />
              </div>
            )}
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              tabIndex={conBuscador ? -1 : 0}
              aria-activedescendant={filtradas[active] ? `${baseId}-opt-${active}` : undefined}
              onKeyDown={conBuscador ? undefined : onNav}
              className="max-h-60 overflow-y-auto py-1 outline-none"
            >
              {filtradas.length === 0 && (
                <li className="px-3 py-2 text-sm text-ink-muted">Sin resultados</li>
              )}
              {filtradas.map((o, i) => {
                const sel = o.value === value
                return (
                  <li
                    key={o.value}
                    id={`${baseId}-opt-${i}`}
                    role="option"
                    aria-selected={sel}
                    aria-disabled={o.disabled || undefined}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => elegir(o)}
                    className={
                      'flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ' +
                      (o.disabled ? 'opacity-50 cursor-not-allowed ' : '') +
                      (i === active ? 'bg-surface-2 ' : '') +
                      (sel ? 'text-accent font-medium' : 'text-ink')
                    }
                  >
                    <Check className={'shrink-0 ' + (sel ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate">{o.label}</span>
                  </li>
                )
              })}
            </ul>
          </Panel>
        )}
      </div>
      {error && <p id={errorId} className="text-xs text-danger">{error}</p>}
    </div>
  )
}
