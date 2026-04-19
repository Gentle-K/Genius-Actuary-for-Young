import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Monitor, MoonStar, ShieldCheck, SunMedium, Wallet } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  PageContainer,
  PageHeader,
  PageSection,
} from '@/components/layout/page-header'
import {
  FormField,
  MetricCard,
  SectionCard,
  StickyFooter,
} from '@/components/product/workspace-ui'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'
import {
  getLocalStorageItem,
  setLocalStorageItem,
} from '@/lib/utils/safe-storage'
import { shortAddress } from '@/lib/web3/hashkey'
import type { LanguageCode, SettingsPayload, ThemeMode } from '@/types'

const RISK_KEY = 'ga-risk-default'
const RETENTION_KEY = 'ga-data-retention'
const CURRENCY_KEY = 'ga-preferred-currency'
const NETWORK_KEY = 'ga-preferred-network'
const CHART_UNIT_KEY = 'ga-preferred-chart-unit'
const EXPORT_KEY = 'ga-export-preference'

const legacyRiskMap: Record<string, string> = {
  Conservative: 'conservative',
  Balanced: 'balanced',
  Aggressive: 'aggressive',
}
const legacyNetworkMap: Record<string, string> = {
  'HashKey Chain': 'hashkey',
  'Ethereum-compatible': 'evm',
  'General analysis': 'general',
}
const legacyChartUnitMap: Record<string, string> = {
  'Native units': 'native',
  'USD converted': 'usd',
  'Percent / basis points': 'percent',
}
const legacyExportMap: Record<string, string> = {
  'Manual export': 'manual',
  'Auto PDF after completion': 'autoPdf',
}
const legacyRetentionMap: Record<string, string> = {
  '30 days': '30',
  '90 days': '90',
  '365 days': '365',
}

interface WorkspaceSettingsDraft {
  language: LanguageCode
  themeMode: ThemeMode
  notificationsEmail: boolean
  notificationsPush: boolean
  autoExportPdf: boolean
  riskDefault: string
  dataRetention: string
  preferredCurrency: string
  preferredNetwork: string
  chartUnit: string
  exportPreference: string
}

function normalizeStoredValue(
  value: string | null,
  fallback: string,
  mapping?: Record<string, string>,
) {
  if (!value) {
    return fallback
  }
  return mapping?.[value] ?? value
}

function themeIcon(mode: ThemeMode) {
  if (mode === 'light') {
    return <SunMedium className="size-4" />
  }
  if (mode === 'dark') {
    return <MoonStar className="size-4" />
  }
  return <Monitor className="size-4" />
}

function buildDraft(currentSettings: SettingsPayload): WorkspaceSettingsDraft {
  return {
    language: currentSettings.language,
    themeMode: currentSettings.themeMode,
    notificationsEmail: currentSettings.notificationsEmail,
    notificationsPush: currentSettings.notificationsPush,
    autoExportPdf: currentSettings.autoExportPdf,
    riskDefault: normalizeStoredValue(getLocalStorageItem(RISK_KEY), 'balanced', legacyRiskMap),
    dataRetention: normalizeStoredValue(getLocalStorageItem(RETENTION_KEY), '90', legacyRetentionMap),
    preferredCurrency: normalizeStoredValue(getLocalStorageItem(CURRENCY_KEY), 'USD'),
    preferredNetwork: normalizeStoredValue(getLocalStorageItem(NETWORK_KEY), 'hashkey', legacyNetworkMap),
    chartUnit: normalizeStoredValue(getLocalStorageItem(CHART_UNIT_KEY), 'native', legacyChartUnitMap),
    exportPreference: normalizeStoredValue(
      getLocalStorageItem(EXPORT_KEY),
      currentSettings.autoExportPdf ? 'autoPdf' : 'manual',
      legacyExportMap,
    ),
  }
}

function persistLocalPreferences(draft: WorkspaceSettingsDraft) {
  setLocalStorageItem(RISK_KEY, draft.riskDefault)
  setLocalStorageItem(RETENTION_KEY, draft.dataRetention)
  setLocalStorageItem(CURRENCY_KEY, draft.preferredCurrency)
  setLocalStorageItem(NETWORK_KEY, draft.preferredNetwork)
  setLocalStorageItem(CHART_UNIT_KEY, draft.chartUnit)
  setLocalStorageItem(EXPORT_KEY, draft.exportPreference)
}

