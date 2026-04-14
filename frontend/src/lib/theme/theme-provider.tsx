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

    const applyTheme = () => {
      const resolvedTheme =
        themeMode === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : themeMode

      setResolvedTheme(resolvedTheme)
      document.documentElement.dataset['theme'] = resolvedTheme
      document.documentElement.dataset['themePreference'] = themeMode
      document.documentElement.style.colorScheme = resolvedTheme
    }

    applyTheme()
    mediaQuery.addEventListener?.('change', applyTheme)

    return () => mediaQuery.removeEventListener?.('change', applyTheme)
  }, [setResolvedTheme, themeMode])

  useEffect(() => {
    document.documentElement.dataset['locale'] = locale
    document.documentElement.lang = locale
  }, [locale])

  return children
}
