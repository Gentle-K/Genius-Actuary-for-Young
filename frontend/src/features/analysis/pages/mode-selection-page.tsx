import { useMutation, useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Building2, Sparkles, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { PageContainer, PageHeader, PageSection } from '@/components/layout/page-header'
import {
  FormField,
  MetricCard,
  SectionCard,
  StatusBadge,
  StatusSummaryCard,
  Stepper,
  StickyFooter,
} from '@/components/product/workspace-ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Select, Textarea } from '@/components/ui/field'
import { getCreateSessionActionState } from '@/domain/status'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { toIntlLocale } from '@/lib/i18n/locale'
import { useAppStore } from '@/lib/store/app-store'
import { shortAddress } from '@/lib/web3/hashkey'
import { useHashKeyWallet } from '@/lib/web3/use-hashkey-wallet'
import {
  getLocalStorageItem,
  removeLocalStorageItem,
  setLocalStorageItem,
} from '@/lib/utils/safe-storage'
import { cn } from '@/lib/utils/cn'
import type { AnalysisMode, CreateSessionPayload, RwaIntakeContext } from '@/types'

const DRAFT_KEY = 'ga-new-analysis-draft-v2'
const LEGACY_DRAFT_KEY = 'ga-new-analysis-draft'

type ModeSelectionDraft = {
  mode: AnalysisMode
  problem: string
  safeAddress: string
  budgetRange: string
  timeHorizon: string
  riskPreference: 'conservative' | 'balanced' | 'aggressive'
  settlementCurrency: string
  targetChain: 'hashkey' | 'evm' | 'general'
  accessConstraints: string
  mustHaveGoals: string
  mustAvoidOutcomes: string
}

const DEFAULT_DRAFT: ModeSelectionDraft = {
  mode: 'single-asset-allocation',
  problem: '',
  safeAddress: '',
  budgetRange: '',
  timeHorizon: '',
  riskPreference: 'balanced',
  settlementCurrency: 'USD',
  targetChain: 'hashkey',
  accessConstraints: '',
  mustHaveGoals: '',
  mustAvoidOutcomes: '',
}

const steps = [
  { value: 'identity', label: 'Identity', description: 'Wallet, Safe, and readiness snapshot' },
  { value: 'decision', label: 'Decision', description: 'Mode and decision brief' },
  { value: 'constraints', label: 'Constraints', description: 'Budget, horizon, and must-haves' },
  { value: 'review', label: 'Review', description: 'Final check before session creation' },
] as const

function parseBudgetToAmount(value: string) {
  const match = value.match(/(\d+(?:\.\d+)?)/)
  if (!match) {
    return 10000
  }
  const base = Number(match[1])
  return value.toLowerCase().includes('k') ? base * 1000 : base
}

function loadStoredDraft(): ModeSelectionDraft {
  const raw = getLocalStorageItem(DRAFT_KEY) ?? getLocalStorageItem(LEGACY_DRAFT_KEY)
  if (!raw) {
    return { ...DEFAULT_DRAFT }
  }

  try {
    return {
      ...DEFAULT_DRAFT,
      ...(JSON.parse(raw) as Partial<ModeSelectionDraft>),
    }
  } catch {
    removeLocalStorageItem(DRAFT_KEY)
    removeLocalStorageItem(LEGACY_DRAFT_KEY)
    return { ...DEFAULT_DRAFT }
  }
}

function modeCardClass(active: boolean) {
  return cn(
    'interactive-lift rounded-[24px] border p-5 text-left transition',
    active
      ? 'border-primary bg-primary-soft shadow-[0_12px_32px_rgba(49,95,221,0.18)]'
      : 'border-border-subtle bg-panel hover:border-border-strong hover:bg-panel-strong',
  )
}

export function ModeSelectionPage() {
  const { t } = useTranslation()
  const adapter = useApiAdapter()
  const navigate = useNavigate()
  const locale = useAppStore((state) => state.locale)
  const [searchParams, setSearchParams] = useSearchParams()
  const step =
    steps.find((item) => item.value === searchParams.get('step'))?.value ?? 'identity'
  const selectedAssetId = searchParams.get('asset') ?? ''

  const bootstrapQuery = useQuery({
    queryKey: ['analysis', 'bootstrap', 'workspace-intake', locale],
    queryFn: () => adapter.rwa.getBootstrap(),
  })
  const wallet = useHashKeyWallet(bootstrapQuery.data?.chainConfig)
  const [draft, setDraft] = useState<ModeSelectionDraft>(() => loadStoredDraft())
  const [lastSavedAt, setLastSavedAt] = useState('')
  const {
    mode,
    problem,
    safeAddress,
    budgetRange,
    timeHorizon,
    riskPreference,
    settlementCurrency,
    targetChain,
    accessConstraints,
    mustHaveGoals,
    mustAvoidOutcomes,
  } = draft

  const updateDraft = (patch: Partial<ModeSelectionDraft>) => {
    const savedAt = new Date().toISOString()
    setDraft((current) => {
      const next = { ...current, ...patch }
      setLocalStorageItem(DRAFT_KEY, JSON.stringify(next))
      return next
    })
    setLastSavedAt(savedAt)
  }

  const saveDraft = () => {
    setLocalStorageItem(DRAFT_KEY, JSON.stringify(draft))
    setLastSavedAt(new Date().toISOString())
  }

  const effectiveAddress = wallet.walletAddress || safeAddress.trim()
  const walletSummaryQuery = useQuery({
    queryKey: ['analysis', 'wallet-summary', effectiveAddress, locale],
    queryFn: () => adapter.rwa.getWalletSummary(effectiveAddress),
    enabled: Boolean(effectiveAddress),
  })
  const walletPositionsQuery = useQuery({
    queryKey: ['analysis', 'wallet-positions', effectiveAddress, locale],
    queryFn: () => adapter.rwa.getWalletPositions(effectiveAddress),
    enabled: Boolean(effectiveAddress),
  })
  const eligibleCatalogQuery = useQuery({
    queryKey: ['analysis', 'eligible-catalog', effectiveAddress, locale],
    queryFn: () =>
      adapter.rwa.getEligibleCatalog({
        address: effectiveAddress,
        network:
          walletSummaryQuery.data?.network === 'mainnet' ? 'mainnet' : 'testnet',
      }),
    enabled: Boolean(effectiveAddress),
  })

  const createMutation = useMutation({
    mutationFn: (payload: CreateSessionPayload) => adapter.analysis.create(payload),
    onSuccess: async (session) => {
      removeLocalStorageItem(DRAFT_KEY)
      removeLocalStorageItem(LEGACY_DRAFT_KEY)
      await navigate(`/sessions/${session.id}/clarify`)
    },
  })

  const draftContext = useMemo<RwaIntakeContext>(
    () => ({
      budgetRange,
      timeHorizonLabel: timeHorizon,
      riskPreferenceLabel: riskPreference,
      mustHaveGoals: mustHaveGoals
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean),
      mustAvoidOutcomes: mustAvoidOutcomes
        .split(';')
        .map((item) => item.trim())
        .filter(Boolean),
      draftPrompt: problem,
      investmentAmount: parseBudgetToAmount(budgetRange || '$10k'),
      baseCurrency: settlementCurrency,
      preferredAssetIds: selectedAssetId ? [selectedAssetId] : [],
      holdingPeriodDays:
        timeHorizon.includes('1-3')
          ? 90
          : timeHorizon.includes('3-6')
            ? 180
            : timeHorizon.includes('12')
              ? 365
              : 270,
      riskTolerance: riskPreference,
      liquidityNeed: 't_plus_3',
      minimumKycLevel: accessConstraints.toLowerCase().includes('kyc') ? 1 : 0,
      walletAddress: wallet.walletAddress || '',
      safeAddress: safeAddress.trim(),
      walletNetwork:
        walletSummaryQuery.data?.network === 'mainnet' ? 'mainnet' : 'testnet',
      kycLevel: walletSummaryQuery.data?.kyc.level,
      kycStatus: walletSummaryQuery.data?.kyc.status,
      sourceChain: walletSummaryQuery.data?.network ?? 'hashkey',
      sourceAsset: walletSummaryQuery.data?.balances[0]?.symbol ?? settlementCurrency,
      ticketSize: parseBudgetToAmount(budgetRange || '$10k'),
      wantsOnchainAttestation: false,
      additionalConstraints: `${mustHaveGoals}\n${mustAvoidOutcomes}\nTarget chain / asset universe: ${targetChain}\nAccess constraints: ${accessConstraints}`,
    }),
    [
      accessConstraints,
      budgetRange,
      mustAvoidOutcomes,
      mustHaveGoals,
      problem,
      riskPreference,
      safeAddress,
      selectedAssetId,
      settlementCurrency,
      targetChain,
      timeHorizon,
      wallet.walletAddress,
      walletSummaryQuery.data?.balances,
      walletSummaryQuery.data?.kyc.level,
      walletSummaryQuery.data?.kyc.status,
      walletSummaryQuery.data?.network,
    ],
  )

  const autosaveLabel = lastSavedAt
    ? `Draft saved ${new Intl.DateTimeFormat(toIntlLocale(locale), {
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(lastSavedAt))}`
    : 'Draft saved locally'
  const createActionState = getCreateSessionActionState({
    problem,
    timeHorizon,
    budgetRange,
  })

  const setStep = (nextStep: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('step', nextStep)
      return next
    })
  }

  const currentStepIndex = steps.findIndex((item) => item.value === step)
  const nextStep = steps[currentStepIndex + 1]?.value
  const previousStep = steps[currentStepIndex - 1]?.value

  const startAnalysis = () =>
    void createMutation.mutateAsync({
      mode,
      locale,
      problemStatement: problem.trim(),
      intakeContext: draftContext,
    })

  const reviewDescriptor = {
    label: createActionState.disabled ? 'Draft' : 'Ready to create',
    severity: createActionState.disabled ? ('warning' as const) : ('success' as const),
    reason: createActionState.reason ?? 'The required decision inputs are in place.',
    nextAction:
      createActionState.reason ??
      'Create the session, then move into clarification and report generation.',
    requiredChecks: ['Decision brief', 'Budget range', 'Time horizon'],
    blockingChecks: createActionState.reason ? [createActionState.reason] : [],
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow={t('analysis.newAnalysis.eyebrow')}
        title={t('analysis.newAnalysis.title')}
        description={t('analysis.newAnalysis.description')}
        statusBadges={
          <>
            <StatusBadge
              label={wallet.walletAddress ? 'Wallet connected' : safeAddress ? 'Safe linked' : 'Identity pending'}
              severity={wallet.walletAddress || safeAddress ? 'success' : 'info'}
            />
            {selectedAssetId ? (
              <StatusBadge label={`Preselected asset · ${selectedAssetId}`} severity="info" />
            ) : null}
          </>
        }
      />

      <PageSection className="space-y-6">
        <Stepper steps={steps.map((item) => ({ ...item }))} current={step} onStepChange={setStep} />

        {step === 'identity' ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
            <SectionCard
              title="Step 1 · Identity"
              description="Use a connected wallet or Safe address to load KYC, balances, positions, and eligible assets."
            >
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                <Card className="space-y-4 rounded-[24px] border border-border-subtle bg-app-bg-elevated p-4">
                  <div className="flex items-start gap-3">
                    <div className="inline-flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <Wallet className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-text-primary">{t('analysis.newAnalysis.walletCardTitle')}</p>
                      <p className="mt-1 text-sm leading-6 text-text-secondary">
                        {t('analysis.newAnalysis.walletCardDescription')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 max-sm:flex-col">
                    <Button
                      className="max-sm:w-full"
                      onClick={() => void wallet.connectWallet()}
                      disabled={wallet.isWalletBusy || bootstrapQuery.isLoading}
                    >
                      {wallet.isConnected ? shortAddress(wallet.walletAddress) : t('actions.connectWallet')}
                    </Button>
                    {wallet.walletAddress ? <Badge tone="success">{shortAddress(wallet.walletAddress)}</Badge> : null}
                  </div>
                  <FormField
                    label="Safe / multisig"
                    helperText="Paste a Safe address when the decision must be reviewed from a multisig context."
                  >
                    {(fieldProps) => (
                      <div className="flex gap-3 max-sm:flex-col">
                        <Input
                          {...fieldProps}
                          value={safeAddress}
                          placeholder={t('analysis.newAnalysis.safePlaceholder')}
                          onChange={(event) => updateDraft({ safeAddress: event.target.value })}
                        />
                        <Button
                          className="max-sm:w-full"
                          variant="secondary"
                          onClick={() => saveDraft()}
                          disabled={!safeAddress.trim()}
                        >
                          <Building2 className="size-4" />
                          {t('actions.useSafe')}
                        </Button>
                      </div>
                    )}
                  </FormField>
                </Card>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <MetricCard
                    label={t('analysis.newAnalysis.kycSnapshot')}
                    value={
                      walletSummaryQuery.data
                        ? `L${walletSummaryQuery.data.kyc.level} / ${walletSummaryQuery.data.kyc.status}`
                        : 'Wallet not connected'
                    }
                    helperText={effectiveAddress ? shortAddress(effectiveAddress) : 'Connect a wallet or paste a Safe address.'}
                  />
                  <MetricCard
                    label={t('analysis.newAnalysis.detectedPositions')}
                    value={String(walletPositionsQuery.data?.length ?? 0)}
                    helperText="Recognized positions loaded from the current operator source."
                  />
                  <MetricCard
                    label={t('analysis.newAnalysis.eligibleCatalog')}
                    value={`${eligibleCatalogQuery.data?.eligible.length ?? 0} / ${eligibleCatalogQuery.data?.conditional.length ?? 0} / ${eligibleCatalogQuery.data?.blocked.length ?? 0}`}
                    helperText="Eligible / Conditional / Blocked"
                  />
                </div>
              </div>
            </SectionCard>

            <StatusSummaryCard title="Operator context" descriptor={reviewDescriptor} />
          </div>
        ) : null}

        {step === 'decision' ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
            <SectionCard
              title="Step 2 · Decision"
              description="Choose the decision frame, then write the decision brief in operator language."
            >
              <div className="space-y-5">
                <div className="grid gap-4 lg:grid-cols-2">
                  <button
                    type="button"
                    className={modeCardClass(mode === 'single-asset-allocation')}
                    onClick={() => updateDraft({ mode: 'single-asset-allocation' })}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-base font-semibold text-text-primary">
                          {t('analysis.newAnalysis.singleTitle')}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">
                          {t('analysis.newAnalysis.singleDescription')}
                        </p>
                      </div>
                      <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <Sparkles className="size-4" />
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={modeCardClass(mode === 'strategy-compare')}
                    onClick={() => updateDraft({ mode: 'strategy-compare' })}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-base font-semibold text-text-primary">
                          {t('analysis.newAnalysis.compareTitle')}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-text-secondary">
                          {t('analysis.newAnalysis.compareDescription')}
                        </p>
                      </div>
                      <span className="inline-flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <ArrowRight className="size-4" />
                      </span>
                    </div>
                  </button>
                </div>

                <FormField
                  label={t('analysis.newAnalysis.briefLabel')}
                  helperText="Explain the mandate, the downside to avoid, and what a successful result looks like."
                  errorText={!problem.trim() && currentStepIndex > 1 ? 'Add a decision brief before creating the session.' : undefined}
                  required
                >
                  {(fieldProps) => (
                    <Textarea
                      {...fieldProps}
                      value={problem}
                      placeholder={t('analysis.newAnalysis.briefPlaceholder')}
                      onChange={(event) => updateDraft({ problem: event.target.value })}
                    />
                  )}
                </FormField>
              </div>
            </SectionCard>

            <SectionCard
              title="Decision examples"
              description="Examples are secondary. Keep the real brief above as the main task."
            >
              <div className="space-y-3">
                {(t(
                  mode === 'single-asset-allocation'
                    ? 'analysis.newAnalysis.examples.single'
                    : 'analysis.newAnalysis.examples.compare',
                  { returnObjects: true },
                ) as string[]).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="w-full rounded-[18px] border border-border-subtle bg-app-bg-elevated px-4 py-4 text-left text-sm leading-6 text-text-secondary hover:border-border-strong hover:text-text-primary"
                    onClick={() => updateDraft({ problem: prompt })}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </SectionCard>
          </div>
        ) : null}

        {step === 'constraints' ? (
          <SectionCard
            title="Step 3 · Constraints"
            description="Capture the sizing, time horizon, risk posture, and constraints that should govern the decision."
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <FormField label={t('analysis.newAnalysis.fields.budget')} required>
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={budgetRange}
                    onChange={(event) => updateDraft({ budgetRange: event.target.value })}
                  />
                )}
              </FormField>
              <FormField label={t('analysis.newAnalysis.fields.horizon')} required>
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={timeHorizon}
                    onChange={(event) => updateDraft({ timeHorizon: event.target.value })}
                  />
                )}
              </FormField>
              <FormField label={t('analysis.newAnalysis.fields.risk')}>
                {(fieldProps) => (
                  <Select
                    {...fieldProps}
                    value={riskPreference}
                    onChange={(event) =>
                      updateDraft({
                        riskPreference: event.target.value as ModeSelectionDraft['riskPreference'],
                      })
                    }
                  >
                    <option value="conservative">{t('analysis.newAnalysis.options.risk.conservative')}</option>
                    <option value="balanced">{t('analysis.newAnalysis.options.risk.balanced')}</option>
                    <option value="aggressive">{t('analysis.newAnalysis.options.risk.aggressive')}</option>
                  </Select>
                )}
              </FormField>
              <FormField label={t('analysis.newAnalysis.fields.settlement')}>
                {(fieldProps) => (
                  <Select
                    {...fieldProps}
                    value={settlementCurrency}
                    onChange={(event) => updateDraft({ settlementCurrency: event.target.value })}
                  >
                    <option value="USD">USD</option>
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                  </Select>
                )}
              </FormField>
              <FormField label={t('analysis.newAnalysis.fields.targetChain')}>
                {(fieldProps) => (
                  <Select
                    {...fieldProps}
                    value={targetChain}
                    onChange={(event) =>
                      updateDraft({
                        targetChain: event.target.value as ModeSelectionDraft['targetChain'],
                      })
                    }
                  >
                    <option value="hashkey">{t('analysis.newAnalysis.options.network.hashkey')}</option>
                    <option value="evm">{t('analysis.newAnalysis.options.network.evm')}</option>
                    <option value="general">{t('analysis.newAnalysis.options.network.general')}</option>
                  </Select>
                )}
              </FormField>
              <FormField label={t('analysis.newAnalysis.fields.access')}>
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={accessConstraints}
                    onChange={(event) => updateDraft({ accessConstraints: event.target.value })}
                  />
                )}
              </FormField>
              <FormField label={t('analysis.newAnalysis.fields.mustHave')}>
                {(fieldProps) => (
                  <Textarea
                    {...fieldProps}
                    value={mustHaveGoals}
                    onChange={(event) => updateDraft({ mustHaveGoals: event.target.value })}
                  />
                )}
              </FormField>
              <FormField label={t('analysis.newAnalysis.fields.mustAvoid')}>
                {(fieldProps) => (
                  <Textarea
                    {...fieldProps}
                    value={mustAvoidOutcomes}
                    onChange={(event) => updateDraft({ mustAvoidOutcomes: event.target.value })}
                  />
                )}
              </FormField>
            </div>
          </SectionCard>
        ) : null}

        {step === 'review' ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
            <SectionCard
              title="Step 4 · Review"
              description="Confirm the operator source, decision frame, and constraints before creating the session."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <MetricCard
                  label="Identity"
                  value={wallet.walletAddress ? shortAddress(wallet.walletAddress) : safeAddress ? shortAddress(safeAddress) : 'Not connected'}
                  helperText={wallet.walletAddress ? 'Connected browser wallet' : safeAddress ? 'Safe / multisig address' : 'No operator source linked yet'}
                />
                <MetricCard
                  label="Mode"
                  value={mode === 'single-asset-allocation' ? t('analysis.newAnalysis.singleTitle') : t('analysis.newAnalysis.compareTitle')}
                  helperText={selectedAssetId ? `Preselected asset: ${selectedAssetId}` : 'No fixed target asset preselected'}
                />
                <MetricCard
                  label="Budget and horizon"
                  value={`${budgetRange || '--'} · ${timeHorizon || '--'}`}
                  helperText={`${riskPreference} risk · ${settlementCurrency}`}
                />
                <MetricCard
                  label="Eligible catalog snapshot"
                  value={`${eligibleCatalogQuery.data?.eligible.length ?? 0} / ${eligibleCatalogQuery.data?.conditional.length ?? 0} / ${eligibleCatalogQuery.data?.blocked.length ?? 0}`}
                  helperText="Eligible / Conditional / Blocked"
                />
              </div>
              <Card className="space-y-3 rounded-[24px] border border-border-subtle bg-app-bg-elevated p-4">
                <p className="text-sm font-semibold text-text-primary">{t('analysis.newAnalysis.briefLabel')}</p>
                <p className="text-sm leading-6 text-text-secondary">{problem || 'No decision brief entered yet.'}</p>
              </Card>
            </SectionCard>

            <StatusSummaryCard title="Creation readiness" descriptor={reviewDescriptor} />
          </div>
        ) : null}

        <StickyFooter>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-text-primary">{autosaveLabel}</p>
              {createActionState.reason ? (
                <p className="text-sm text-warning">{createActionState.reason}</p>
              ) : (
                <p className="text-sm text-text-secondary">
                  Create the session only after the decision brief, budget, and time horizon are set.
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {previousStep ? (
                <Button variant="secondary" onClick={() => setStep(previousStep)}>
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
              ) : null}
              <Button variant="secondary" onClick={saveDraft}>
                Save draft
              </Button>
              {nextStep ? (
                <Button onClick={() => setStep(nextStep)}>
                  Continue
                  <ArrowRight className="size-4" />
                </Button>
              ) : null}
              <Button
                onClick={startAnalysis}
                disabled={step !== 'review' || createMutation.isPending || createActionState.disabled}
                title={
                  step !== 'review'
                    ? 'Review the draft before creating the session.'
                    : createActionState.reason
                }
              >
                {createMutation.isPending
                  ? t('analysis.newAnalysis.creatingSession')
                  : t('analysis.newAnalysis.createSession')}
              </Button>
            </div>
          </div>
        </StickyFooter>
      </PageSection>
    </PageContainer>
  )
}
