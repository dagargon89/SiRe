import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

interface RichTextProps {
  /** HTML del contenido (controlado). El servidor lo sanea al persistir. */
  value: string
  onChange: (html: string) => void
  label?: string
  placeholder?: string
  id?: string
  className?: string
}

const BOTONES: { cmd: string; etiqueta: string; contenido: ReactNode }[] = [
  { cmd: 'bold', etiqueta: 'Negrita', contenido: <b>B</b> },
  { cmd: 'italic', etiqueta: 'Cursiva', contenido: <i>I</i> },
  { cmd: 'underline', etiqueta: 'Subrayado', contenido: <u>U</u> },
  { cmd: 'insertUnorderedList', etiqueta: 'Lista con viñetas', contenido: '•' },
  { cmd: 'insertOrderedList', etiqueta: 'Lista numerada', contenido: '1.' },
]

/**
 * Editor WYSIWYG mínimo basado en `contenteditable` (sin dependencias). Emite
 * HTML; el saneamiento definitivo ocurre en el servidor (SanitizadorHtml).
 * Usa document.execCommand: obsoleto pero soportado de forma universal y sin
 * dependencias, suficiente para el formato básico de observaciones.
 */
export function RichText({
  value, onChange, label, placeholder = 'Escribe observaciones…', id, className = '',
}: RichTextProps) {
  const autoId = useId()
  const baseId = id ?? autoId
  const ref = useRef<HTMLDivElement>(null)

  // Sincroniza el DOM con `value` solo cuando difiere y el editor no tiene el
  // foco, para no reposicionar el cursor mientras se escribe (prefill en edición).
  useEffect(() => {
    const el = ref.current
    if (el && document.activeElement !== el && el.innerHTML !== value) {
      el.innerHTML = value || ''
    }
  }, [value])

  function emitir() {
    if (ref.current) onChange(ref.current.innerHTML)
  }

  function ejecutar(cmd: string) {
    ref.current?.focus()
    document.execCommand(cmd, false)
    emitir()
  }

  function enlazar() {
    const url = window.prompt('URL del enlace (https://…):', 'https://')
    if (url == null) return
    ref.current?.focus()
    if (url.trim() === '') document.execCommand('unlink', false)
    else document.execCommand('createLink', false, url.trim())
    emitir()
  }

  return (
    <div className={'flex flex-col gap-1 ' + className}>
      {label && <label htmlFor={baseId} className="text-sm font-medium text-ink">{label}</label>}
      <div className="rounded-[6px] border border-border bg-surface overflow-hidden focus-within:outline focus-within:outline-2 focus-within:outline-accent">
        <div className="flex flex-wrap gap-0.5 border-b border-border p-1" role="toolbar" aria-label="Formato de texto">
          {BOTONES.map((b) => (
            <button
              key={b.cmd}
              type="button"
              title={b.etiqueta}
              aria-label={b.etiqueta}
              onMouseDown={(e) => { e.preventDefault(); ejecutar(b.cmd) }}
              className="h-8 min-w-8 px-2 rounded-md text-sm text-ink hover:bg-surface-2 cursor-pointer"
            >
              {b.contenido}
            </button>
          ))}
          <button
            type="button"
            title="Enlace"
            aria-label="Enlace"
            onMouseDown={(e) => { e.preventDefault(); enlazar() }}
            className="h-8 min-w-8 px-2 rounded-md text-sm text-ink hover:bg-surface-2 cursor-pointer"
          >
            🔗
          </button>
        </div>
        <div
          ref={ref}
          id={baseId}
          role="textbox"
          aria-multiline="true"
          aria-label={label ?? 'Observaciones'}
          contentEditable
          suppressContentEditableWarning
          onInput={emitir}
          data-placeholder={placeholder}
          className="sire-prose min-h-24 px-3 py-2 text-sm text-ink outline-none"
        />
      </div>
    </div>
  )
}
