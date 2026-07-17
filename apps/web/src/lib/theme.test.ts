import { describe, it, expect, beforeEach } from 'vitest'
import { applyTheme, currentTheme, getStoredTheme, toggleTheme } from './theme'

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
  })

  it('sin preferencia guardada usa el tema del sistema (light por el stub)', () => {
    expect(getStoredTheme()).toBeNull()
    expect(currentTheme()).toBe('light')
  })

  it('applyTheme refleja el tema en data-theme del <html>', () => {
    applyTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('toggleTheme alterna y persiste en localStorage', () => {
    expect(toggleTheme()).toBe('dark')
    expect(getStoredTheme()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(toggleTheme()).toBe('light')
    expect(getStoredTheme()).toBe('light')
  })
})
