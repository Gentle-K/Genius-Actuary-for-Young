import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  EmptyState,
  FormField,
  RiskPreflightModal,
  SectionCard,
  StatusBadge,
  StatusSummaryCard,
  StickyFooter,
} from '@/components/product/workspace-ui'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { StocksWorkbenchShell } from '@/features/stocks/workbench-shell'
import { useStocksCopy } from '@/features/stocks/copy'
import { getStocksErrorMessage, useStocksMode } from '@/features/stocks/lib'
import {
  buildStocksSettingsDraft,
  normalizeTickerList,
  requiresLiveSettingsConfirmation,
  stocksSettingsDraftEqual,
  toStocksSettingsPayload,
  validateStocksSettingsDraft,
  type StocksSettingsDraft,
} from '@/features/stocks/settings-utils'

function providerSeverity(status: 'connected' | 'simulated' | 'unavailable') {
  if (status === 'connected') return 'success' as const
  if (status === 'simulated') return 'info' as const
  return 'danger' as const
}

function validationMessage(
  field: keyof StocksSettingsDraft,
  error: ReturnType<typeof validateStocksSettingsDraft>[keyof StocksSettingsDraft] | undefined,
) {
  if (!error) {
    return undefined
  }

  if (field === 'whitelist') {
    return 'Add at least one uppercase whitelist ticker.'
  }
  if (field === 'tradingWindow') {
    return 'Use a valid ET window such as 09:35-15:45.'
  }
  if (field === 'maxPositions') {
    return 'Use an integer from 1 to 4.'
  }
  if (field === 'maxEntries') {
    return 'Use a positive integer.'
  }

  return 'Use a numeric value inside the current hard safety ceiling.'
}

