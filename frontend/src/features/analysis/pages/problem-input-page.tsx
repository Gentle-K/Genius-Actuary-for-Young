import { useMutation } from '@tanstack/react-query'
import { Form, Formik } from 'formik'
import { Lightbulb, WandSparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as Yup from 'yup'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/field'
import { AnalysisPendingView } from '@/features/analysis/components/analysis-pending-view'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { normalizeLanguageCode } from '@/lib/i18n/locale'

export function ProblemInputPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const adapter = useApiAdapter()
  const [searchParams, setSearchParams] = useSearchParams()
  const [sessionFailure, setSessionFailure] = useState<string | null>(null)
  const mode = (searchParams.get('mode') as 'single-option' | 'multi-option' | null) ?? 'single-option'
  const locale = normalizeLanguageCode(i18n.language)

  const promptSuggestions = t('analysis.problemInputPage.promptSuggestions', {
    returnObjects: true,
  }) as string[]

  const createMutation = useMutation({
    mutationFn: adapter.analysis.create,
    onSuccess: (session) => {
      if (session.status === 'FAILED') {
        setSessionFailure(
          session.errorMessage ??
            t('analysis.problemInputPage.llmFailure'),
        )
        return
      }

      setSessionFailure(null)
      void navigate(`/analysis/session/${session.id}/clarify`)
    },
  })

  if (createMutation.isPending) {
    return (
      <AnalysisPendingView
        eyebrow={t('common.nextStep')}
        title={t('analysis.problemInputPage.pendingView.title')}
        description={t('analysis.problemInputPage.pendingView.description')}
        loaderLabel={t('analysis.problemInputPage.pendingView.loaderLabel')}
        stageLabel={t('analysis.problemInputPage.pendingView.stageLabel')}
        stageTitle={t('analysis.problemInputPage.pendingView.stageTitle')}
        stageDescription={t('analysis.problemInputPage.pendingView.stageDescription')}
        tips={
          t('analysis.problemInputPage.pendingView.tips', {
            returnObjects: true,
          }) as [string, string]
        }
      />
    )
  }

  return (
    <div className="space-y-6" data-testid="problem-input-page">
      <PageHeader
        eyebrow={t('common.nextStep')}
        title={t('analysis.intakeTitle')}
        description={t('analysis.intakeSubtitle')}
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-5 p-6">
          <div className="flex items-center gap-3">
            <Badge tone="gold">{mode === 'single-option' ? t('analysis.singleMode') : t('analysis.multiMode')}</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const nextMode = mode === 'single-option' ? 'multi-option' : 'single-option'
                setSearchParams({ mode: nextMode })
              }}
            >
              {t('analysis.switchMode')}
            </Button>
          </div>

          <Formik
            initialValues={{
              problemStatement: promptSuggestions[0],
            }}
            validationSchema={Yup.object({
              problemStatement: Yup.string().min(12).required(),
            })}
            onSubmit={async (values) => {
              setSessionFailure(null)
              await createMutation.mutateAsync({
                mode,
                locale,
                problemStatement: values.problemStatement,
                intakeContext: {
                  investmentAmount: 10000,
                  baseCurrency: 'USDT',
                  preferredAssetIds: ['hsk-usdc', 'cpic-estable-mmf', 'hk-regulated-silver'],
                  holdingPeriodDays: 30,
                  riskTolerance: 'balanced',
                  liquidityNeed: 't_plus_3',
                  minimumKycLevel: 0,
                  walletAddress: '',
                  wantsOnchainAttestation: true,
                  additionalConstraints: '',
                  includeNonProductionAssets: false,
                  demoMode: false,
                  demoScenarioId: '',
                  analysisSeed: undefined,
                },
              })
            }}
          >
            {({ values, handleChange, handleSubmit, setFieldValue, isSubmitting }) => (
              <Form className="space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label htmlFor="problemStatement" className="text-sm text-text-secondary">
                    {t('analysis.problemStatementLabel')}
                  </label>
                  <Textarea
                    id="problemStatement"
                    name="problemStatement"
                    value={values.problemStatement}
                    onChange={handleChange}
                    placeholder={t('analysis.problemStatementPlaceholder')}
                    className="min-h-44 text-base"
                    data-testid="problem-statement-input"
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-text-muted">{t('analysis.suggestions')}</p>
                  <div className="flex flex-wrap gap-2">
                    {promptSuggestions.map((suggestion) => {
                      const isActive = values.problemStatement === suggestion

                      return (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => setFieldValue('problemStatement', suggestion)}
                          className={`interactive-lift rounded-full border px-4 py-2 text-sm transition ${
                            isActive
                              ? 'border-border-strong bg-[rgba(212,175,55,0.14)] text-text-primary shadow-[0_0_0_1px_rgba(249,228,159,0.08)]'
                              : 'border-border-subtle bg-app-bg-elevated text-text-secondary hover:border-border-strong hover:text-text-primary'
                          }`}
                        >
                          {suggestion}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <Button
                  type="submit"
                  data-testid="problem-input-submit"
                  disabled={createMutation.isPending || isSubmitting}
                >
                  <WandSparkles className="size-4" />
                  {t('analysis.startAnalysis')}
                </Button>

                {createMutation.error || sessionFailure ? (
                  <p className="rounded-2xl border border-[rgba(197,109,99,0.35)] bg-[rgba(197,109,99,0.12)] px-4 py-3 text-sm text-[#f7d4cf]">
                    {sessionFailure ?? t('analysis.problemInputPage.startFailure')}
                  </p>
                ) : null}
              </Form>
            )}
          </Formik>
        </Card>

        <Card className="space-y-5 p-6">
          <div className="flex items-center gap-3 text-gold-primary">
            <Lightbulb className="size-5" />
            <h2 className="text-lg font-semibold text-text-primary">{t('analysis.suggestions')}</h2>
          </div>
          <div className="space-y-3">
            <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4 text-sm leading-7 text-text-secondary">
              {t('analysis.suggestionHint1')}
            </div>
            <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4 text-sm leading-7 text-text-secondary">
              {t('analysis.suggestionHint2')}
            </div>
            <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4 text-sm leading-7 text-text-secondary">
              {t('analysis.suggestionHint3')}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
