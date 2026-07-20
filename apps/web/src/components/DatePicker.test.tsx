import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DatePicker } from './DatePicker'

describe('DatePicker', () => {
  it('muestra la fecha formateada en español', () => {
    render(<DatePicker value="2026-07-10" onChange={() => {}} />)
    expect(screen.getByRole('button')).toHaveTextContent('10 jul 2026')
  })

  it('abre el calendario y elige un día (formato YYYY-MM-DD)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker value="2026-07-10" onChange={onChange} />)

    await user.click(screen.getByRole('button'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(screen.getByRole('gridcell', { name: /15 de julio de 2026/ }))

    expect(onChange).toHaveBeenCalledWith('2026-07-15')
  })

  it('con withTime conserva la hora al elegir día (YYYY-MM-DDTHH:mm)', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DatePicker value="2026-07-10T09:30" onChange={onChange} withTime />)

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('gridcell', { name: /15 de julio de 2026/ }))

    expect(onChange).toHaveBeenCalledWith('2026-07-15T09:30')
  })

  it('navega al mes anterior', async () => {
    const user = userEvent.setup()
    render(<DatePicker value="2026-07-10" onChange={() => {}} />)

    await user.click(screen.getByRole('button'))
    await user.click(screen.getByRole('button', { name: 'Mes anterior' }))
    expect(screen.getByText('junio 2026')).toBeInTheDocument()
  })
})
