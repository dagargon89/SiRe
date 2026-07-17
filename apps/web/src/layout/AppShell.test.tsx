import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from './AppShell'
import type { Usuario } from '../lib/api'

const mockUseAuth = vi.fn()
vi.mock('../lib/auth', () => ({ useAuth: () => mockUseAuth() }))

function perfil(rol: Usuario['rol']): Usuario {
  return { id: 1, nombre: 'Ana López', email: 'a@demo.test', rol, organizacion_id: 1, is_active: true }
}

function renderShell() {
  return render(
    <MemoryRouter>
      <AppShell />
    </MemoryRouter>,
  )
}

describe('AppShell — navegación por rol', () => {
  beforeEach(() => mockUseAuth.mockReset())

  it('el administrador ve los enlaces de administración', () => {
    mockUseAuth.mockReturnValue({ perfil: perfil('administrador'), logout: vi.fn() })
    renderShell()
    expect(screen.getByRole('link', { name: /Usuarios/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Organizaciones/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Categorías/ })).toBeInTheDocument()
  })

  it('el custodio NO ve enlaces de administración', () => {
    mockUseAuth.mockReturnValue({ perfil: perfil('custodio'), logout: vi.fn() })
    renderShell()
    expect(screen.queryByRole('link', { name: /Usuarios/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Organizaciones/ })).not.toBeInTheDocument()
    // pero sí ve las secciones comunes
    expect(screen.getByRole('link', { name: /Activos/ })).toBeInTheDocument()
  })

  it('el auditor ve Reportes pero no administración', () => {
    mockUseAuth.mockReturnValue({ perfil: perfil('auditor'), logout: vi.fn() })
    renderShell()
    expect(screen.getByRole('link', { name: /Reportes/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Usuarios/ })).not.toBeInTheDocument()
  })
})
