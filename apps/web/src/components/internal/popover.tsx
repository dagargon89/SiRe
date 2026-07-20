import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, ReactNode, RefObject } from 'react'

/**
 * Cierra un panel al hacer clic/tap fuera del disparador y del panel, o al
 * presionar Escape. Recibe las referencias que se consideran "dentro".
 */
export function useDismiss(
  isOpen: boolean,
  onClose: () => void,
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (!isOpen) return

    function onPointer(e: PointerEvent) {
      const t = e.target as Node
      if (anchorRef.current?.contains(t) || panelRef.current?.contains(t)) return
      onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }

    document.addEventListener('pointerdown', onPointer, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointer, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [isOpen, onClose, anchorRef, panelRef])
}

/**
 * Panel flotante anclado al disparador. Se renderiza en un portal con
 * posición `fixed`, de modo que NUNCA lo recorta un contenedor con overflow
 * (p. ej. una tabla con scroll horizontal). Aparece debajo por defecto y
 * "voltea" hacia arriba cuando no cabe; se reposiciona al hacer scroll/resize.
 */
export function Panel({
  anchorRef,
  panelRef,
  className = '',
  children,
  ...rest
}: {
  anchorRef: RefObject<HTMLElement | null>
  panelRef: RefObject<HTMLDivElement | null>
  className?: string
  children: ReactNode
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'className' | 'children'>) {
  const [estilo, setEstilo] = useState<CSSProperties | null>(null)
  const raf = useRef(0)

  useLayoutEffect(() => {
    function ubicar() {
      const a = anchorRef.current
      const p = panelRef.current
      if (!a) return
      const r = a.getBoundingClientRect()
      const alto = p?.offsetHeight ?? 0
      const ancho = p?.offsetWidth ?? r.width
      const espacioAbajo = window.innerHeight - r.bottom
      const arriba = espacioAbajo < alto + 8 && r.top > espacioAbajo

      const left = Math.max(8, Math.min(r.left, window.innerWidth - ancho - 8))
      const base: CSSProperties = {
        position: 'fixed',
        left,
        minWidth: r.width,
        maxHeight: (arriba ? r.top : espacioAbajo) - 12,
        overflowY: 'auto',
        visibility: 'visible',
      }
      setEstilo(arriba
        ? { ...base, bottom: window.innerHeight - r.top + 4 }
        : { ...base, top: r.bottom + 4 })
    }

    ubicar()
    const onScroll = () => {
      cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(ubicar)
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf.current)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [anchorRef, panelRef])

  return createPortal(
    <div
      ref={panelRef}
      style={estilo ?? { position: 'fixed', visibility: 'hidden' }}
      className={
        'z-50 rounded-[8px] border border-border bg-surface shadow-xl ' + className
      }
      {...rest}
    >
      {children}
    </div>,
    document.body,
  )
}
