import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActivoEvidencias } from './ActivoEvidencias'
import type { Evidencia } from '../lib/api'

const mockUseEvidencias = vi.fn()
const mutar = { mutateAsync: vi.fn(), isPending: false }

vi.mock('../lib/queries', () => ({
  useEvidencias: () => mockUseEvidencias(),
  useImagenEvidencia: () => ({ data: undefined, isError: false }),
  useSubirEvidencia: () => mutar,
  useEliminarEvidencia: () => mutar,
}))
vi.mock('../lib/toast', () => ({ useToast: () => ({ exito: vi.fn(), error: vi.fn(), info: vi.fn() }) }))

function evidencia(over: Partial<Evidencia> = {}): Evidencia {
  return { id: 1, activo_id: 7, descripcion: 'Cargador', ancho: 1600, alto: 1200, subido_por: 1, creado_en: '2026-10-09 10:00:00', ...over }
}

describe('ActivoEvidencias', () => {
  beforeEach(() => mockUseEvidencias.mockReset())

  it('sin fotos muestra el estado vacío', () => {
    mockUseEvidencias.mockReturnValue({ data: [], isLoading: false, isError: false })
    render(<ActivoEvidencias activoId={7} esAdmin />)
    expect(screen.getByText(/Sin fotos/)).toBeInTheDocument()
    expect(screen.getByText('Evidencias (0)')).toBeInTheDocument()
  })

  it('el administrador puede agregar fotos; los demás solo ven', () => {
    mockUseEvidencias.mockReturnValue({ data: [evidencia()], isLoading: false, isError: false })
    const { rerender } = render(<ActivoEvidencias activoId={7} esAdmin />)
    expect(screen.getByRole('button', { name: 'Agregar fotos' })).toBeInTheDocument()

    rerender(<ActivoEvidencias activoId={7} esAdmin={false} />)
    expect(screen.queryByRole('button', { name: 'Agregar fotos' })).not.toBeInTheDocument()
    expect(screen.getByText('Cargador')).toBeInTheDocument()
  })

  it('al abrir una foto, solo el administrador ve Eliminar', async () => {
    mockUseEvidencias.mockReturnValue({ data: [evidencia()], isLoading: false, isError: false })
    render(<ActivoEvidencias activoId={7} esAdmin={false} />)
    await userEvent.click(screen.getByText('Cargador'))
    expect(screen.getByRole('dialog', { name: 'Cargador' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
  })
})