export function StocksSettingsPage() {
  const adapter = useApiAdapter()
  const copy = useStocksCopy()
  const queryClient = useQueryClient()
  const bootstrapQuery = useQuery({
    queryKey: ['stocks', 'bootstrap'],
    queryFn: adapter.stocks.getBootstrap,
  })
  const { mode, setMode } = useStocksMode(bootstrapQuery.data?.settings.defaultMode ?? 'paper')
  const [draft, setDraft] = useState<StocksSettingsDraft | null>(null)
  const [confirmLiveSaveOpen, setConfirmLiveSaveOpen] = useState(false)

  const baseDraft = useMemo(
    () => buildStocksSettingsDraft(bootstrapQuery.data?.settings),
    [bootstrapQuery.data?.settings],
  )
  const effectiveDraft = draft ?? baseDraft
  const validationErrors = validateStocksSettingsDraft(effectiveDraft)
  const hasValidationErrors = Object.keys(validationErrors).length > 0
  const isDirty = !stocksSettingsDraftEqual(baseDraft, effectiveDraft)
  const normalizedWhitelist = normalizeTickerList(effectiveDraft.whitelist).join(', ')

  const updateDraft = <K extends keyof StocksSettingsDraft>(
    key: K,
    value: StocksSettingsDraft[K],
  ) => {
    setDraft((current) => ({
      ...(current ?? baseDraft),
      [key]: value,
    }))
  }

  const resetDraft = () => {
    setDraft(null)
    setConfirmLiveSaveOpen(false)
    toast.message(copy.messages.settingsReset)
  }

  const saveMutation = useMutation({
    mutationFn: () => adapter.stocks.updateSettings(toStocksSettingsPayload(effectiveDraft)),
    onSuccess: async () => {
      toast.success(copy.messages.settingsSaved)
      setDraft(null)
      setConfirmLiveSaveOpen(false)
      await queryClient.invalidateQueries({ queryKey: ['stocks'] })
    },
    onError: (error) => {
      toast.error(getStocksErrorMessage(error, copy.actions.retry))
    },
  })

  if (bootstrapQuery.isError) {
    return (
      <SectionCard
        title={copy.pages.settings.title}
        description={getStocksErrorMessage(bootstrapQuery.error, copy.actions.retry)}
        action={
          <Button variant="secondary" onClick={() => void bootstrapQuery.refetch()}>
            {copy.actions.retry}
          </Button>
        }
        state="danger"
      >
        <p className="text-sm text-text-secondary">{copy.actions.retry}</p>
      </SectionCard>
    )
  }

  const promotionGate = bootstrapQuery.data?.promotionGate
  const liveReviewRequired = requiresLiveSettingsConfirmation(baseDraft, effectiveDraft)

  return (
    <>
      <StocksWorkbenchShell
        title={copy.pages.settings.title}
        description={copy.pages.settings.description}
        mode={mode}
        onModeChange={setMode}
        bootstrap={bootstrapQuery.data}
      >
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
          <div className="space-y-5">
            <SectionCard
              title={copy.sections.guardrails}
              description="Edit whitelist, limits, and execution safeguards without applying changes until you save."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  label={copy.fields.defaultMode}
                  helperText="Paper remains the safe default. Live stays blocked until promotion requirements pass."
                >
                  {(fieldProps) => (
                    <Select
                      {...fieldProps}
                      value={effectiveDraft.defaultMode}
                      onChange={(event) =>
                        updateDraft('defaultMode', event.target.value as 'paper' | 'live')
                      }
                    >
                      <option value="paper">{copy.shell.mode.paper}</option>
                      <option value="live">{copy.shell.mode.live}</option>
                    </Select>
                  )}
                </FormField>
                <FormField label={copy.fields.notifications}>
                  {(fieldProps) => (
                    <Select
                      {...fieldProps}
                      value={effectiveDraft.notificationsEnabled}
                      onChange={(event) =>
                        updateDraft('notificationsEnabled', event.target.value)
                      }
                    >
                      <option value="true">{copy.values.enabled}</option>
                      <option value="false">{copy.values.disabled}</option>
                    </Select>
                  )}
                </FormField>
                <FormField
                  label={copy.fields.singleCap}
                  helperText="Hard ceiling: 10%."
                  errorText={validationMessage('singleCap', validationErrors.singleCap)}
                  required
                >
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      value={effectiveDraft.singleCap}
                      onChange={(event) => updateDraft('singleCap', event.target.value)}
                    />
                  )}
                </FormField>
                <FormField
                  label={copy.fields.grossCap}
                  helperText="Hard ceiling: 35%."
                  errorText={validationMessage('grossCap', validationErrors.grossCap)}
                  required
                >
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      value={effectiveDraft.grossCap}
                      onChange={(event) => updateDraft('grossCap', event.target.value)}
                    />
                  )}
                </FormField>
                <FormField
                  label={copy.fields.dailyLoss}
                  helperText="Hard ceiling: 3%."
                  errorText={validationMessage('dailyLoss', validationErrors.dailyLoss)}
                  required
                >
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      value={effectiveDraft.dailyLoss}
                      onChange={(event) => updateDraft('dailyLoss', event.target.value)}
                    />
                  )}
                </FormField>
                <FormField
                  label={copy.fields.maxPositions}
                  helperText="Use 1 to 4 concurrent positions."
                  errorText={validationMessage('maxPositions', validationErrors.maxPositions)}
                  required
                >
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      value={effectiveDraft.maxPositions}
                      onChange={(event) => updateDraft('maxPositions', event.target.value)}
                    />
                  )}
                </FormField>
                <FormField
                  label={copy.fields.maxEntries}
                  helperText="Keep the per-symbol entry budget explicit."
                  errorText={validationMessage('maxEntries', validationErrors.maxEntries)}
                  required
                >
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      value={effectiveDraft.maxEntries}
                      onChange={(event) => updateDraft('maxEntries', event.target.value)}
                    />
                  )}
                </FormField>
                <FormField
                  label={copy.fields.tradingWindow}
                  helperText="Use ET and keep the end after the start."
                  errorText={validationMessage('tradingWindow', validationErrors.tradingWindow)}
                  required
                >
                  {(fieldProps) => (
                    <Input
                      {...fieldProps}
                      value={effectiveDraft.tradingWindow}
                      onChange={(event) => updateDraft('tradingWindow', event.target.value)}
                    />
                  )}
                </FormField>
                <FormField label={copy.fields.extendedHours}>
                  {(fieldProps) => (
                    <Select
                      {...fieldProps}
                      value={effectiveDraft.extendedHours}
                      onChange={(event) => updateDraft('extendedHours', event.target.value)}
                    >
                      <option value="false">{copy.values.no}</option>
                      <option value="true">{copy.values.yes}</option>
                    </Select>
                  )}
                </FormField>
                <FormField label={copy.fields.marketableLimit}>
                  {(fieldProps) => (
                    <Select
                      {...fieldProps}
                      value={effectiveDraft.marketableLimit}
                      onChange={(event) => updateDraft('marketableLimit', event.target.value)}
                    >
                      <option value="true">{copy.values.yes}</option>
                      <option value="false">{copy.values.no}</option>
                    </Select>
                  )}
                </FormField>
              </div>
            </SectionCard>

            <SectionCard
              title={copy.fields.whitelist}
              description="Normalize tickers to uppercase, remove duplicates, and keep the whitelist explicit."
            >
              <FormField
                label={copy.fields.whitelist}
                helperText={copy.messages.whitelistHint}
                errorText={validationMessage('whitelist', validationErrors.whitelist)}
                required
              >
                {(fieldProps) => (
                  <Textarea
                    {...fieldProps}
                    value={effectiveDraft.whitelist}
                    onChange={(event) => updateDraft('whitelist', event.target.value)}
                  />
                )}
              </FormField>
              <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                  Normalized whitelist
                </p>
                <p className="mt-2 text-sm text-text-secondary">
                  {normalizedWhitelist || 'No whitelist tickers ready yet.'}
                </p>
              </div>
            </SectionCard>
          </div>

          <div className="space-y-5">
            <StatusSummaryCard
              title={copy.sections.promotionGate}
              descriptor={{
                label: promotionGate?.eligibleForLiveArm ? 'Live Ready' : 'Live Blocked',
                severity: promotionGate?.eligibleForLiveArm ? 'success' : 'danger',
                reason:
                  promotionGate?.blockers[0] ??
                  'Live mode can only arm after the promotion gate passes.',
                nextAction:
                  promotionGate?.blockers[0] ??
                  'Review provider readiness and promotion requirements before arming live mode.',
                lastUpdated: promotionGate?.evaluatedAt,
                requiredChecks: ['Paper trading days', 'Fill success rate', 'Max drawdown', 'Order reconciliation'],
                blockingChecks: promotionGate?.blockers ?? [],
              }}
            />

            <SectionCard
              title={copy.sections.providerReadiness}
              description="Provider status is shown directly instead of being inferred from missing data."
            >
              {(bootstrapQuery.data?.providerStatuses ?? []).length ? (
                <div className="space-y-3">
                  {(bootstrapQuery.data?.providerStatuses ?? []).map((provider) => (
                    <div
                      key={`${provider.provider}-${provider.mode ?? 'shared'}`}
                      className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-text-primary">
                          {provider.provider}
                          {provider.mode ? ` · ${provider.mode}` : ''}
                        </p>
                        <StatusBadge
                          label={provider.status}
                          severity={providerSeverity(provider.status)}
                        />
                      </div>
                      <p className="mt-2 text-sm leading-6 text-text-secondary">{provider.detail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={copy.sections.providerReadiness}
                  description="Provider readiness has not loaded yet."
                />
              )}
            </SectionCard>

            <SectionCard
              title={copy.sections.promotionGate}
              description="Missing requirements stay visible even when the rest of the settings are valid."
            >
              {(promotionGate?.blockers ?? []).length ? (
                <div className="space-y-2">
                  {(promotionGate?.blockers ?? []).map((blocker) => (
                    <div key={blocker} className="rounded-[18px] bg-app-bg-elevated px-4 py-3 text-sm text-text-secondary">
                      {blocker}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-secondary">{copy.messages.paperOnly}</p>
              )}
            </SectionCard>
          </div>
        </section>

        <StickyFooter>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-primary">
                {isDirty ? copy.messages.unsavedChanges : 'No unsaved changes.'}
              </p>
              {hasValidationErrors ? (
                <p className="text-sm text-warning">{copy.messages.validationErrors}</p>
              ) : liveReviewRequired ? (
                <p className="text-sm text-warning">{copy.messages.liveSettingsReview}</p>
              ) : (
                <p className="text-sm text-text-secondary">
                  Save only after the live ceilings and provider readiness match your intended mode.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={resetDraft} disabled={!isDirty && !draft}>
                {copy.actions.reset}
              </Button>
              <Button
                onClick={() => {
                  if (hasValidationErrors) {
                    return
                  }
                  if (liveReviewRequired) {
                    setConfirmLiveSaveOpen(true)
                    return
                  }
                  saveMutation.mutate()
                }}
                disabled={saveMutation.isPending || !isDirty || hasValidationErrors}
              >
                {copy.actions.save}
              </Button>
            </div>
          </div>
        </StickyFooter>
      </StocksWorkbenchShell>

      <RiskPreflightModal
        open={confirmLiveSaveOpen}
        onClose={() => setConfirmLiveSaveOpen(false)}
        title={copy.actions.confirmLiveSettings}
        description={copy.messages.liveSettingsReview}
        summary={[
          { label: copy.fields.defaultMode, value: effectiveDraft.defaultMode },
          { label: copy.fields.singleCap, value: `${effectiveDraft.singleCap}%` },
          { label: copy.fields.grossCap, value: `${effectiveDraft.grossCap}%` },
          { label: copy.fields.dailyLoss, value: `${effectiveDraft.dailyLoss}%` },
          { label: copy.fields.tradingWindow, value: effectiveDraft.tradingWindow },
        ]}
        blockers={promotionGate?.blockers ?? []}
        confirmLabel={copy.actions.confirmLiveSettings}
        onConfirm={() => saveMutation.mutate()}
        confirmDisabled={saveMutation.isPending}
      />
    </>
  )
}
