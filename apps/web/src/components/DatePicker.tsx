import { useEffect, useId, useRef, useState } from 'react'
import { CalendarIcon, ChevronLeft, ChevronRight } from './internal/icons'
import { Panel, useDismiss } from './internal/popover'

interface DatePickerProps {
  /** 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:mm' (cuando withTime). '' = sin valor. */
  value: string
  onChange: (value: string) => void
  withTime?: boolean
  min?: string
  max?: string
  label?: string
  error?: string
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const DIAS_LARGOS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

const pad = (n: number) => String(n).padStart(2, '0')
const isoDe = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const hoyIso = () => isoDe(new Date())

function mesDe(iso: string): { year: number; month: number } {
  const [y, m] = iso.split('-').map(Number)
  return { year: y, month: m - 1 }
}

function sumarDias(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return isoDe(new Date(y, m - 1, d + n))
}

function sumarMeses(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return isoDe(new Date(y, m - 1 + n, d))
}

function partes(value: string): { fecha: string; hora: string } {
  if (!value) return { fecha: '', hora: '00:00' }
  const [f, h] = value.split('T')
  return { fecha: f, hora: (h ?? '00:00').slice(0, 5) }
}

function mostrar(value: string, withTime: boolean): string {
  const { fecha, hora } = partes(value)
  if (!fecha) return ''
  const [y, m, d] = fecha.split('-').map(Number)
  const txt = `${d} ${MESES_CORTOS[m - 1]} ${y}`
  return withTime ? `${txt} ${hora}` : txt
}

export function DatePicker({
  value, onChange, withTime = false, min, max,
  label, error, placeholder = 'Selecciona fecha…', disabled, id, className = '',
}: DatePickerProps) {
  const autoId = useId()
  const baseId = id ?? autoId
  const errorId = `${baseId}-error`

  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const { fecha: selFecha, hora } = partes(value)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => mesDe(selFecha || hoyIso()))
  const [foco, setFoco] = useState(selFecha || hoyIso())

  useDismiss(open, () => cerrar(), buttonRef, panelRef)

  function abrir() {
    if (disabled) return
    const base = selFecha || hoyIso()
    setView(mesDe(base))
    setFoco(base)
    setOpen(true)
  }

  function cerrar(devolverFoco = true) {
    setOpen(false)
    if (devolverFoco) buttonRef.current?.focus()
  }

  function fueraDeRango(iso: string): boolean {
    return (min !== undefined && iso < min) || (max !== undefined && iso > max)
  }

  function emitir(fecha: string, h: string) {
    if (!fecha) return
    onChange(withTime ? `${fecha}T${h}` : fecha)
  }

  function elegirDia(iso: string) {
    if (fueraDeRango(iso)) return
    emitir(iso, hora)
    if (!withTime) cerrar()
  }

  function cambiarHora(h: string, m: string) {
    const hh = pad(Math.min(23, Math.max(0, Number(h) || 0)))
    const mm = pad(Math.min(59, Math.max(0, Number(m) || 0)))
    emitir(selFecha || hoyIso(), `${hh}:${mm}`)
  }

  // Mueve el foco de teclado por el calendario (roving tabindex).
  useEffect(() => {
    if (open) document.getElementById(`${baseId}-day-${foco}`)?.focus()
  }, [open, foco, baseId])

  function mover(dias: number) {
    const destino = sumarDias(foco, dias)
    setFoco(destino)
    const m = mesDe(destino)
    if (m.year !== view.year || m.month !== view.month) setView(m)
  }

  function onGridKey(e: React.KeyboardEvent) {
    const teclas: Record<string, () => void> = {
      ArrowLeft: () => mover(-1),
      ArrowRight: () => mover(1),
      ArrowUp: () => mover(-7),
      ArrowDown: () => mover(7),
      PageUp: () => { const d = sumarMeses(foco, -1); setFoco(d); setView(mesDe(d)) },
      PageDown: () => { const d = sumarMeses(foco, 1); setFoco(d); setView(mesDe(d)) },
    }
    if (teclas[e.key]) {
      e.preventDefault()
      teclas[e.key]()
    }
  }

