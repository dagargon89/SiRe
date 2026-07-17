import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CatalogoClaves } from './CatalogoClaves'

const items = [
  { id: 1, nombre: 'Avanza', clave: 'AVZ', is_active: true },
  { id: 2, nombre: 'Fondo', clave: 'FCD', is_active: false },
]

function props(over = {}) {
  return {
    titulo: 'Organizaciones',
    singular: 'organización',
    items,
    cargando: false,
    error: false,
    onGuardar: vi.fn().mockResolvedValue({}),
    onEstado: vi.fn().mockResolvedValue({}),
    ...over,
  }
}

describe('CatalogoClaves', () => {
  it('lista los registros con su clave y estado', () => {
    render(<CatalogoClaves {...props()} />)
    expect(screen.getByText('Avanza')).toBeInTheDocument()
    expect(screen.getByText('AVZ')).toBeInTheDocument()
    expect(screen.getByText('Activa')).toBeInTheDocument()
    expect(screen.getByText('Inactiva')).toBeInTheDocument()
  })

  it('muestra estado vacío', () => {
    render(<CatalogoClaves {...props({ items: [] })} />)
    expect(screen.getByText('No hay registros.')).toBeInTheDocument()
  })

  it('crea un registro normalizando la clave a mayúsculas', async () => {
    const onGuardar = vi.fn().mockResolvedValue({})
    render(<CatalogoClaves {...props({ onGuardar })} />)

    await userEvent.click(screen.getByRole('button', { name: /Nueva organización/ }))
    await userEvent.type(screen.getByLabelText('Nombre'), 'Red Comunitaria')
    await userEvent.type(screen.getByLabelText(/Clave/), 'rcm')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(onGuardar).toHaveBeenCalledWith({ id: undefined, nombre: 'Red Comunitaria', clave: 'RCM' }),
    )
  })

  it('alterna el estado de un registro', async () => {
    const onEstado = vi.fn().mockResolvedValue({})
    render(<CatalogoClaves {...props({ onEstado })} />)
    // Fila 1 (Avanza, activa) → botón "Desactivar"
    await userEvent.click(screen.getAllByRole('button', { name: 'Desactivar' })[0])
    expect(onEstado).toHaveBeenCalledWith({ id: 1, activa: false })
  })
})
