'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/store/theme.store'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode)

  useEffect(() => {
    const root = document.documentElement

    function apply(dark: boolean) {
      root.classList.toggle('dark', dark)
    }

    if (mode === 'light') {
      apply(false)
      return
    }
    if (mode === 'dark') {
      apply(true)
      return
    }

    // auto — следим за системной темой
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    apply(mq.matches)
    const handler = (e: MediaQueryListEvent) => apply(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [mode])

  return <>{children}</>
}
