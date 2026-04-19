import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { useAppStore } from '@/lib/store/app-store'

export function AppShell() {
  const location = useLocation()
  const reducedMotion = useReducedMotion()
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.innerWidth < 1024 &&
      useAppStore.getState().sidebarOpen
    ) {
      setSidebarOpen(false)
    }
  }, [location.pathname, setSidebarOpen])

  return (
    <div className="min-h-screen bg-bg-page text-text-primary">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.05),transparent_22%),radial-gradient(circle_at_top_right,rgba(79,124,255,0.08),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(124,92,255,0.08),transparent_28%)]" />

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-[rgba(6,12,22,0.45)] backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="relative mx-auto flex min-h-screen max-w-[1880px]">
        <Sidebar collapsed={!sidebarOpen} />
        <div className="min-w-0 flex-1 min-[1024px]:pl-[5.75rem] min-[1536px]:pl-[18rem]">
          <Topbar />
          <AnimatePresence initial={false} mode="wait">
            <motion.main
              key={location.pathname}
              initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="min-w-0 px-[clamp(1rem,2vw,1.75rem)] pb-28 pt-6 md:pb-12 md:pt-8"
            >
              <Outlet />
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  )
}
