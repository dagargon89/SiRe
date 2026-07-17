import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Login } from './pages/Login'
import { AppShell } from './layout/AppShell'
import { Organizaciones } from './pages/Organizaciones'
import { Categorias } from './pages/Categorias'
import { Usuarios } from './pages/Usuarios'
import { Perfil } from './pages/Perfil'
import { Placeholder } from './pages/Placeholder'
import { Activos } from './pages/Activos'
import { ActivoFicha } from './pages/ActivoFicha'
import { ActivoForm } from './pages/ActivoForm'

function App() {
  const { firebaseUser, perfil, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-bg text-ink-muted grid place-items-center">Cargando…</div>
    )
  }

  if (!firebaseUser || !perfil) {
    return <Login />
  }

  const esAdmin = perfil.rol === 'administrador'

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Placeholder titulo="Dashboard" />} />
          <Route path="activos" element={<Activos />} />
          {esAdmin && <Route path="activos/nuevo" element={<ActivoForm />} />}
          {esAdmin && <Route path="activos/:id/editar" element={<ActivoForm />} />}
          <Route path="activos/:id" element={<ActivoFicha />} />
          <Route path="prestamos" element={<Placeholder titulo="Préstamos" />} />
          <Route path="reportes" element={<Placeholder titulo="Reportes" />} />
          <Route path="perfil" element={<Perfil />} />
          {esAdmin && <Route path="organizaciones" element={<Organizaciones />} />}
          {esAdmin && <Route path="categorias" element={<Categorias />} />}
          {esAdmin && <Route path="usuarios" element={<Usuarios />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
