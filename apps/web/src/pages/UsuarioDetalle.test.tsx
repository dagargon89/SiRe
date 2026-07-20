import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { UsuarioDetalle } from './UsuarioDetalle'

vi.mock('../lib/queries', () => ({
  useUsuario: () => ({
    data: { id: 5, nombre: 'Ana López', email: 'ana@demo.test', rol: 'custodio', organizacion_id: 1, is_active: true, estado: 'aprobado' },
    isLoading: false, isError: false,
  }),
  useOrganizaciones: () => ({ data: [{ id: 1, nombre: 'Avanza', clave: 'AVZ', is_active: true }] }),
  useActivosACargo: () => ({
    data: [{ id: 3, codigo: 'CMP-AVZ-003', nombre: 'Laptop HP', condicion: 'bueno', estado: 'asignado' }],
    isLoading: false,
  }),
  usePrestamosDeUsuario: () => ({
    data: [{ id: 9, activo_id: 7, activo_codigo: 'AUV-AVZ-001', activo_nombre: 'Proyector', prestado_en: '2026-07-01 10:00:00', devolucion_esperada: '2026-07-20 10:00:00', estado: 'activo' }],
    isLoading: false,
  }),
}))

function renderDetalle() {
  return render(
    <MemoryRouter initialEntries={['/usuarios/5']}>
      <Routes>
        <Route path="/usuarios/:id" element={<UsuarioDetalle />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('UsuarioDetalle', () => {
  it('muestra datos del usuario, resguardos y préstamos vigentes', () => {
    renderDetalle()
    expect(screen.getByRole('heading', { name: 'Ana López' })).toBeInTheDocument()
    expect(screen.getByText('ana@demo.test')).toBeInTheDocument()
    expect(screen.getByText('Avanza')).toBeInTheDocument() // organización por nombre
    // Resguardo a su cargo
    expect(screen.getByText('CMP-AVZ-003')).toBeInTheDocument()
    expect(screen.getByText('Laptop HP')).toBeInTheDocument()
    // Préstamo vigente
    expect(screen.getByText('AUV-AVZ-001')).toBeInTheDocument()
    expect(screen.getByText('Proyector')).toBeInTheDocument()
  })
})
