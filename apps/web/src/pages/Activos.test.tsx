import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Activos } from './Activos'
import type { Activo } from '../lib/api'

const mockUseActivos = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../lib/queries', () => ({
  useActivos: () => mockUseActivos(),
  useOrganizaciones: () => ({ data: [] }),
  useCategorias: () => ({ data: [] }),
}))
vi.mock('../lib/auth', () => ({ useAuth: () => mockUseAuth() }))

function activo(over: Partial<Activo> = {}): Activo {
  return {
    id: 1, codigo: 'CMP-AVZ-001', nombre: 'Laptop Dell', categoria_id: 1, organizacion_id: 1,
    condicion: 'bueno', estado: 'disponible', creado_en: '2026-07-01T10:00:00', ...over,
  }
}

function renderList() {
  return render(<MemoryRouter><Activos /></MemoryRouter>)
}

describe('Activos (lista)', () => {
  beforeEach(() => {
    mockUseActivos.mockReset()
    mockUseAuth.mockReset()
    mockUseAuth.mockReturnValue({ perfil: { rol: 'administrador' } })
  })

  it('muestra los activos con código y estado', () => {
    mockUseActivos.mockReturnValue({
      data: { data: [activo(), activo({ id: 2, codigo: 'MOB-AVZ-001', nombre: 'Silla', estado: 'mantenimiento' })], meta: { page: 1, per_page: 25, total: 2 } },
      isLoading: false, isError: false,
    })
    renderList()
    expect(screen.getByText('CMP-AVZ-001')).toBeInTheDocument()
    expect(screen.getByText('Silla')).toBeInTheDocument()
    expect(screen.getByText('Disponible')).toBeInTheDocument()
    expect(screen.getByText('Mantenimiento')).toBeInTheDocument()
  })

  it('el administrador ve el botón de nuevo activo', () => {
    mockUseActivos.mockReturnValue({ data: { data: [], meta: { page: 1, per_page: 25, total: 0 } }, isLoading: false, isError: false })
    renderList()
    expect(screen.getByRole('button', { name: /Nuevo activo/ })).toBeInTheDocument()
  })

  it('estado vacío cuando no hay coincidencias', () => {
    mockUseActivos.mockReturnValue({ data: { data: [], meta: { page: 1, per_page: 25, total: 0 } }, isLoading: false, isError: false })
    renderList()
    expect(screen.getByText('No hay activos que coincidan.')).toBeInTheDocument()
  })

  it('el custodio NO ve el botón de nuevo activo', () => {
    mockUseAuth.mockReturnValue({ perfil: { rol: 'custodio' } })
    mockUseActivos.mockReturnValue({ data: { data: [], meta: { page: 1, per_page: 25, total: 0 } }, isLoading: false, isError: false })
    renderList()
    expect(screen.queryByRole('button', { name: /Nuevo activo/ })).not.toBeInTheDocument()
  })
})
