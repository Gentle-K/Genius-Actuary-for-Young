import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'

import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { useAppStore } from '@/lib/store/app-store'

export function AppShell() {
  const location = useLocation()
  const reducedMotion = useReducedMotion()
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)

  return (
    <div className="bg-app-bg text-text-primary min-h-screen">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(164,198,177,0.22),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(143,183,195,0.12),transparent_24%)]" />

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-[rgba(18,27,21,0.26)] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="relative mx-auto flex min-h-screen max-w-[1560px] gap-3 p-3 md:gap-4 md:p-4">
        <Sidebar collapsed={!sidebarOpen} />
        <div className="min-w-0 flex-1">
          <Topbar />
          <AnimatePresence initial={false} mode="sync">
            <motion.main
              key={location.pathname}
              initial={reducedMotion ? undefined : { opacity: 0, y: 16 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="page-padding relative min-w-0 pb-10"
            >
              <div className="mx-auto min-w-0 max-w-[1480px]">
                <Outlet />
              </div>
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
