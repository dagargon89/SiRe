import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { useAuth } from '../lib/auth'

/** Pantalla para cuentas no aprobadas (pendiente / rechazada / inactiva). */
export function EstadoCuenta() {
  const { perfil, logout } = useAuth()
  const estado = perfil?.estado
  const inactiva = perfil ? !perfil.is_active && estado === 'aprobado' : false

  let titulo = 'Cuenta pendiente de aprobación'
  let mensaje = 'Tu registro se recibió correctamente. Un administrador revisará tu solicitud y te asignará un rol. Vuelve a intentar más tarde.'
  let icono = '⏳'

  if (estado === 'rechazado') {
    titulo = 'Solicitud rechazada'
    mensaje = 'Tu solicitud de acceso fue rechazada. Si crees que es un error, contacta a un administrador.'
    icono = '✕'
  } else if (inactiva) {
    titulo = 'Cuenta desactivada'
    mensaje = 'Tu cuenta fue desactivada. Contacta a un administrador para reactivarla.'
    icono = '⚠'
  }

  return (
    <div className="min-h-screen bg-bg grid place-items-center p-6">
      <Card className="p-8 max-w-md text-center">
        <div className="text-4xl mb-3" aria-hidden="true">{icono}</div>
        <h1 className="text-xl font-semibold text-ink mb-2">{titulo}</h1>
        <p className="text-ink-muted text-sm mb-2">{mensaje}</p>
        {perfil && <p className="text-ink-muted text-xs mb-6">Sesión: {perfil.email}</p>}
        <Button variant="secondary" onClick={() => void logout()}>Cerrar sesión</Button>
      </Card>
    </div>
  )
}
