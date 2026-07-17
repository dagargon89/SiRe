import { useState, type FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import { useAuth } from '../lib/auth'
import { Field } from '../components/Field'
import { Button } from '../components/Button'

type Modo = 'login' | 'signup'

/** Login/registro (RF-01) — réplica 1:1 del prototipo (panel de marca + formulario). */
export function Login() {
  const { login, loginGoogle, signup, resetPassword } = useAuth()
  const [modo, setModo] = useState<Modo>('login')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setAviso(null)
    setSending(true)
    try {
      if (modo === 'login') {
        await login(email.trim(), password)
      } else {
        await signup(nombre.trim(), email.trim(), password)
        // Tras registrarse queda pendiente; App enruta a la pantalla de estado.
      }
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setSending(false)
    }
  }

  async function onGoogle() {
    setError(null)
    setAviso(null)
    try {
      await loginGoogle()
    } catch (err) {
      setError(mensajeError(err))
    }
  }

  async function onReset() {
    setError(null)
    setAviso(null)
    if (email.trim() === '') {
      setError('Escribe tu correo para enviarte el enlace de restablecimiento.')
      return
    }
    try {
      await resetPassword(email.trim())
      setAviso('Te enviamos un correo para restablecer tu contraseña (revisa spam).')
    } catch (err) {
      setError(mensajeError(err))
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Panel de marca (oculto en móvil) */}
      <div className="hidden md:flex flex-1 flex-col justify-between text-white p-[52px_48px]" style={{ backgroundColor: '#16334F' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg grid place-items-center font-bold text-base" style={{ backgroundColor: '#2E7D9A' }}>S</div>
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
          <span>Grupo OSC Plan Juárez</span><span>·</span><span>v1.0</span>
        </div>
      </div>

      {/* Panel del formulario */}
      <div className="flex-[1.1] bg-surface flex items-center justify-center p-10">
        <form onSubmit={onSubmit} className="w-[360px] flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[22px] font-bold text-ink">
              {modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </h1>
            <div className="text-[13.5px] text-ink-muted">
              {modo === 'login'
                ? 'Accede con tu cuenta institucional'
                : 'Regístrate; un administrador aprobará tu acceso'}
            </div>
          </div>

          <Button type="button" variant="secondary" onClick={onGoogle} className="w-full">
            <span aria-hidden="true">🔒</span> Continuar con Google
          </Button>

          <div className="flex items-center gap-3 text-xs text-ink-muted">
            <span className="flex-1 h-px bg-border" /> o <span className="flex-1 h-px bg-border" />
          </div>

          <div className="flex flex-col gap-3.5">
            {modo === 'signup' && (
              <Field label="Nombre completo" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            )}
            <Field
              label="Correo electrónico" type="email" autoComplete="email"
              placeholder="nombre@planjuarez.org" value={email}
              onChange={(e) => setEmail(e.target.value)} required error={error ?? undefined}
            />
            <Field
              label="Contraseña" type="password"
              autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••" value={password}
              onChange={(e) => setPassword(e.target.value)} required
            />
            {error && (
              <div role="alert" className="flex items-center gap-2 px-3 py-2.5 rounded-[6px] text-[12.5px] text-danger border"
                style={{ background: 'rgba(179,65,58,.1)', borderColor: 'rgba(179,65,58,.3)' }}>⚠ {error}</div>
            )}
            {aviso && (
              <div role="status" className="flex items-center gap-2 px-3 py-2.5 rounded-[6px] text-[12.5px] text-success border border-success">✓ {aviso}</div>
            )}
          </div>

          <Button type="submit" disabled={sending} className="h-[46px] w-full">
            {sending ? 'Procesando…' : modo === 'login' ? 'Entrar' : 'Crear cuenta'}
          </Button>

          <div className="flex flex-col items-center gap-2 text-[12.5px]">
            {modo === 'login' && (
              <button type="button" onClick={onReset} className="text-accent hover:underline">
                ¿Olvidaste tu contraseña?
              </button>
            )}
            <button
              type="button"
              onClick={() => { setModo(modo === 'login' ? 'signup' : 'login'); setError(null); setAviso(null) }}
              className="text-ink-muted hover:underline"
            >
              {modo === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
            </button>
          </div>
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
      case 'auth/email-already-in-use':
        return 'Ya existe una cuenta con ese correo.'
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres.'
      case 'auth/user-disabled':
        return 'Esta cuenta está desactivada.'
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Espera unos minutos.'
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'Se cerró la ventana de Google antes de terminar.'
      default:
        return 'No se pudo completar la operación. Intenta de nuevo.'
    }
  }
  return 'No se pudo completar la operación. Intenta de nuevo.'
}
