import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Select } from './Select'

const OPCIONES = [
  { value: 'excelente', label: 'Excelente' },
  { value: 'bueno', label: 'Bueno' },
  { value: 'regular', label: 'Regular' },
]

describe('Select', () => {
  it('muestra el placeholder y la opción seleccionada', () => {
    const { rerender } = render(
      <Select value={null} onChange={() => {}} options={OPCIONES} placeholder="Elige…" />,
    )
    expect(screen.getByRole('combobox')).toHaveTextContent('Elige…')
    rerender(<Select value="bueno" onChange={() => {}} options={OPCIONES} placeholder="Elige…" />)
    expect(screen.getByRole('combobox')).toHaveTextContent('Bueno')
  })

  it('abre al hacer clic y dispara onChange con el value elegido', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Select value={null} onChange={onChange} options={OPCIONES} />)

    await user.click(screen.getByRole('combobox'))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: 'Regular' }))

    expect(onChange).toHaveBeenCalledWith('regular')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument() // se cierra
  })

  it('permite navegar y elegir con el teclado', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Select value={null} onChange={onChange} options={OPCIONES} />)

    await user.click(screen.getByRole('combobox'))
    await user.keyboard('{ArrowDown}{Enter}') // activa 0 → baja a 1 → elige
    expect(onChange).toHaveBeenCalledWith('bueno')
  })

  it('muestra buscador y filtra cuando la lista es larga', async () => {
    const user = userEvent.setup()
    const largas = Array.from({ length: 12 }, (_, i) => ({ value: `o${i}`, label: `Opción ${i}` }))
    render(<Select value={null} onChange={() => {}} options={largas} />)

    await user.click(screen.getByRole('combobox'))
    const buscador = screen.getByPlaceholderText('Buscar…')
    await user.type(buscador, 'Opción 1')
    // "Opción 1", "Opción 10" y "Opción 11" coinciden; "Opción 2" no.
    expect(screen.getByRole('option', { name: 'Opción 10' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Opción 2' })).not.toBeInTheDocument()
  })
})
