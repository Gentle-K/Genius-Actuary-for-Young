import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/page-header'
import {
  ErrorState,
  MetricCard,
  PreviewNote,
  SectionCard,
} from '@/components/product/decision-ui'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'
import { getLocalStorageItem, setLocalStorageItem } from '@/lib/utils/safe-storage'

export function SettingsPage() {
  const adapter = useApiAdapter()
  const syncFromSettings = useAppStore((state) => state.syncFromSettings)
  const walletAddress = useAppStore((state) => state.walletAddress)
  const walletChainId = useAppStore((state) => state.walletChainId)
  const [riskDefault, setRiskDefault] = useState('Balanced')
  const [dataRetention, setDataRetention] = useState('90 days')
  const [preferredCurrency, setPreferredCurrency] = useState('USD')
  const [preferredNetwork, setPreferredNetwork] = useState('HashKey Chain')
  const [chartUnit, setChartUnit] = useState('Native units')
  const [exportPreference, setExportPreference] = useState('Manual export')

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: adapter.settings.get,
  })

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: adapter.profile.get,
  })

  const updateMutation = useMutation({
    mutationFn: adapter.settings.update,
    onSuccess: (settings) => {
      syncFromSettings(settings)
      toast.success('Settings saved')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: adapter.auth.deletePersonalData,
    onSuccess: (result) => {
      toast.success(`Deleted ${result.deletedSessionCount} demo session(s)`)
    },
  })

  useEffect(() => {
    const storedRisk = getLocalStorageItem('ga-risk-default')
    const storedRetention = getLocalStorageItem('ga-data-retention')
    const storedCurrency = getLocalStorageItem('ga-preferred-currency')
    const storedNetwork = getLocalStorageItem('ga-preferred-network')
    const storedChartUnit = getLocalStorageItem('ga-preferred-chart-unit')
    const storedExportPreference = getLocalStorageItem('ga-export-preference')
    if (storedRisk) setRiskDefault(storedRisk)
    if (storedRetention) setDataRetention(storedRetention)
    if (storedCurrency) setPreferredCurrency(storedCurrency)
    if (storedNetwork) setPreferredNetwork(storedNetwork)
    if (storedChartUnit) setChartUnit(storedChartUnit)
    if (storedExportPreference) setExportPreference(storedExportPreference)
  }, [])

  const saveLocalPreferences = (
    nextRisk = riskDefault,
    nextRetention = dataRetention,
    nextCurrency = preferredCurrency,
    nextNetwork = preferredNetwork,
    nextChartUnit = chartUnit,
    nextExportPreference = exportPreference,
  ) => {
    setLocalStorageItem('ga-risk-default', nextRisk)
    setLocalStorageItem('ga-data-retention', nextRetention)
    setLocalStorageItem('ga-preferred-currency', nextCurrency)
    setLocalStorageItem('ga-preferred-network', nextNetwork)
    setLocalStorageItem('ga-preferred-chart-unit', nextChartUnit)
    setLocalStorageItem('ga-export-preference', nextExportPreference)
  }

  if (settingsQuery.isError || profileQuery.isError) {
    return (
      <ErrorState
        title="Could not load settings"
        description={
          (settingsQuery.error as Error | undefined)?.message ??
          (profileQuery.error as Error | undefined)?.message ??
          'The settings page is unavailable.'
        }
        action={
          <Button
            variant="secondary"
            onClick={() => {
              void settingsQuery.refetch()
              void profileQuery.refetch()
            }}
          >
            Retry
          </Button>
        }
      />
    )
  }

  if (settingsQuery.isLoading || profileQuery.isLoading || !settingsQuery.data || !profileQuery.data) {
    return (
      <Card className="space-y-4 p-6">
        <p className="text-base font-semibold text-text-primary">Loading settings</p>
        <p className="text-sm text-text-secondary">
          Preparing profile, preferences, and retention controls.
        </p>
      </Card>
    )
  }

  const settings = settingsQuery.data
  const profile = profileQuery.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Settings"
        description="Manage profile details, release-safe defaults, export behavior, notifications, wallet connections, and retention choices for this workspace."
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Profile"
          value={profile.name}
          detail={profile.email}
          tone="brand"
        />
        <MetricCard
          title="Default risk preference"
          value={riskDefault}
          detail="Used as an intake default when starting a new analysis."
          tone="success"
        />
        <MetricCard
          title="Default currency"
          value={preferredCurrency}
          detail="Stored locally until server-side release preferences expand."
          tone="brand"
        />
        <MetricCard
          title="Wallet connection"
          value={walletAddress ? 'Connected' : 'Not connected'}
          detail={walletAddress ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}` : 'No wallet connected in this browser session.'}
          tone="success"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <SectionCard title="Profile" description="Basic account information for this browser-linked workspace.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-primary">Name</label>
                <Input value={profile.name} readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-primary">Email</label>
                <Input value={profile.email} readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-primary">Timezone</label>
                <Input value={profile.timezone} readOnly />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-primary">Workspace bio</label>
                <Input value={profile.bio} readOnly />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Default analysis preferences" description="These defaults shape the initial intake surface and release presentation.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-primary">Language</label>
                <Select
                  value={settings.language}
                  onChange={(event) =>
                    void updateMutation.mutateAsync({
                      ...settings,
                      language: event.target.value === 'en' ? 'en' : 'zh',
                    })
                  }
                >
                  <option value="zh">Chinese</option>
                  <option value="en">English</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-primary">Theme</label>
                <Select
                  value="dark"
                  onChange={() =>
                    void updateMutation.mutateAsync({
                      ...settings,
                      themeMode: 'dark',
                    })
                  }
                >
                  <option value="dark">Dark</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-primary">
                  Risk preference default
                </label>
                <Select
                  value={riskDefault}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setRiskDefault(nextValue)
                    saveLocalPreferences(nextValue)
                  }}
                >
                  <option value="Conservative">Conservative</option>
                  <option value="Balanced">Balanced</option>
                  <option value="Aggressive">Aggressive</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-primary">Default currency</label>
                <Select
                  value={preferredCurrency}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setPreferredCurrency(nextValue)
                    saveLocalPreferences(riskDefault, dataRetention, nextValue)
                  }}
                >
                  <option value="USD">USD</option>
                  <option value="USDT">USDT</option>
                  <option value="HKD">HKD</option>
                  <option value="Custom">Custom</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-primary">Preferred chain / network</label>
                <Select
                  value={preferredNetwork}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setPreferredNetwork(nextValue)
                    saveLocalPreferences(riskDefault, dataRetention, preferredCurrency, nextValue)
                  }}
                >
                  <option value="HashKey Chain">HashKey Chain</option>
                  <option value="Ethereum-compatible">Ethereum-compatible</option>
                  <option value="General analysis">General analysis</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-primary">Preferred chart unit</label>
                <Select
                  value={chartUnit}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setChartUnit(nextValue)
                    saveLocalPreferences(
                      riskDefault,
                      dataRetention,
                      preferredCurrency,
                      preferredNetwork,
                      nextValue,
                    )
                  }}
                >
                  <option value="Native units">Native units</option>
                  <option value="USD converted">USD converted</option>
                  <option value="Percent / basis points">Percent / basis points</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-primary">Report export preference</label>
                <Select
                  value={exportPreference}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setExportPreference(nextValue)
                    saveLocalPreferences(
                      riskDefault,
                      dataRetention,
                      preferredCurrency,
                      preferredNetwork,
                      chartUnit,
                      nextValue,
                    )
                    void updateMutation.mutateAsync({
                      ...settings,
                      autoExportPdf: nextValue === 'Auto PDF after completion',
                    })
                  }}
                >
                  <option value="Manual export">Manual export</option>
                  <option value="Auto PDF after completion">Auto PDF after completion</option>
                </Select>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Notification settings" description="Delivery channels for product events.">
            <div className="grid gap-4 md:grid-cols-2">
              <Button
                variant={settings.notificationsEmail ? 'primary' : 'secondary'}
                onClick={() =>
                  void updateMutation.mutateAsync({
                    ...settings,
                    notificationsEmail: !settings.notificationsEmail,
                  })
                }
              >
                Email notifications {settings.notificationsEmail ? 'on' : 'off'}
              </Button>
              <Button
                variant={settings.notificationsPush ? 'primary' : 'secondary'}
                onClick={() =>
                  void updateMutation.mutateAsync({
                    ...settings,
                    notificationsPush: !settings.notificationsPush,
                  })
                }
              >
                Push notifications {settings.notificationsPush ? 'on' : 'off'}
              </Button>
            </div>
          </SectionCard>

          <SectionCard title="Data retention" description="Retention and deletion controls stay visible because this product handles decision context, evidence, and assumptions.">
            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-text-primary">Retention preference</label>
                <Select
                  value={dataRetention}
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setDataRetention(nextValue)
                    saveLocalPreferences(riskDefault, nextValue)
                  }}
                >
                  <option value="30 days">30 days</option>
                  <option value="90 days">90 days</option>
                  <option value="Keep until deleted">Keep until deleted</option>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  variant="danger"
                  onClick={() => void deleteMutation.mutateAsync()}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? 'Deleting...' : 'Delete personal data'}
                </Button>
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Wallet connections" description="Wallet state is shown separately from authentication.">
            <div className="space-y-3">
              <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Current wallet</p>
                <p className="mt-2 text-sm leading-6 text-text-primary">
                  {walletAddress ? `${walletAddress} on chain ${walletChainId ?? 'unknown'}` : 'No wallet connected in this browser.'}
                </p>
              </div>
              <div className="rounded-[20px] border border-border-subtle bg-bg-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Release behavior</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  Wallets are treated as connected-service context for evidence, execution, and KYC-aware flows. They are not used as login credentials in this release build.
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Boundary note" description="The release keeps product boundaries explicit on the settings page as well.">
            <PreviewNote>
              Genius Actuary provides structured decision support. Recommendations, confidence levels, and calculations should be reviewed alongside source freshness, constraints, and any external legal or financial review required by the decision.
            </PreviewNote>
          </SectionCard>

          <SectionCard title="Notifications and release behavior" description="Communication and export defaults should stay conservative for high-signal workflows.">
            <div className="space-y-3 rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
              <p className="text-sm leading-6 text-text-secondary">
                Email notifications are {settings.notificationsEmail ? 'enabled' : 'disabled'}, push notifications are {settings.notificationsPush ? 'enabled' : 'disabled'}, and export behavior is set to {exportPreference.toLowerCase()}.
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Team features coming later" description="The MVP is optimized for a single user workspace.">
            <p className="text-sm leading-6 text-text-secondary">
              Shared workspaces, reviewers, and approval flows are intentionally deferred so the
              product can stay focused on the single-user decision analysis loop.
            </p>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
