/**
 * Gestión del tema claro/oscuro (doc 08 §3/§8).
 * Default: respeta prefers-color-scheme. Override manual persistido en
 * localStorage y reflejado en data-theme del <html>.
 */
export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'sire-theme'

export function getStoredTheme(): Theme | null {
  const v = localStorage.getItem(STORAGE_KEY)
  return v === 'light' || v === 'dark' ? v : null
}

export function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function currentTheme(): Theme {
  return getStoredTheme() ?? systemTheme()
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

export function applyInitialTheme(): void {
  applyTheme(currentTheme())
}

export function toggleTheme(): Theme {
  const next: Theme = currentTheme() === 'dark' ? 'light' : 'dark'
  localStorage.setItem(STORAGE_KEY, next)
  applyTheme(next)
  return next
}