  const primerDia = new Date(view.year, view.month, 1)
  const offset = (primerDia.getDay() + 6) % 7 // lunes primero
  const celdas = Array.from({ length: 42 }, (_, i) => new Date(view.year, view.month, 1 - offset + i))
  const [hh, mm] = hora.split(':')

  function irMes(n: number) {
    const d = new Date(view.year, view.month + n, 1)
    setView({ year: d.getFullYear(), month: d.getMonth() })
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
          aria-haspopup="dialog"
          aria-expanded={open}
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
            'h-11 w-full px-3.5 rounded-[6px] border bg-surface text-ink text-sm text-left ' +
            'inline-flex items-center justify-between gap-2 ' +
            'disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ' +
            (error ? 'border-danger' : 'border-border')
          }
        >
          <span className={selFecha ? 'truncate' : 'truncate text-ink-muted'}>
            {selFecha ? mostrar(value, withTime) : placeholder}
          </span>
          <CalendarIcon className="shrink-0 text-ink-muted" />
        </button>

        {open && (
          <Panel anchorRef={buttonRef} panelRef={panelRef} className="w-[17.5rem] p-3" role="dialog" aria-label="Selector de fecha">
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={() => irMes(-1)} aria-label="Mes anterior"
                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 cursor-pointer">
                <ChevronLeft />
              </button>
              <div className="text-sm font-semibold text-ink" aria-live="polite">
                {MESES[view.month]} {view.year}
              </div>
              <button type="button" onClick={() => irMes(1)} aria-label="Mes siguiente"
                className="h-8 w-8 inline-flex items-center justify-center rounded-md text-ink-muted hover:bg-surface-2 cursor-pointer">
                <ChevronRight />
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {DIAS.map((d, i) => (
                <div key={i} className="h-8 flex items-center justify-center text-xs font-medium text-ink-muted">{d}</div>
              ))}
            </div>

            <div role="grid" onKeyDown={onGridKey} className="grid grid-cols-7 gap-0.5">
              {celdas.map((dt) => {
                const iso = isoDe(dt)
                const delMes = dt.getMonth() === view.month
                const sel = iso === selFecha
                const esHoy = iso === hoyIso()
                const deshabilitado = fueraDeRango(iso)
                return (
                  <button
                    key={iso}
                    type="button"
                    id={`${baseId}-day-${iso}`}
                    role="gridcell"
                    tabIndex={iso === foco ? 0 : -1}
                    aria-selected={sel}
                    aria-label={`${dt.getDate()} de ${MESES[dt.getMonth()]} de ${dt.getFullYear()}, ${DIAS_LARGOS[(dt.getDay() + 6) % 7]}`}
                    disabled={deshabilitado}
                    onClick={() => elegirDia(iso)}
                    className={
                      'h-9 w-9 mx-auto flex items-center justify-center rounded-md text-sm cursor-pointer ' +
                      'disabled:opacity-30 disabled:cursor-not-allowed ' +
                      (sel
                        ? 'bg-accent text-white font-semibold '
                        : (delMes ? 'text-ink ' : 'text-ink-muted/50 ') +
                          'hover:bg-surface-2 ' +
                          (esHoy ? 'ring-1 ring-accent font-semibold ' : ''))
                    }
                  >
                    {dt.getDate()}
                  </button>
                )
              })}
            </div>

            {withTime && (
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-2">
                <span className="text-sm text-ink-muted">Hora</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min={0} max={23} value={hh} aria-label="Hora"
                    onChange={(e) => cambiarHora(e.target.value, mm)}
                    className="w-14 h-9 text-center rounded-[6px] border border-border bg-surface text-ink text-sm outline-none"
                  />
                  <span className="text-ink-muted">:</span>
                  <input
                    type="number" min={0} max={59} value={mm} aria-label="Minutos"
                    onChange={(e) => cambiarHora(hh, e.target.value)}
                    className="w-14 h-9 text-center rounded-[6px] border border-border bg-surface text-ink text-sm outline-none"
                  />
                </div>
              </div>
            )}
          </Panel>
        )}
      </div>
      {error && <p id={errorId} className="text-xs text-danger">{error}</p>}
    </div>
  )
}
