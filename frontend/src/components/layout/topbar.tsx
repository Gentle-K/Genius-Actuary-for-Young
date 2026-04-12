import { useMutation, useQuery } from '@tanstack/react-query'
import {
  CircleHelp,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'
import { formatRelativeTime } from '@/features/analysis/lib/view-models'

function routeMeta(pathname: string) {
  if (pathname.startsWith('/new-analysis')) {
    return { title: 'New Analysis', helper: 'Start a fresh decision workflow.' }
  }
  if (pathname.startsWith('/sessions')) {
    return { title: 'Sessions', helper: 'Track clarifications, progress, and outcomes.' }
  }
  if (pathname.startsWith('/reports')) {
    return { title: 'Reports', helper: 'Read structured recommendations and charts.' }
  }
  if (pathname.startsWith('/evidence')) {
    return { title: 'Evidence', helper: 'Inspect sources, freshness, and extracted facts.' }
  }
  if (pathname.startsWith('/calculations')) {
    return { title: 'Calculations', helper: 'Review deterministic math behind the recommendation.' }
  }
  if (pathname.startsWith('/settings')) {
    return { title: 'Settings', helper: 'Manage defaults, exports, and data retention.' }
  }
  return { title: 'Genius Actuary', helper: 'AI decision analysis workspace.' }
}

export function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const adapter = useApiAdapter()
  const currentUser = useAppStore((state) => state.currentUser)
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const clearSession = useAppStore((state) => state.clearSession)
  const locale = useAppStore((state) => state.locale)
  const meta = useMemo(() => routeMeta(location.pathname), [location.pathname])

  const sessionsQuery = useQuery({
    queryKey: ['topbar', 'sessions'],
    queryFn: () => adapter.analysis.list({ page: 1, pageSize: 50 }),
    staleTime: 30_000,
  })

  const logoutMutation = useMutation({
    mutationFn: adapter.auth.logout,
    onSuccess: async () => {
      clearSession()
      await navigate('/login')
    },
  })

  useEffect(() => {
    document.title = `${meta.title} · Genius Actuary`
  }, [meta.title])

  const latestUpdate = sessionsQuery.data?.items[0]?.updatedAt

  return (
    <header className="apple-nav-glass sticky top-3 z-30 mb-6 rounded-[28px] px-4 py-4 md:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="secondary"
              size="sm"
              aria-label={sidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
              title={sidebarOpen ? 'Collapse navigation' : 'Expand navigation'}
              onClick={toggleSidebar}
            >
              <Menu className="size-4" />
            </Button>
            <Badge tone="gold">Workspace</Badge>
            <Badge tone="neutral">{locale === 'zh' ? 'ZH' : 'EN'}</Badge>
            <Badge tone="info">
              {latestUpdate ? `Synced ${formatRelativeTime(latestUpdate)}` : 'Waiting for data'}
            </Badge>
          </div>
          <div>
            <h2 className="text-[1.45rem] font-semibold tracking-[-0.04em] text-text-primary md:text-[1.75rem]">
              {meta.title}
            </h2>
            <p className="text-sm leading-6 text-text-secondary">{meta.helper}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
          <button
            type="button"
            className="interactive-lift inline-flex size-10 items-center justify-center rounded-full border border-border-subtle bg-app-bg-elevated text-text-secondary"
            title="Help"
            aria-label="Help"
            onClick={() =>
              toast.message('Help', {
                description:
                  'This MVP shows how the system structures decisions, evidence, and recommendations.',
              })
            }
          >
            <CircleHelp className="size-4" />
          </button>
          <button
            type="button"
            className="interactive-lift inline-flex size-10 items-center justify-center rounded-full border border-border-subtle bg-app-bg-elevated text-text-secondary"
            title="Settings"
            aria-label="Settings"
            onClick={() => void navigate('/settings')}
          >
            <Settings className="size-4" />
          </button>
          <button
            type="button"
            className="interactive-lift inline-flex size-10 items-center justify-center rounded-full border border-border-subtle bg-app-bg-elevated text-text-secondary"
            title="Profile"
            aria-label="Profile"
            onClick={() =>
              toast.message('Profile', {
                description: currentUser?.email ?? 'No active profile loaded.',
              })
            }
          >
            <UserRound className="size-4" />
          </button>
          <button
            type="button"
            className="interactive-lift inline-flex size-10 items-center justify-center rounded-full border border-border-subtle bg-app-bg-elevated text-text-secondary"
            title="Sign out"
            aria-label="Sign out"
            onClick={() => void logoutMutation.mutateAsync()}
          >
            <LogOut className="size-4" />
          </button>

          <div className="flex min-h-11 items-center gap-3 rounded-full border border-border-subtle bg-app-bg-elevated px-3 py-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-text-primary">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-primary">
                {currentUser?.name ?? 'Demo analyst'}
              </p>
              <p className="truncate text-xs text-text-muted">
                {currentUser?.title ?? 'Personal decision workspace'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
