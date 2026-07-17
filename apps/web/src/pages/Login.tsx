import { useState, type FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import { useAuth } from '../lib/auth'
import { Field } from '../components/Field'
import { Button } from '../components/Button'

/** Pantalla de Login (RF-01) — réplica 1:1 del prototipo (panel de marca + formulario). */
export function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSending(true)
    try {
      await login(email.trim(), password)
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel de marca (oculto en móvil) */}
      <div
        className="hidden md:flex flex-1 flex-col justify-between text-white p-[52px_48px]"
        style={{ backgroundColor: '#16334F' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg grid place-items-center font-bold text-base"
            style={{ backgroundColor: '#2E7D9A' }}
          >
            S
          </div>
          <div className="font-bold text-lg tracking-wide">SiRe</div>
        </div>
        <div className="flex flex-col gap-3.5 max-w-[460px]">
          <div className="text-[30px] font-semibold leading-tight text-pretty">
            Sistema de Resguardos para Organizaciones de la Sociedad Civil
          </div>
          <div className="text-[14.5px] leading-relaxed" style={{ color: '#A9C3DA' }}>
            Activos, resguardos y préstamos con trazabilidad completa.
          </div>
        </div>
        <div className="flex gap-[18px] text-xs" style={{ color: '#7FA0BE' }}>
          <span>Grupo OSC Plan Juárez</span>
          <span>·</span>
          <span>v1.0</span>
        </div>
      </div>

      {/* Panel del formulario */}
      <div className="flex-[1.1] bg-surface flex items-center justify-center p-10">
        <form onSubmit={onSubmit} className="w-[360px] flex flex-col gap-[22px]">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[22px] font-bold text-ink">Iniciar sesión</h1>
            <div className="text-[13.5px] text-ink-muted">Accede con tu cuenta institucional</div>
          </div>

          <div className="flex flex-col gap-3.5">
            <Field
              label="Correo electrónico"
              type="email"
              autoComplete="email"
              placeholder="nombre@planjuarez.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error ?? undefined}
            />
            <Field
              label="Contraseña"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && (
              <div
                role="alert"
                className="flex items-center gap-2 px-3 py-2.5 rounded-[6px] text-[12.5px] text-danger border"
                style={{ background: 'rgba(179,65,58,.1)', borderColor: 'rgba(179,65,58,.3)' }}
              >
                ⚠ {error}
              </div>
            )}
          </div>

          <Button type="submit" disabled={sending} className="h-[46px] w-full">
            {sending ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export function mensajeError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
      case 'auth/invalid-email':
        return 'Correo o contraseña incorrectos.'
      case 'auth/user-disabled':
        return 'Esta cuenta está desactivada.'
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Espera unos minutos.'
      default:
        return 'No se pudo iniciar sesión. Intenta de nuevo.'
    }
  }
  return 'No se pudo iniciar sesión. Intenta de nuevo.'
}
