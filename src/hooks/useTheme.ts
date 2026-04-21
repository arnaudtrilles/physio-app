import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'

export type Theme = 'soft' | 'medical'

const THEME_KEY = 'physio_theme'
const DEFAULT_THEME: Theme = 'soft'

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useLocalStorage<Theme>(THEME_KEY, DEFAULT_THEME)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return [theme, setTheme]
}

export function applyInitialTheme() {
  try {
    const raw = window.localStorage.getItem(THEME_KEY)
    const stored = raw ? (JSON.parse(raw) as Theme) : DEFAULT_THEME
    const valid: Theme = stored === 'medical' || stored === 'soft' ? stored : DEFAULT_THEME
    document.documentElement.setAttribute('data-theme', valid)
  } catch {
    document.documentElement.setAttribute('data-theme', DEFAULT_THEME)
  }
}