function draftsEqual(left: WorkspaceSettingsDraft, right: WorkspaceSettingsDraft) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function SettingsPage() {
  const { t } = useTranslation()
  const adapter = useApiAdapter()
  const queryClient = useQueryClient()
  const syncFromSettings = useAppStore((state) => state.syncFromSettings)
  const clearWalletState = useAppStore((state) => state.clearWalletState)
  const walletAddress = useAppStore((state) => state.walletAddress)
  const [draft, setDraft] = useState<WorkspaceSettingsDraft | null>(null)
  const hydratedFromServerRef = useRef(false)

  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: adapter.settings.get,
  })
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: adapter.profile.get,
  })

  const currentSettings = settingsQuery.data
  const profile = profileQuery.data
  const baseDraft = useMemo(
    () => (currentSettings ? buildDraft(currentSettings) : null),
    [currentSettings],
  )
  const effectiveDraft = draft ?? baseDraft
  const isDirty = baseDraft && effectiveDraft ? !draftsEqual(baseDraft, effectiveDraft) : false

  const localeOptions = useMemo(
    () =>
      [
        { value: 'en', label: t('common.languages.en') },
        { value: 'zh-CN', label: t('common.languages.zhCn') },
        { value: 'zh-HK', label: t('common.languages.zhHk') },
      ] satisfies Array<{ value: LanguageCode; label: string }>,
    [t],
  )

  const updateMutation = useMutation({
    mutationFn: (nextSettings: SettingsPayload) => adapter.settings.update(nextSettings),
    onMutate: async (nextSettings: SettingsPayload) => {
      await queryClient.cancelQueries({ queryKey: ['settings'] })
      const previousSettings = queryClient.getQueryData<SettingsPayload>(['settings'])
      queryClient.setQueryData<SettingsPayload>(['settings'], nextSettings)
      syncFromSettings(nextSettings)
      return { previousSettings }
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(['settings'], settings)
      syncFromSettings(settings)
      setDraft(null)
      toast.success(t('settings.saved'))
    },
    onError: (_error, _nextSettings, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(['settings'], context.previousSettings)
        syncFromSettings(context.previousSettings)
      }
      toast.error(t('common.retry'))
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
  const deleteMutation = useMutation({
    mutationFn: adapter.auth.deletePersonalData,
    onSuccess: (result) => {
      toast.success(t('settings.deleteSuccess', { count: result.deletedSessionCount }))
    },
  })

  useEffect(() => {
    if (!currentSettings || hydratedFromServerRef.current) {
      return
    }
    hydratedFromServerRef.current = true
    syncFromSettings(currentSettings)
  }, [currentSettings, syncFromSettings])

  const updateDraft = <K extends keyof WorkspaceSettingsDraft>(
    key: K,
    value: WorkspaceSettingsDraft[K],
  ) => {
    setDraft((current) => ({
      ...(current ?? (baseDraft as WorkspaceSettingsDraft)),
      [key]: value,
    }))
  }

  const saveDraft = () => {
    if (!currentSettings || !effectiveDraft) {
      return
    }

    persistLocalPreferences(effectiveDraft)
    updateMutation.mutate({
      ...currentSettings,
      language: effectiveDraft.language,
      themeMode: effectiveDraft.themeMode,
      notificationsEmail: effectiveDraft.notificationsEmail,
      notificationsPush: effectiveDraft.notificationsPush,
      autoExportPdf: effectiveDraft.exportPreference === 'autoPdf',
    })
  }

  if (settingsQuery.isError || profileQuery.isError) {
    return (
      <SectionCard
        title={t('settings.title')}
        description={
          (settingsQuery.error as Error | undefined)?.message ??
          (profileQuery.error as Error | undefined)?.message ??
          t('common.retry')
        }
        action={
          <Button
            variant="secondary"
            onClick={() => {
              void settingsQuery.refetch()
              void profileQuery.refetch()
            }}
          >
            {t('common.retry')}
          </Button>
        }
        state="danger"
      >
        <p className="text-sm text-text-secondary">{t('common.retry')}</p>
      </SectionCard>
    )
  }

  if (!currentSettings || !profile || !effectiveDraft) {
    return (
      <Card className="space-y-4 p-6">
        <p className="text-base font-semibold text-text-primary">{t('common.loading')}</p>
        <p className="text-sm text-text-secondary">{t('settings.description')}</p>
      </Card>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t('settings.eyebrow')}
        title={t('settings.title')}
        description={t('settings.description')}
      />

      <PageSection className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('settings.groups.appearance')}
          value={
            localeOptions.find((item) => item.value === effectiveDraft.language)?.label ??
            effectiveDraft.language
          }
          helperText={t('settings.groupDescriptions.appearance')}
          status="info"
        />
        <MetricCard
          label={t('settings.groups.defaults')}
          value={t(`settings.options.risk.${effectiveDraft.riskDefault}`)}
          helperText={t('settings.groupDescriptions.defaults')}
          status="success"
        />
        <MetricCard
          label={t('settings.groups.notifications')}
          value={t(`settings.options.export.${effectiveDraft.exportPreference}`)}
          helperText={t('settings.groupDescriptions.notifications')}
          status="warning"
        />
        <MetricCard
          label={t('settings.groups.account')}
          value={walletAddress ? shortAddress(walletAddress) : t('settings.noWalletConnected')}
          helperText={t('settings.groupDescriptions.account')}
          status={walletAddress ? 'success' : 'neutral'}
        />
      </PageSection>

      <PageSection className="space-y-6">
        <SectionCard
          title={t('settings.groups.appearance')}
          description={t('settings.groupDescriptions.appearance')}
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <FormField label={t('settings.fields.language')}>
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={effectiveDraft.language}
                  onChange={(event) =>
                    updateDraft('language', event.target.value as LanguageCode)
                  }
                >
                  {localeOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              )}
            </FormField>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-text-primary">{t('settings.fields.theme')}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {(['system', 'dark', 'light'] as const).map((optionThemeMode) => {
                  const active = effectiveDraft.themeMode === optionThemeMode
                  return (
                    <button
                      key={optionThemeMode}
                      type="button"
                      aria-pressed={active}
                      className={
                        active
                          ? 'flex min-h-11 items-center justify-center gap-2 rounded-[18px] border border-primary bg-primary-soft px-4 py-3 text-sm font-semibold text-text-primary'
                          : 'flex min-h-11 items-center justify-center gap-2 rounded-[18px] border border-border-subtle bg-app-bg-elevated px-4 py-3 text-sm text-text-secondary hover:border-border-strong hover:text-text-primary'
                      }
                      onClick={() => updateDraft('themeMode', optionThemeMode)}
                    >
                      {themeIcon(optionThemeMode)}
                      {t(`common.themes.${optionThemeMode}`)}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={t('settings.groups.defaults')}
          description={t('settings.groupDescriptions.defaults')}
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <FormField label={t('settings.fields.risk')}>
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={effectiveDraft.riskDefault}
                  onChange={(event) => updateDraft('riskDefault', event.target.value)}
                >
                  <option value="conservative">{t('settings.options.risk.conservative')}</option>
                  <option value="balanced">{t('settings.options.risk.balanced')}</option>
                  <option value="aggressive">{t('settings.options.risk.aggressive')}</option>
                </Select>
              )}
            </FormField>
            <FormField label={t('settings.fields.currency')}>
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={effectiveDraft.preferredCurrency}
                  onChange={(event) => updateDraft('preferredCurrency', event.target.value)}
                >
                  <option value="USD">{t('settings.options.currency.usd')}</option>
                  <option value="USDC">{t('settings.options.currency.usdc')}</option>
                  <option value="USDT">{t('settings.options.currency.usdt')}</option>
                  <option value="HKD">{t('settings.options.currency.hkd')}</option>
                </Select>
              )}
            </FormField>
            <FormField label={t('settings.fields.network')}>
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={effectiveDraft.preferredNetwork}
                  onChange={(event) => updateDraft('preferredNetwork', event.target.value)}
                >
                  <option value="hashkey">{t('settings.options.network.hashkey')}</option>
                  <option value="evm">{t('settings.options.network.evm')}</option>
                  <option value="general">{t('settings.options.network.general')}</option>
                </Select>
              )}
            </FormField>
            <FormField label={t('settings.fields.chartUnit')}>
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={effectiveDraft.chartUnit}
                  onChange={(event) => updateDraft('chartUnit', event.target.value)}
                >
                  <option value="native">{t('settings.options.chartUnit.native')}</option>
                  <option value="usd">{t('settings.options.chartUnit.usd')}</option>
                  <option value="percent">{t('settings.options.chartUnit.percent')}</option>
                </Select>
              )}
            </FormField>
          </div>
        </SectionCard>

        <SectionCard
          title={t('settings.groups.notifications')}
          description={t('settings.groupDescriptions.notifications')}
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <Button
              variant={effectiveDraft.notificationsEmail ? 'primary' : 'secondary'}
              onClick={() =>
                updateDraft('notificationsEmail', !effectiveDraft.notificationsEmail)
              }
            >
              {t('settings.fields.emailNotifications')} ·{' '}
              {effectiveDraft.notificationsEmail
                ? t('settings.notificationsEnabled')
                : t('settings.notificationsDisabled')}
            </Button>
            <Button
              variant={effectiveDraft.notificationsPush ? 'primary' : 'secondary'}
              onClick={() =>
                updateDraft('notificationsPush', !effectiveDraft.notificationsPush)
              }
            >
              {t('settings.fields.pushNotifications')} ·{' '}
              {effectiveDraft.notificationsPush
                ? t('settings.notificationsEnabled')
                : t('settings.notificationsDisabled')}
            </Button>
            <FormField label={t('settings.fields.exportPreference')}>
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={effectiveDraft.exportPreference}
                  onChange={(event) => updateDraft('exportPreference', event.target.value)}
                >
                  <option value="manual">{t('settings.options.export.manual')}</option>
                  <option value="autoPdf">{t('settings.options.export.autoPdf')}</option>
                </Select>
              )}
            </FormField>
            <FormField label={t('settings.fields.retention')}>
              {(fieldProps) => (
                <Select
                  {...fieldProps}
                  value={effectiveDraft.dataRetention}
                  onChange={(event) => updateDraft('dataRetention', event.target.value)}
                >
                  <option value="30">{t('settings.options.retention.days30')}</option>
                  <option value="90">{t('settings.options.retention.days90')}</option>
                  <option value="365">{t('settings.options.retention.days365')}</option>
                </Select>
              )}
            </FormField>
          </div>
        </SectionCard>

        <SectionCard
          title={t('settings.groups.account')}
          description={t('settings.groupDescriptions.account')}
        >
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label={t('settings.fields.name')}>
                {(fieldProps) => <Input {...fieldProps} value={profile.name} readOnly />}
              </FormField>
              <FormField label={t('settings.fields.email')}>
                {(fieldProps) => <Input {...fieldProps} value={profile.email} readOnly />}
              </FormField>
              <FormField label={t('settings.fields.timezone')}>
                {(fieldProps) => <Input {...fieldProps} value={profile.timezone} readOnly />}
              </FormField>
              <FormField label={t('settings.fields.bio')}>
                {(fieldProps) => <Input {...fieldProps} value={profile.bio} readOnly />}
              </FormField>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-border-subtle bg-app-bg-elevated p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                    {walletAddress ? <Wallet className="size-5" /> : <ShieldCheck className="size-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      {walletAddress
                        ? t('settings.connectedWallet')
                        : t('settings.noWalletConnected')}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {walletAddress
                        ? shortAddress(walletAddress)
                        : t('settings.groupDescriptions.account')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={t('settings.groups.danger')}
          description={t('settings.groupDescriptions.danger')}
          state="danger"
        >
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-[24px] border border-border-subtle bg-app-bg-elevated p-4">
              <p className="text-sm font-semibold text-text-primary">{t('actions.disconnectWallet')}</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {t('settings.disconnectDescription')}
              </p>
              <Button
                className="mt-4"
                variant="secondary"
                onClick={() => {
                  clearWalletState()
                  toast.success(t('settings.disconnectSuccess'))
                }}
                disabled={!walletAddress}
              >
                {t('actions.disconnectWallet')}
              </Button>
            </div>
            <div className="rounded-[24px] border border-border-subtle bg-app-bg-elevated p-4">
              <p className="text-sm font-semibold text-text-primary">{t('settings.deleteData')}</p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {t('settings.deleteDescription')}
              </p>
              <Button
                className="mt-4"
                variant="danger"
                disabled={deleteMutation.isPending}
                onClick={() => void deleteMutation.mutateAsync()}
              >
                {deleteMutation.isPending ? t('settings.deletingData') : t('settings.deleteData')}
              </Button>
            </div>
          </div>
        </SectionCard>

        <StickyFooter>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-primary">
                {isDirty ? t('settings.dirty') : t('settings.clean')}
              </p>
              <p className="text-sm text-text-secondary">
                Review changes here before they sync into the shared workspace header and defaults.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => setDraft(null)}
                disabled={!isDirty}
              >
                {t('settings.resetAction')}
              </Button>
              <Button onClick={saveDraft} disabled={updateMutation.isPending || !isDirty}>
                {t('settings.saveAction')}
              </Button>
            </div>
          </div>
        </StickyFooter>
      </PageSection>
    </PageContainer>
  )
}
