import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  CircleHelp,
  Loader2,
  Menu as MenuIcon,
  Settings,
  Sparkles,
  UserRound,
  Wallet,
} from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { routeMetadata } from '@/components/layout/route-metadata'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { ApiError } from '@/lib/api/client'
import { clearBrowserAccount } from '@/lib/auth/browser-account'
import { SUPPORTED_LOCALES } from '@/lib/i18n/locale'
import { useAppStore } from '@/lib/store/app-store'
import { removeLocalStorageItemsMatching } from '@/lib/utils/safe-storage'
import type { LanguageCode, SettingsPayload } from '@/types'
import { formatRelativeTime } from '@/features/analysis/lib/view-models'

const localeLabelKey: Record<LanguageCode, string> = {
  en: 'common.languages.en',
  'zh-CN': 'common.languages.zhCn',
  'zh-HK': 'common.languages.zhHk',
}

function buildSettingsFallback(
  current: Partial<SettingsPayload> | undefined,
  locale: LanguageCode,
): SettingsPayload {
  return {
    themeMode: current?.themeMode ?? 'system',
    language: current?.language ?? locale,
    apiMode: current?.apiMode ?? 'mock',
    displayDensity: current?.displayDensity ?? 'cozy',
    notificationsEmail: current?.notificationsEmail ?? true,
    notificationsPush: current?.notificationsPush ?? false,
    autoExportPdf: current?.autoExportPdf ?? false,
    chartMotion: current?.chartMotion ?? true,
  }
}

function shouldForceLocalLogout(error: unknown) {
  if (error instanceof ApiError) {
    return error.status === 408
  }

  if (error instanceof TypeError) {
    return true
  }

  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('network down') ||
    message.includes('socket hang up') ||
    message.includes('load failed')
  )
}

