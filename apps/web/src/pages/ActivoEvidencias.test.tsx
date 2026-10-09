import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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
  return { id: 1, activo_id: 7, tipo: 'accesorio', descripcion: 'Cargador', ancho: 1600, alto: 1200, subido_por: 1, creado_en: '2026-10-09 10:00:00', ...over }
}

describe('ActivoEvidencias', () => {
  beforeEach(() => mockUseEvidencias.mockReset())

  it('sin fotos muestra el estado vacío', () => {
    mockUseEvidencias.mockReturnValue({ data: [], isLoading: false, isError: false })
    const { rerender } = render(<ActivoEvidencias activoId={7} esAdmin />)
    expect(screen.getByRole('button', { name: /Arrastra fotos aquí o elígelas/ })).toBeInTheDocument()

    rerender(<ActivoEvidencias activoId={7} esAdmin={false} />)
    expect(screen.getByText('Aún no hay fotos de este activo.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Arrastra/ })).not.toBeInTheDocument()
  })

  it('el administrador puede agregar fotos; los demás solo ven', () => {
    mockUseEvidencias.mockReturnValue({ data: [evidencia()], isLoading: false, isError: false })
    const { rerender } = render(<ActivoEvidencias activoId={7} esAdmin />)
    expect(screen.getByRole('button', { name: 'Agregar fotos' })).toBeInTheDocument()

    rerender(<ActivoEvidencias activoId={7} esAdmin={false} />)
    expect(screen.queryByRole('button', { name: 'Agregar fotos' })).not.toBeInTheDocument()
    expect(screen.getByText('Cargador')).toBeInTheDocument()
  })

  it('el administrador puede soltar fotos arrastradas y se abre el diálogo de subida', () => {
    mockUseEvidencias.mockReturnValue({ data: [], isLoading: false, isError: false })
    const { container } = render(<ActivoEvidencias activoId={7} esAdmin />)
    const zona = container.firstElementChild!
    const foto = new File(['x'], 'cargador.jpg', { type: 'image/jpeg' })
    const dataTransfer = { types: ['Files'], files: [foto], dropEffect: 'none' }

    fireEvent.dragEnter(zona, { dataTransfer })
    expect(screen.getByText('Suelta las fotos para agregarlas')).toBeInTheDocument()
    fireEvent.drop(zona, { dataTransfer })

    expect(screen.getByRole('dialog', { name: 'Agregar fotos' })).toBeInTheDocument()
    expect(screen.getByText(/1 foto seleccionada/)).toBeInTheDocument()
  })

  it('los demás roles no pueden soltar fotos', () => {
    mockUseEvidencias.mockReturnValue({ data: [], isLoading: false, isError: false })
    const { container } = render(<ActivoEvidencias activoId={7} esAdmin={false} />)
    const zona = container.firstElementChild!
    const dataTransfer = { types: ['Files'], files: [new File(['x'], 'a.jpg', { type: 'image/jpeg' })] }
    fireEvent.dragEnter(zona, { dataTransfer })
    fireEvent.drop(zona, { dataTransfer })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('agrupa las fotos por tipo', () => {
    mockUseEvidencias.mockReturnValue({
      data: [evidencia(), evidencia({ id: 2, tipo: 'dano', descripcion: 'Pantalla' }), evidencia({ id: 3, tipo: 'accesorio', descripcion: 'Mouse' })],
      isLoading: false, isError: false,
    })
    render(<ActivoEvidencias activoId={7} esAdmin={false} />)
    expect(screen.getByText('Accesorios (2)')).toBeInTheDocument()
    expect(screen.getByText('Daños (1)')).toBeInTheDocument()
    expect(screen.queryByText(/^Equipo \(/)).not.toBeInTheDocument()
  })

  it('al abrir una foto, solo el administrador ve Eliminar', async () => {
    mockUseEvidencias.mockReturnValue({ data: [evidencia()], isLoading: false, isError: false })
    render(<ActivoEvidencias activoId={7} esAdmin={false} />)
    await userEvent.click(screen.getByText('Cargador'))
    expect(screen.getByRole('dialog', { name: 'Accesorio · Cargador' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument()
  })
})
