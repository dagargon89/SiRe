import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RichText } from './RichText'

describe('RichText', () => {
  it('muestra la barra de herramientas y precarga el valor', () => {
    render(<RichText label="Observaciones" value="<b>hola</b>" onChange={() => {}} />)
    expect(screen.getByRole('button', { name: 'Negrita' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lista con viñetas' })).toBeInTheDocument()
    const editor = screen.getByRole('textbox')
    expect(editor).toHaveTextContent('hola')
  })

  it('emite el HTML al escribir', () => {
    const onChange = vi.fn()
    render(<RichText value="" onChange={onChange} />)
    const editor = screen.getByRole('textbox')
    editor.innerHTML = '<b>nuevo</b>'
    fireEvent.input(editor)
    expect(onChange).toHaveBeenCalledWith('<b>nuevo</b>')
  })
})
