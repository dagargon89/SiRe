import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EstadoActivoBadge, EstadoPrestamoBadge, ActivaBadge } from './Badge'
import { Button } from './Button'
import { Field } from './Field'

describe('Badge', () => {
  it('muestra texto e ícono del estado de activo', () => {
    render(<EstadoActivoBadge estado="mantenimiento" />)
    expect(screen.getByText('Mantenimiento')).toBeInTheDocument()
    expect(screen.getByText('✦')).toHaveAttribute('aria-hidden', 'true')
  })

  it('muestra estado de préstamo vencido', () => {
    render(<EstadoPrestamoBadge estado="vencido" />)
    expect(screen.getByText('Vencido')).toBeInTheDocument()
  })

  it('alterna activa/inactiva', () => {
    const { rerender } = render(<ActivaBadge activa={true} />)
    expect(screen.getByText('Activa')).toBeInTheDocument()
    rerender(<ActivaBadge activa={false} />)
    expect(screen.getByText('Inactiva')).toBeInTheDocument()
  })
})

describe('Button', () => {
  it('dispara onClick y respeta disabled', async () => {
    const onClick = vi.fn()
    const { rerender } = render(<Button onClick={onClick}>Guardar</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onClick).toHaveBeenCalledOnce()

    rerender(
      <Button onClick={onClick} disabled>
        Guardar
      </Button>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    expect(onClick).toHaveBeenCalledOnce() // no vuelve a dispararse
  })
})

describe('Field', () => {
  it('asocia label e input y expone el error con aria', () => {
    render(<Field label="Clave" error="Debe tener 3 letras" defaultValue="AB" />)
    const input = screen.getByLabelText('Clave')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    const errorId = input.getAttribute('aria-describedby')!
    expect(document.getElementById(errorId)).toHaveTextContent('Debe tener 3 letras')
  })
})
