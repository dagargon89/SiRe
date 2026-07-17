import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FirebaseError } from 'firebase/app'
import { Login, mensajeError } from './Login'

const login = vi.fn()
vi.mock('../lib/auth', () => ({
  useAuth: () => ({ login }),
}))

describe('Login', () => {
  beforeEach(() => login.mockReset())

  it('envía credenciales al hacer submit', async () => {
    login.mockResolvedValue(undefined)
    render(<Login />)

    await userEvent.type(screen.getByLabelText('Correo electrónico'), 'admin@demo.test')
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreto123')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() =>
      expect(login).toHaveBeenCalledWith('admin@demo.test', 'secreto123'),
    )
  })
})

describe('mensajeError', () => {
  it('mapea credenciales inválidas a un mensaje amigable', () => {
    expect(mensajeError(new FirebaseError('auth/invalid-credential', 'x')))
      .toBe('Correo o contraseña incorrectos.')
  })

  it('mapea cuenta deshabilitada', () => {
    expect(mensajeError(new FirebaseError('auth/user-disabled', 'x')))
      .toBe('Esta cuenta está desactivada.')
  })

  it('usa mensaje genérico para errores desconocidos', () => {
    expect(mensajeError(new Error('otro'))).toBe('No se pudo iniciar sesión. Intenta de nuevo.')
  })
})
