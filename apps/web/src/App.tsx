import { useAuth } from './lib/auth'
import { Login } from './pages/Login'
import { toggleTheme } from './lib/theme'
import { Button } from './components/Button'

function App() {
  const { firebaseUser, perfil, loading, logout } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-ink-muted grid place-items-center">
        Cargando…
      </div>
    )
  }

  if (!firebaseUser || !perfil) {
    return <Login />
  }

  // Shell autenticado mínimo (Sprint 0). Las pantallas completas llegan en los
  // sprints siguientes; esto prueba el login end-to-end con perfil real.
  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-5">
        <div className="font-bold text-lg">SiRe</div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-ink-muted">
            {perfil.nombre} · <span className="capitalize">{perfil.rol}</span>
          </div>
          <button
            type="button"
            aria-label="Cambiar tema claro/oscuro"
            onClick={() => toggleTheme()}
            className="size-9 rounded-md border border-border bg-surface-2"
          >
            ◐
          </button>
          <Button variant="secondary" onClick={() => void logout()}>
            Salir
          </Button>
        </div>
      </header>
      <main className="p-8">
        <h1 className="text-2xl font-semibold mb-2">
          Bienvenido, {perfil.nombre}
        </h1>
        <p className="text-ink-muted">
          Sesión iniciada correctamente. Las pantallas del sistema se habilitan en
          los siguientes sprints.
        </p>
      </main>
    </div>
  )
}

export default App