export function Topbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const adapter = useApiAdapter()
  const currentUser = useAppStore((state) => state.currentUser)
  const locale = useAppStore((state) => state.locale)
  const setLocale = useAppStore((state) => state.setLocale)
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const clearSession = useAppStore((state) => state.clearSession)
  const clearWalletState = useAppStore((state) => state.clearWalletState)
  const meta = useMemo(() => routeMetadata(location.pathname), [location.pathname])

  const sessionsQuery = useQuery({
    queryKey: ['topbar', 'sessions', locale],
    queryFn: () => adapter.analysis.list({ page: 1, pageSize: 50 }),
    staleTime: 30_000,
  })
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: adapter.settings.get,
    staleTime: 60_000,
  })

  const localeMutation = useMutation({
    mutationFn: async (nextLocale: LanguageCode) => {
      const payload = buildSettingsFallback(settingsQuery.data, locale)
      return adapter.settings.update({
        ...payload,
        language: nextLocale,
      })
    },
    onMutate: (nextLocale) => {
      const previousSettings = queryClient.getQueryData<SettingsPayload>(['settings'])
      setLocale(nextLocale)
      queryClient.setQueryData<SettingsPayload>(['settings'], {
        ...buildSettingsFallback(previousSettings, locale),
        ...(previousSettings ?? {}),
        language: nextLocale,
      })
      return { previousSettings }
    },
    onSuccess: (settings) => {
      setLocale(settings.language)
      queryClient.setQueryData(['settings'], settings)
    },
    onError: (_error, _nextLocale, context) => {
      setLocale(locale)
      if (context?.previousSettings) {
        queryClient.setQueryData(['settings'], context.previousSettings)
      }
      toast.error(t('layout.topbar.localeUpdateError'))
    },
  })

  const disconnectWalletMutation = useMutation({
    mutationFn: async () => {
      clearWalletState()
      await queryClient.cancelQueries({ queryKey: ['wallet'] })
      queryClient.removeQueries({ queryKey: ['wallet'] })
      queryClient.removeQueries({ queryKey: ['hashkey'] })
      queryClient.removeQueries({ queryKey: ['rwa', 'portfolio'] })
    },
    onSuccess: () => {
      toast.success(t('layout.topbar.walletDisconnected'))
    },
    onError: () => {
      toast.error(t('layout.topbar.disconnectWalletError'))
    },
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        await adapter.auth.logout()
      } catch (error) {
        if (!shouldForceLocalLogout(error)) {
          throw error
        }
      }

      clearBrowserAccount()
      clearSession()
      clearWalletState()
      removeLocalStorageItemsMatching((key) => key.startsWith('ga-'))
      await queryClient.cancelQueries()
      queryClient.clear()
      await navigate('/login', { replace: true })
    },
    onSuccess: () => {
      toast.success(t('layout.topbar.loggedOut'))
    },
    onError: () => {
      toast.error(t('layout.topbar.logoutError'))
    },
  })

  useEffect(() => {
    document.title = `${t(meta.titleKey)} · Genius Actuary`
  }, [meta.titleKey, t])

  const latestUpdate = sessionsQuery.data?.items[0]?.updatedAt
  const accountTitle =
    currentUser?.email?.endsWith('@browser.local')
      ? t('auth.login.browserTitle')
      : currentUser?.email?.endsWith('@wallet.local')
        ? t('auth.login.walletTitle')
        : currentUser?.email?.endsWith('@safe.local')
          ? t('auth.login.safeTitle')
          : currentUser?.title ?? t('layout.topbar.profileTitle')

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle/80 bg-panel/90 px-[clamp(1rem,2vw,1.5rem)] py-4 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <Button
            variant="secondary"
            size="sm"
            className="lg:hidden"
            aria-label={sidebarOpen ? t('layout.topbar.closeNavigation') : t('layout.topbar.openNavigation')}
            title={sidebarOpen ? t('layout.topbar.closeNavigation') : t('layout.topbar.openNavigation')}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <MenuIcon className="size-4" />
          </Button>
          <Badge tone="primary">{t('layout.topbar.release')}</Badge>
          <Badge tone="info">
            {latestUpdate
              ? t('layout.topbar.updatedRelative', { value: formatRelativeTime(latestUpdate) })
              : t('layout.topbar.waitingActivity')}
          </Badge>
          <button
            type="button"
            className="interactive-lift inline-flex items-center gap-2 rounded-full border border-border-subtle bg-app-bg-elevated px-3 py-1.5 text-xs font-medium text-text-secondary"
            onClick={() =>
              toast.message(t('layout.topbar.helpTitle'), {
                description: t('layout.topbar.helpDescription'),
              })
            }
            aria-label={t('layout.topbar.helpTitle')}
          >
            <CircleHelp className="size-3.5" />
            <span className="hidden sm:inline">{t('layout.topbar.helpTitle')}</span>
          </button>
        </div>

        <div className="flex min-w-0 flex-wrap items-center justify-end gap-3">
          <div
            className="flex flex-wrap items-center gap-1 rounded-full border border-border-subtle bg-app-bg-elevated p-1"
            aria-label={t('layout.topbar.languageLabel')}
          >
            {SUPPORTED_LOCALES.map((item) => {
              const active = item === locale
              return (
                <button
                  key={item}
                  type="button"
                  className={
                    active
                      ? 'rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white'
                      : 'rounded-full px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-surface hover:text-text-primary'
                  }
                  onClick={() => {
                    if (item !== locale) {
                      localeMutation.mutate(item)
                    }
                  }}
                >
                  {t(localeLabelKey[item])}
                </button>
              )
            })}
          </div>

          <Menu as="div" className="relative">
            <MenuButton
              className="interactive-lift inline-flex min-h-11 max-w-full items-center gap-3 rounded-[18px] border border-border-subtle bg-app-bg-elevated px-3 py-2 text-left"
              aria-label={t('layout.topbar.accountMenu')}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                <Sparkles className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-text-primary">
                  {currentUser?.name ?? 'Genius Actuary'}
                </span>
                <span className="block truncate text-xs text-text-muted">{accountTitle}</span>
              </span>
              <ChevronDown className="size-4 shrink-0 text-text-muted" />
            </MenuButton>

            <MenuItems
              anchor="bottom end"
              className="menu-surface z-50 mt-2 w-[260px] rounded-[24px] border border-border-subtle p-2 focus:outline-none"
            >
              <MenuItem>
                {({ focus }) => (
                  <button
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm ${focus ? 'bg-app-bg-elevated text-text-primary' : 'text-text-secondary'}`}
                    onClick={() =>
                      toast.message(t('actions.profile'), {
                        description: currentUser?.email ?? t('layout.topbar.noProfile'),
                      })
                    }
                  >
                    <UserRound className="size-4" />
                    {t('actions.profile')}
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ focus }) => (
                  <button
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm ${focus ? 'bg-app-bg-elevated text-text-primary' : 'text-text-secondary'}`}
                    onClick={() => void navigate('/settings')}
                  >
                    <Settings className="size-4" />
                    {t('actions.settings')}
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ focus }) => (
                  <button
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm ${focus ? 'bg-app-bg-elevated text-text-primary' : 'text-text-secondary'}`}
                    onClick={() => disconnectWalletMutation.mutate()}
                    disabled={disconnectWalletMutation.isPending}
                  >
                    {disconnectWalletMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Wallet className="size-4" />
                    )}
                    {disconnectWalletMutation.isPending
                      ? t('layout.topbar.disconnectingWallet')
                      : t('actions.disconnectWallet')}
                  </button>
                )}
              </MenuItem>
              <MenuItem>
                {({ focus }) => (
                  <button
                    type="button"
                    className={`menu-danger-item flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm ${focus ? 'text-danger' : 'text-danger'}`}
                    onClick={() => logoutMutation.mutate()}
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    {logoutMutation.isPending
                      ? t('layout.topbar.loggingOut')
                      : t('actions.logOut')}
                  </button>
                )}
              </MenuItem>
            </MenuItems>
          </Menu>
        </div>
      </div>
    </header>
  )
}
