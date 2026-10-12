import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActivoHistorial, fechaCorta } from './ActivoHistorial'
import type { Movimiento } from '../lib/api'

function mov(id: number, over: Partial<Movimiento> = {}): Movimiento {
  return {
    id, activo_id: 1, tipo: 'evidencia', realizado_por: 1, realizado_por_nombre: 'David García',
    notas: `Foto agregada ${id}`, creado_en: `2026-10-09 11:${String(id).padStart(2, '0')}:00`, ...over,
  }
}

const historial: Movimiento[] = [
  mov(1, { tipo: 'alta', notas: undefined, creado_en: '2026-07-21 09:51:19' }),
  mov(2, { tipo: 'asignacion', notas: undefined, creado_en: '2026-07-21 09:51:57' }),
  ...Array.from({ length: 11 }, (_, i) => mov(i + 3)),
]

const items = () => within(screen.getByRole('list')).getAllByRole('listitem')

describe('ActivoHistorial', () => {
  it('formatea la fecha como dd/mm/aaaa hh:mm', () => {
    expect(fechaCorta('2026-07-21 09:51:19')).toBe('21/07/2026 09:51')
  })

  it('muestra del más reciente al más antiguo, con quién lo hizo, y solo los 10 últimos', () => {
    render(<ActivoHistorial historial={historial} />)
    expect(items()).toHaveLength(10)
    expect(items()[0]).toHaveTextContent('Foto agregada 13')
    expect(items()[0]).toHaveTextContent('Por David García')
    expect(screen.getByRole('button', { name: 'Ver todo (13)' })).toBeInTheDocument()
  })

  it('"Ver todo" muestra el historial completo', async () => {
    render(<ActivoHistorial historial={historial} />)
    await userEvent.click(screen.getByRole('button', { name: 'Ver todo (13)' }))
    expect(items()).toHaveLength(13)
    expect(items()[12]).toHaveTextContent('Alta')
    expect(items()[12]).toHaveTextContent('21/07/2026 09:51')
  })

  it('filtra movimientos y fotos', async () => {
    render(<ActivoHistorial historial={historial} />)
    await userEvent.click(screen.getByRole('button', { name: 'Movimientos' }))
    expect(items()).toHaveLength(2)
    expect(items()[0]).toHaveTextContent('Asignación')
    expect(screen.queryByRole('button', { name: /Ver todo/ })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Fotos' }))
    expect(items()).toHaveLength(10)
    expect(screen.getByRole('button', { name: 'Ver todo (11)' })).toBeInTheDocument()
  })
})
