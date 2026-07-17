import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'
import type { Usuario } from './lib/api'

const mockUseAuth = vi.fn()
vi.mock('./lib/auth', () => ({
  useAuth: () => mockUseAuth(),
}))

const perfil: Usuario = {
  id: 1, nombre: 'Admin Demo', email: 'admin@demo.test',
  rol: 'administrador', organizacion_id: 1, is_active: true,
}

describe('App (enrutado por sesión)', () => {
  beforeEach(() => mockUseAuth.mockReset())

  it('muestra estado de carga', () => {
    mockUseAuth.mockReturnValue({ loading: true, firebaseUser: null, perfil: null })
    render(<App />)
    expect(screen.getByText('Cargando…')).toBeInTheDocument()
  })

  it('muestra Login cuando no hay sesión', () => {
    mockUseAuth.mockReturnValue({ loading: false, firebaseUser: null, perfil: null })
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('muestra el shell autenticado con navegación por rol', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      firebaseUser: { uid: 'x' },
      perfil,
      logout: vi.fn(),
    })
    render(<App />)
    // El admin ve enlaces de administración y su nombre en el shell.
    expect(screen.getByRole('link', { name: /Organizaciones/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Usuarios/ })).toBeInTheDocument()
    expect(screen.getAllByText('Admin Demo').length).toBeGreaterThan(0)
  })
})
