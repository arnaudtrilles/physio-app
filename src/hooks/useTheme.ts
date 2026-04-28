import { useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'

export type Theme = 'soft' | 'medical'

const THEME_KEY = 'physio_theme'
const DEFAULT_THEME: Theme = 'soft'

const THEME_BG: Record<Theme, string> = {
  soft: '#EDE8DC',
  medical: '#f1f5f9',
}

function paintChrome(theme: Theme) {
  const bg = THEME_BG[theme]
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.background = bg
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', bg)
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setTheme] = useLocalStorage<Theme>(THEME_KEY, DEFAULT_THEME)

  useEffect(() => {
    paintChrome(theme)
  }, [theme])

  return [theme, setTheme]
}

export function applyInitialTheme() {
  try {
    const raw = window.localStorage.getItem(THEME_KEY)
    const stored = raw ? (JSON.parse(raw) as Theme) : DEFAULT_THEME
    const valid: Theme = stored === 'medical' || stored === 'soft' ? stored : DEFAULT_THEME
    paintChrome(valid)
  } catch {
    paintChrome(DEFAULT_THEME)
  }
}
