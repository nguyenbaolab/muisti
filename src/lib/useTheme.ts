import { useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

function readStoredOverride(): Theme | null {
  try {
    const stored = localStorage.getItem('muisti-theme')
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // private mode / blocked storage
  }
  return null
}

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useTheme() {
  const [override, setOverride] = useState<Theme | null>(readStoredOverride)
  const [systemDark, setSystemDark] = useState(getSystemDark)

  const theme: Theme = override ?? (systemDark ? 'dark' : 'light')

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    function onChange() {
      setSystemDark(media.matches)
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setOverride(next)
    try {
      localStorage.setItem('muisti-theme', next)
    } catch {
      // ignore write failures; override still lives in state
    }
  }

  return { theme, toggleTheme }
}
