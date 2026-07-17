import type { CSSProperties } from 'react'
import type { EstadoActivo, EstadoPrestamo } from '../lib/api'

/**
 * Badges de estado — mapeo tomado 1:1 del prototipo (SiRe Prototipo.dc.html,
 * objeto BADGES). Escala semántica fija: color + ícono + texto (WCAG: el color
 * nunca es el único portador de significado, doc 08 §3).
 */
type BadgeDef = { t: string; i: string; fg: string; bg: string }

const ESTADO_ACTIVO: Record<EstadoActivo, BadgeDef> = {
  disponible: { t: 'Disponible', i: '●', fg: '#2E7D5A', bg: 'rgba(46,125,90,.14)' },
  asignado: { t: 'Asignado', i: '◆', fg: '#2E7D9A', bg: 'rgba(46,125,154,.14)' },
  prestado: { t: 'Prestado', i: '◐', fg: '#B07A1E', bg: 'rgba(192,138,45,.16)' },
  mantenimiento: { t: 'Mantenimiento', i: '✦', fg: '#7A5EA6', bg: 'rgba(122,94,166,.15)' },
  baja: { t: 'Baja', i: '✕', fg: '#75838F', bg: 'rgba(117,131,143,.15)' },
}

const ESTADO_PRESTAMO: Record<EstadoPrestamo, BadgeDef> = {
  activo: { t: 'Activo', i: '●', fg: '#2E7D9A', bg: 'rgba(46,125,154,.14)' },
  vencido: { t: 'Vencido', i: '⚠', fg: '#B3413A', bg: 'rgba(179,65,58,.14)' },
  devuelto: { t: 'Devuelto', i: '✓', fg: '#2E7D5A', bg: 'rgba(46,125,90,.14)' },
}

const ACTIVA: Record<'activa' | 'inactiva', BadgeDef> = {
  activa: { t: 'Activa', i: '●', fg: '#2E7D5A', bg: 'rgba(46,125,90,.14)' },
  inactiva: { t: 'Inactiva', i: '✕', fg: '#75838F', bg: 'rgba(117,131,143,.15)' },
}

function pillStyle(b: BadgeDef): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '3px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 600,
    color: b.fg,
    background: b.bg,
    whiteSpace: 'nowrap',
  }
}

function Pill({ def }: { def: BadgeDef }) {
  return (
    <span style={pillStyle(def)}>
      <span aria-hidden="true">{def.i}</span>
      {def.t}
    </span>
  )
}

export function EstadoActivoBadge({ estado }: { estado: EstadoActivo }) {
  return <Pill def={ESTADO_ACTIVO[estado]} />
}

export function EstadoPrestamoBadge({ estado }: { estado: EstadoPrestamo }) {
  return <Pill def={ESTADO_PRESTAMO[estado]} />
}

export function ActivaBadge({ activa }: { activa: boolean }) {
  return <Pill def={activa ? ACTIVA.activa : ACTIVA.inactiva} />
}
