import { type PropsWithChildren, useEffect } from 'react'

import { useAppStore } from '@/lib/store/app-store'

export function ThemeProvider({ children }: PropsWithChildren) {
  const setResolvedTheme = useAppStore((state) => state.setResolvedTheme)

  useEffect(() => {
    const resolvedTheme = 'dark'
    setResolvedTheme(resolvedTheme)
    document.documentElement.dataset['theme'] = resolvedTheme
    document.documentElement.dataset['themePreference'] = resolvedTheme
    document.documentElement.style.colorScheme = resolvedTheme
  }, [setResolvedTheme])

  return children
}
