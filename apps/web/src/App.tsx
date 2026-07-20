import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Login } from './pages/Login'
import { EstadoCuenta } from './pages/EstadoCuenta'
import { AppShell } from './layout/AppShell'
import { Organizaciones } from './pages/Organizaciones'
import { Categorias } from './pages/Categorias'
import { Usuarios } from './pages/Usuarios'
import { UsuarioDetalle } from './pages/UsuarioDetalle'
import { Perfil } from './pages/Perfil'
import { Activos } from './pages/Activos'
import { ActivoFicha } from './pages/ActivoFicha'
import { ActivoForm } from './pages/ActivoForm'
import { Prestamos } from './pages/Prestamos'
import { Dashboard } from './pages/Dashboard'
import { Reportes } from './pages/Reportes'

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

  // Cuentas no aprobadas (pendiente/rechazada/inactiva) → pantalla de estado.
  const aprobado = (perfil.estado ?? 'aprobado') === 'aprobado' && perfil.is_active
  if (!aprobado) {
    return <EstadoCuenta />
  }

  const esAdmin = perfil.rol === 'administrador'
  const veReportes = perfil.rol === 'administrador' || perfil.rol === 'auditor'

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="activos" element={<Activos />} />
          {esAdmin && <Route path="activos/nuevo" element={<ActivoForm />} />}
          {esAdmin && <Route path="activos/:id/editar" element={<ActivoForm />} />}
          <Route path="activos/:id" element={<ActivoFicha />} />
          <Route path="prestamos" element={<Prestamos />} />
          {veReportes && <Route path="reportes" element={<Reportes />} />}
          <Route path="perfil" element={<Perfil />} />
          {esAdmin && <Route path="organizaciones" element={<Organizaciones />} />}
          {esAdmin && <Route path="categorias" element={<Categorias />} />}
          {esAdmin && <Route path="usuarios" element={<Usuarios />} />}
          {esAdmin && <Route path="usuarios/:id" element={<UsuarioDetalle />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
