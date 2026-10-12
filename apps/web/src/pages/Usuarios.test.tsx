import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { Usuarios } from './Usuarios'
import type { Usuario } from '../lib/api'

const desactivar = { mutate: vi.fn(), isPending: false }
const reactivar = { mutate: vi.fn(), isPending: false }
const mockUsuarios = vi.fn()
const noop = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false }

vi.mock('../lib/queries', () => ({
  useUsuarios: () => mockUsuarios(),
  useOrganizaciones: () => ({ data: [] }),
  useCrearUsuario: () => noop,
  useCambiarRol: () => noop,
  useAprobarUsuario: () => noop,
  useRechazarUsuario: () => noop,
  useDesactivarUsuario: () => desactivar,
  useReactivarUsuario: () => reactivar,
}))
vi.mock('../lib/auth', () => ({ useAuth: () => ({ perfil: { id: 1, rol: 'administrador' } }) }))
vi.mock('../lib/toast', () => ({ useToast: () => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

function usuario(over: Partial<Usuario> = {}): Usuario {
  return {
    id: 2, nombre: 'Ana López', email: 'ana@demo.test', rol: 'custodio', organizacion_id: null,
    is_active: true, estado: 'aprobado', ...over,
  } as Usuario
}

function renderLista(usuarios: Usuario[]) {
  mockUsuarios.mockReturnValue({
    data: { data: usuarios, meta: { page: 1, per_page: 25, total: usuarios.length } },
    isLoading: false, isError: false,
  })
  return render(<MemoryRouter><Usuarios /></MemoryRouter>)
}

describe('Usuarios — activar/desactivar', () => {
  beforeEach(() => { desactivar.mutate.mockReset(); reactivar.mutate.mockReset() })

  it('un usuario activo muestra Desactivar', async () => {
    renderLista([usuario()])
    expect(screen.queryByRole('button', { name: 'Reactivar' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Desactivar' }))
    expect(desactivar.mutate).toHaveBeenCalledWith(2)
  })

  it('un usuario desactivado muestra Reactivar', async () => {
    renderLista([usuario({ is_active: false })])
    expect(screen.queryByRole('button', { name: 'Desactivar' })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reactivar' }))
    expect(reactivar.mutate).toHaveBeenCalledWith(2, expect.any(Object))
  })
})
