import { type PropsWithChildren, useEffect } from 'react'

import { useAppStore } from '@/lib/store/app-store'

export function ThemeProvider({ children }: PropsWithChildren) {
  const themeMode = useAppStore((state) => state.themeMode)
  const locale = useAppStore((state) => state.locale)
  const setResolvedTheme = useAppStore((state) => state.setResolvedTheme)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    let frameId = 0

    const applyTheme = () => {
      document.documentElement.dataset['themeSwitching'] = 'true'
      const resolvedTheme =
        themeMode === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : themeMode

      setResolvedTheme(resolvedTheme)
      document.documentElement.dataset['theme'] = resolvedTheme
      document.documentElement.dataset['themePreference'] = themeMode
      document.documentElement.style.colorScheme = resolvedTheme

      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }

      frameId = window.requestAnimationFrame(() => {
        document.documentElement.removeAttribute('data-theme-switching')
      })
    }

    applyTheme()
    mediaQuery.addEventListener?.('change', applyTheme)

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
      document.documentElement.removeAttribute('data-theme-switching')
      mediaQuery.removeEventListener?.('change', applyTheme)
    }
  }, [setResolvedTheme, themeMode])

  useEffect(() => {
    document.documentElement.dataset['locale'] = locale
    document.documentElement.lang = locale
  }, [locale])

  return children
}
