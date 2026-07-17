import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Dashboard } from './Dashboard'
import type { ResumenDashboard } from '../lib/api'

const mockUseDashboard = vi.fn()
vi.mock('../lib/queries', () => ({ useDashboard: () => mockUseDashboard() }))

const resumen: ResumenDashboard = {
  activos_por_estado: { disponible: 5, asignado: 3, prestado: 2, mantenimiento: 1, baja: 0 },
  prestamos_activos: 2,
  prestamos_vencidos: 1,
  ultimos_movimientos: [
    { id: 1, activo_id: 3, tipo: 'prestamo', realizado_por: 1, creado_en: '2026-07-12T10:00:00' },
  ],
  por_organizacion: [{ organizacion_id: 1, nombre: 'Avanza', total: 9 }],
}

describe('Dashboard', () => {
  beforeEach(() => mockUseDashboard.mockReset())

  it('muestra KPIs y desgloses', () => {
    mockUseDashboard.mockReturnValue({ data: resumen, isLoading: false, isError: false })
    render(<Dashboard />)
    expect(screen.getByText('Activos totales')).toBeInTheDocument()
    expect(screen.getByText('11')).toBeInTheDocument()          // total activos (KPI)
    expect(screen.getByText('9')).toBeInTheDocument()           // total por organización
    expect(screen.getByText('Préstamos vencidos')).toBeInTheDocument()
    expect(screen.getByText('Avanza')).toBeInTheDocument()
    expect(screen.getByText('Préstamo')).toBeInTheDocument()    // último movimiento
  })

  it('muestra error', () => {
    mockUseDashboard.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<Dashboard />)
    expect(screen.getByText(/No se pudo cargar/)).toBeInTheDocument()
  })
})
