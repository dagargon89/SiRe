import { useEffect, type ReactNode } from 'react'

/** Modal accesible (doc 08 §6.10 / prototipo): overlay + role=dialog + cierre con Esc. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-surface border border-border rounded-[10px] shadow-[var(--sire-shadow)] w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-ink mb-4">{title}</h2>
        {children}
      </div>
    </div>
  )
}
