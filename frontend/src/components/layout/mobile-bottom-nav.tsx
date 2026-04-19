import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BarChart3, Globe2, Layers3, LayoutGrid, Menu, PlusSquare, Settings2, TrendingUp } from 'lucide-react'

import { DetailDrawer } from '@/components/product/decision-ui'
import { Button } from '@/components/ui/button'
import { SUPPORTED_LOCALES } from '@/lib/i18n/locale'
import { useAppStore } from '@/lib/store/app-store'
import { workspaceNavigationItems } from '@/components/layout/route-metadata'
import { cn } from '@/lib/utils/cn'

const iconByItemId = {
  workspace: LayoutGrid,
  'new-analysis': PlusSquare,
  sessions: Layers3,
  stocks: TrendingUp,
  portfolio: BarChart3,
  settings: Settings2,
} as const

export function MobileBottomNav() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [moreOpen, setMoreOpen] = useState(false)
  const locale = useAppStore((state) => state.locale)
  const setLocale = useAppStore((state) => state.setLocale)

  const mobileItems = workspaceNavigationItems.filter((item) => item.mobile)
  const overflowItems = workspaceNavigationItems.filter((item) => !item.mobile)

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-panel/95 px-3 py-2 backdrop-blur lg:hidden">
        <div className="grid grid-cols-6 gap-2">
          {mobileItems.map((item) => {
            const Icon = iconByItemId[item.id as keyof typeof iconByItemId] ?? LayoutGrid
            const active =
              item.to === '/stocks'
                ? location.pathname.startsWith('/stocks')
                : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => void navigate(item.to)}
                aria-label={t(item.labelKey)}
                className={cn(
                  'flex min-h-12 flex-col items-center justify-center gap-1 rounded-[18px] px-2 text-[11px] font-medium',
                  active ? 'bg-primary-soft text-text-primary' : 'text-text-secondary',
                )}
              >
                <Icon className="size-4" />
                <span className="truncate">{t(item.labelKey)}</span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-label={t('layout.mobileNav.more')}
            className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-[18px] px-2 text-[11px] font-medium text-text-secondary"
          >
            <Menu className="size-4" />
            <span>{t('layout.mobileNav.more')}</span>
          </button>
        </div>
      </nav>

      <DetailDrawer
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        title={t('layout.mobileNav.menuTitle')}
        description={t('layout.mobileNav.menuDescription')}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            {overflowItems.map((item) => (
              <Button
                key={item.id}
                variant="secondary"
                className="w-full justify-between"
                onClick={() => {
                  setMoreOpen(false)
                  void navigate(item.to)
                }}
              >
                {t(item.labelKey)}
              </Button>
            ))}
          </div>
          <div className="space-y-2 rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
              <Globe2 className="size-4" />
              {t('layout.topbar.menuLanguage')}
            </div>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_LOCALES.map((item) => (
                <Button
                  key={item}
                  variant={item === locale ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setLocale(item)}
                >
                  {t(
                    item === 'en'
                      ? 'common.languages.en'
                      : item === 'zh-CN'
                        ? 'common.languages.zhCn'
                        : 'common.languages.zhHk',
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DetailDrawer>
    </>
  )
}
