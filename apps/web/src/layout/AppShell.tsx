import { useEffect, useRef, useState } from 'react'
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
]

const ROL_LABEL: Record<Rol, string> = {
  administrador: 'Administrador',
  custodio: 'Custodio',
  auditor: 'Auditor',
}

function iniciales(nombre: string): string {
  return nombre.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

const COLLAPSE_KEY = 'sire-sidebar-collapsed'

export function AppShell() {
  const { perfil, logout } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>(currentTheme())
  const [drawer, setDrawer] = useState(false)
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1')
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c
      localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0')
      return next
    })
  }

  if (!perfil) return null
  const rol = perfil.rol
  const items = NAV.filter((n) => n.roles.includes(rol))
  const anchoSidebar = collapsed ? 'md:w-[72px]' : 'md:w-[232px]'

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Backdrop del drawer en móvil */}
      {drawer && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setDrawer(false)} aria-hidden="true" />
      )}

      {/* Sidebar (drawer en < md; colapsable en desktop) */}
      <nav
        aria-label="Principal"
        className={
          `w-[232px] ${anchoSidebar} flex-none flex flex-col p-3 gap-1 text-white transition-[width] ` +
          'max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:transition-transform ' +
          (drawer ? 'max-md:translate-x-0' : 'max-md:-translate-x-full')
        }
        style={{ background: 'var(--sire-sidebar)' }}
      >
        <button
          onClick={() => { navigate('/'); setDrawer(false) }}
          className="flex items-center gap-2.5 px-2.5 pt-1 pb-4 text-left"
          title="SiRe"
        >
          <span className="w-[30px] h-[30px] rounded-[7px] grid place-items-center font-bold text-sm text-white flex-none" style={{ background: '#2E7D9A' }}>S</span>
          {!collapsed && <span className="font-bold text-base text-white">SiRe</span>}
        </button>

        {items.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            onClick={() => setDrawer(false)}
            title={collapsed ? n.label : undefined}
            className={({ isActive }) =>
              'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors ' +
              (collapsed ? 'md:justify-center ' : '') +
              (isActive ? 'bg-white/15 text-white font-semibold' : 'text-[color:var(--sire-sidebar-text)] hover:bg-white/10')
            }
          >
            <span className="w-[18px] text-center text-sm flex-none" aria-hidden="true">{n.icon}</span>
            <span className={collapsed ? 'md:hidden' : ''}>{n.label}</span>
          </NavLink>
        ))}

        <div className="flex-1" />

        {/* Colapsar (solo desktop) */}
        <button
          onClick={toggleCollapsed}
          className="hidden md:flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm text-[color:var(--sire-sidebar-text)] hover:bg-white/10"
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <span className="w-[18px] text-center flex-none" aria-hidden="true">{collapsed ? '»' : '«'}</span>
          {!collapsed && <span>Colapsar</span>}
        </button>
      </nav>

      {/* Contenido */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-[58px] flex-none bg-surface border-b border-border flex items-center gap-3.5 px-[22px]">
          <button type="button" aria-label="Abrir menú" onClick={() => setDrawer(true)} className="md:hidden size-9 rounded-md border border-border text-ink">☰</button>
          <div className="flex-1" />
          <button
            onClick={() => setTheme(toggleTheme())}
            aria-label="Cambiar tema claro/oscuro"
            className="h-9 px-3 rounded-[7px] border border-border bg-transparent text-ink text-[12.5px] font-semibold flex items-center gap-1.5 hover:bg-surface-2"
          >
            {theme === 'dark' ? '☾ Oscuro' : '☀ Claro'}
          </button>

          {/* Menú de perfil (desplegable) */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenu((m) => !m)}
              aria-haspopup="menu"
              aria-expanded={menu}
              className="flex items-center gap-2.5 cursor-pointer px-2.5 py-1.5 rounded-[7px] hover:bg-surface-2"
            >
              <span className="w-[30px] h-[30px] rounded-full grid place-items-center text-[11.5px] font-bold text-white bg-primary flex-none">
                {iniciales(perfil.nombre)}
              </span>
              <span className="text-[13px] font-semibold max-md:hidden">{perfil.nombre}</span>
              <span aria-hidden="true" className="text-ink-muted text-xs">▾</span>
            </button>

            {menu && (
              <div role="menu" className="absolute right-0 mt-1 w-56 bg-surface border border-border rounded-md shadow-[var(--sire-shadow)] py-1 z-50">
                <div className="px-3 py-2 border-b border-border">
                  <div className="text-sm font-semibold text-ink truncate">{perfil.nombre}</div>
                  <div className="text-xs text-ink-muted">{ROL_LABEL[rol]}</div>
                </div>
                <button
                  role="menuitem"
                  onClick={() => { setMenu(false); navigate('/perfil') }}
                  className="w-full text-left px-3 py-2 text-sm text-ink hover:bg-surface-2"
                >
                  Mi perfil
                </button>
                <button
                  role="menuitem"
                  onClick={() => { setMenu(false); void logout() }}
                  className="w-full text-left px-3 py-2 text-sm text-danger hover:bg-surface-2"
                >
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto p-[26px_30px]">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
