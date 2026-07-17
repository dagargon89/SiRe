import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Prestamos } from './Prestamos'
import type { Prestamo } from '../lib/api'

const mockUsePrestamos = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../lib/queries', () => ({
  usePrestamos: () => mockUsePrestamos(),
  useDevolver: () => ({ mutateAsync: vi.fn() }),
}))
vi.mock('../lib/auth', () => ({ useAuth: () => mockUseAuth() }))

function prestamo(over: Partial<Prestamo> = {}): Prestamo {
  return {
    id: 1, activo_id: 3, prestatario_id: 2, prestamista_id: 1,
    prestado_en: '2026-07-12T10:00:00', devolucion_esperada: '2026-07-16T18:00:00',
    condicion_prestamo: 'bueno', estado: 'vencido', ...over,
  }
}

describe('Prestamos (lista)', () => {
  beforeEach(() => {
    mockUsePrestamos.mockReset()
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({ perfil: { rol: 'administrador' } })
  })

  it('muestra préstamos con su estado y permite devolver', () => {
    mockUsePrestamos.mockReturnValue({
      data: { data: [prestamo()], meta: { page: 1, per_page: 25, total: 1 } },
      isLoading: false, isError: false,
    })
    render(<MemoryRouter><Prestamos /></MemoryRouter>)
    expect(screen.getByText('Vencido')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Devolver' })).toBeInTheDocument()
  })

  it('el auditor no ve el botón de devolver', () => {
    mockUseAuth.mockReturnValue({ perfil: { rol: 'auditor' } })
    mockUsePrestamos.mockReturnValue({
      data: { data: [prestamo({ estado: 'activo' })], meta: { page: 1, per_page: 25, total: 1 } },
      isLoading: false, isError: false,
    })
    render(<MemoryRouter><Prestamos /></MemoryRouter>)
    expect(screen.queryByRole('button', { name: 'Devolver' })).not.toBeInTheDocument()
  })

  it('estado vacío', () => {
    mockUsePrestamos.mockReturnValue({ data: { data: [], meta: { page: 1, per_page: 25, total: 0 } }, isLoading: false, isError: false })
    render(<MemoryRouter><Prestamos /></MemoryRouter>)
    expect(screen.getByText('No hay préstamos.')).toBeInTheDocument()
  })
})
