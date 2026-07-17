import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { currentTheme, toggleTheme, type Theme } from '../lib/theme'
import type { Rol } from '../lib/api'

interface NavDef {
  to: string
  label: string
  icon: string
  roles: Rol[]
}

// Tomado 1:1 del prototipo (navDefs): íconos, etiquetas y visibilidad por rol.
const NAV: NavDef[] = [
  { to: '/', label: 'Dashboard', icon: '⌂', roles: ['administrador', 'custodio', 'auditor'] },
  { to: '/activos', label: 'Activos', icon: '▤', roles: ['administrador', 'custodio', 'auditor'] },
  { to: '/prestamos', label: 'Préstamos', icon: '⇄', roles: ['administrador', 'custodio', 'auditor'] },
  { to: '/reportes', label: 'Reportes', icon: '▦', roles: ['administrador', 'auditor'] },
  { to: '/organizaciones', label: 'Organizaciones', icon: '◫', roles: ['administrador'] },
  { to: '/categorias', label: 'Categorías', icon: '⊞', roles: ['administrador'] },
  { to: '/usuarios', label: 'Usuarios', icon: '◉', roles: ['administrador'] },
  { to: '/perfil', label: 'Perfil', icon: '○', roles: ['administrador', 'custodio', 'auditor'] },
]

const ROL_LABEL: Record<Rol, string> = {
  administrador: 'Administrador',
  custodio: 'Custodio',
  auditor: 'Auditor',
}

function iniciales(nombre: string): string {
  return nombre.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

export function AppShell() {
  const { perfil, logout } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>(currentTheme())

  if (!perfil) return null
  const rol = perfil.rol
  const items = NAV.filter((n) => n.roles.includes(rol))

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <nav
        aria-label="Principal"
        className="w-[232px] flex-none flex flex-col p-[20px_12px] gap-1 text-white"
        style={{ background: 'var(--sire-sidebar)' }}
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 px-2.5 pt-1 pb-[18px] text-left"
        >
          <span
            className="w-[30px] h-[30px] rounded-[7px] grid place-items-center font-bold text-sm text-white"
            style={{ background: '#2E7D9A' }}
          >
            S
          </span>
          <span className="font-bold text-base text-white">SiRe</span>
        </button>

        {items.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ' +
              (isActive
                ? 'bg-white/15 text-white font-semibold'
                : 'text-[color:var(--sire-sidebar-text)] hover:bg-white/10')
            }
          >
            <span className="w-[18px] text-center text-sm" aria-hidden="true">{n.icon}</span>
            {n.label}
          </NavLink>
        ))}

        <div className="flex-1" />

        {/* Perfil */}
        <div className="flex items-center gap-2.5 p-[12px_10px] border-t border-white/10">
          <span
            className="w-8 h-8 rounded-full grid place-items-center text-xs font-bold text-white flex-none"
            style={{ background: '#2E7D9A' }}
          >
            {iniciales(perfil.nombre)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[12.5px] font-semibold text-white truncate">{perfil.nombre}</div>
            <div className="text-[11px]" style={{ color: 'var(--sire-sidebar-text)' }}>
              {ROL_LABEL[rol]}
            </div>
          </div>
          <button
            onClick={() => void logout()}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
            className="w-7 h-7 rounded-[5px] text-[color:var(--sire-sidebar-text)] hover:bg-white/10 hover:text-white"
          >
            ⏻
          </button>
        </div>
      </nav>

      {/* Contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[58px] flex-none bg-surface border-b border-border flex items-center gap-3.5 px-[22px]">
          <input
            type="search"
            placeholder="Buscar activo por código, nombre o serie…"
            aria-label="Buscador global de activos"
            className="w-[340px] h-[38px] px-3.5 rounded-[7px] border border-border bg-bg text-ink text-[13px] outline-none focus-visible:outline-2 focus-visible:outline-accent"
          />
          <div className="flex-1" />
          <button
            onClick={() => setTheme(toggleTheme())}
            aria-label="Cambiar tema claro/oscuro"
            className="h-9 px-3 rounded-[7px] border border-border bg-transparent text-ink text-[12.5px] font-semibold flex items-center gap-1.5 hover:bg-surface-2"
          >
            {theme === 'dark' ? '☾ Oscuro' : '☀ Claro'}
          </button>
          <NavLink
            to="/perfil"
            className="flex items-center gap-2.5 cursor-pointer px-2.5 py-1.5 rounded-[7px] hover:bg-surface-2"
          >
            <span
              className="w-[30px] h-[30px] rounded-full grid place-items-center text-[11.5px] font-bold text-white bg-primary"
            >
              {iniciales(perfil.nombre)}
            </span>
            <span className="text-[13px] font-semibold">{perfil.nombre}</span>
          </NavLink>
        </header>

        <main className="flex-1 overflow-auto p-[26px_30px]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
