import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type TipoToast = 'exito' | 'error' | 'info'
interface Toast {
  id: number
  mensaje: string
  tipo: TipoToast
}

interface ToastApi {
  exito: (mensaje: string) => void
  error: (mensaje: string) => void
  info: (mensaje: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

let contador = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((mensaje: string, tipo: TipoToast) => {
    const id = ++contador
    setToasts((t) => [...t, { id, mensaje, tipo }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600)
  }, [])

  const api: ToastApi = {
    exito: (m) => push(m, 'exito'),
    error: (m) => push(m, 'error'),
    info: (m) => push(m, 'info'),
  }

  const color: Record<TipoToast, string> = {
    exito: 'border-success text-success',
    error: 'border-danger text-danger',
    info: 'border-accent text-accent',
  }
  const icono: Record<TipoToast, string> = { exito: '✓', error: '⚠', info: 'ℹ' }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`bg-surface border rounded-md shadow-[var(--sire-shadow)] px-4 py-3 text-sm flex items-center gap-2 min-w-[220px] ${color[t.tipo]}`}
          >
            <span aria-hidden="true">{icono[t.tipo]}</span>
            <span className="text-ink">{t.mensaje}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}
