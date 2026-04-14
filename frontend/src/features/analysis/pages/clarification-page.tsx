import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Form, Formik } from 'formik'
import { CheckCircle2, CircleHelp } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/feedback/skeleton'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/field'
import { AnalysisPendingView } from '@/features/analysis/components/analysis-pending-view'
import { ApiError } from '@/lib/api/client'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'
import { haptics } from '@/lib/utils/haptics'
import type { ClarificationQuestion, UserAnswer } from '@/types'

type ClarificationValues = Record<string, string | string[]>

function buildInitialValues(questions: ClarificationQuestion[]) {
  return questions.reduce<Record<string, string | string[]>>((accumulator, question) => {
    accumulator[question.id] =
      question.fieldType === 'multi-choice' ? question.recommended ?? [] : question.recommended?.[0] ?? ''
    accumulator[`${question.id}__custom`] = ''
    accumulator[`${question.id}__status`] = 'answered'
    return accumulator
  }, {})
}

function toAnswers(questions: ClarificationQuestion[], values: ClarificationValues): UserAnswer[] {
  return questions.flatMap((question) => {
    const rawStatus = String(values[`${question.id}__status`] ?? 'answered')
    const selectedValue = values[question.id]
    const customInput = String(values[`${question.id}__custom`] ?? '').trim()
    const selectedOptions =
      Array.isArray(selectedValue) && selectedValue.length
        ? selectedValue
        : typeof selectedValue === 'string' && selectedValue
          ? [selectedValue]
          : undefined
    const numericValue =
      question.fieldType === 'slider' || question.fieldType === 'number'
        ? Number(selectedValue || 0)
        : undefined
    const hasExplicitAnswer =
      Boolean(selectedOptions?.length) ||
      Boolean(customInput) ||
      (typeof numericValue === 'number' &&
        Number.isFinite(numericValue) &&
        (question.fieldType === 'slider' || question.fieldType === 'number'))

    if (rawStatus === 'answered' && !hasExplicitAnswer) {
      return []
    }

    return [{
      id: `${question.id}-answer`,
      questionId: question.id,
      answerStatus: rawStatus as UserAnswer['answerStatus'],
      selectedOptions,
      customInput: customInput || undefined,
      numericValue,
    }]
  })
}

function summarizeSelection(
  question: ClarificationQuestion,
  values: ClarificationValues,
  currentStatus: UserAnswer['answerStatus'],
  statusLabel: string,
) {
  if (currentStatus !== 'answered') {
    return statusLabel
  }

  const rawValue = values[question.id]

  if (question.fieldType === 'multi-choice' && Array.isArray(rawValue) && rawValue.length) {
    const selected = new Set(rawValue)
    return question.options
      ?.filter((option) => selected.has(option.value))
      .map((option) => option.label)
      .join(' / ')
  }

  if (typeof rawValue === 'string' && rawValue) {
    const matchingOption = question.options?.find((option) => option.value === rawValue)
    return matchingOption?.label ?? rawValue
  }

  const customInput = String(values[`${question.id}__custom`] ?? '').trim()
  if (customInput) {
    return customInput
  }

  return ''
}

function getSubmitErrorMessage(error: unknown, t: ReturnType<typeof useTranslation>['t']) {
  if (error instanceof ApiError) {
    const detail =
      error.details && typeof error.details === 'object' && 'detail' in error.details
        ? String((error.details as { detail?: unknown }).detail ?? '').trim()
        : ''

    if (detail) {
      return detail
    }
  }

  return t('analysis.clarificationPage.submitFailedFallback')
}

export function ClarificationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { sessionId = '' } = useParams()
  const adapter = useApiAdapter()
  const queryClient = useQueryClient()
  const locale = useAppStore((state) => state.locale)

  const sessionQuery = useQuery({
    queryKey: ['analysis', sessionId, 'clarification-page', locale],
    queryFn: () => adapter.analysis.getById(sessionId),
  })

  const submitMutation = useMutation({
    mutationFn: (answers: UserAnswer[]) => adapter.analysis.submitAnswers(sessionId, { answers }),
    onSuccess: (session) => {
      queryClient.setQueryData(['analysis', sessionId, 'clarification-page', locale], session)
      haptics.trigger('confirm')
      if (session.status === 'CLARIFYING') {
        return
      }

      void navigate(`/analysis/session/${session.id}/progress`)
    },
    onError: () => {
      void sessionQuery.refetch()
    },
  })

  const questions = useMemo(
    () => (sessionQuery.data?.questions ?? []).filter((question) => !question.answered),
    [sessionQuery.data?.questions],
  )
  const initialValues = useMemo(() => buildInitialValues(questions), [questions])

  const text = {
    textPlaceholder: t('analysis.clarificationPage.placeholders.text'),
    textareaPlaceholder: t('analysis.clarificationPage.placeholders.textarea'),
    customPlaceholder: t('analysis.clarificationPage.placeholders.custom'),
    singleChoiceHint: t('analysis.chooseOne'),
    multiChoiceHint: t('analysis.chooseMany'),
    rangeHint: t('analysis.clarificationPage.rangeHint'),
    questionTip: t('analysis.clarificationPage.questionTip'),
    currentRecord: t('analysis.clarificationPage.currentRecord'),
    status: {
      answered: t('analysis.clarificationPage.statuses.answered'),
      skipped: t('analysis.clarificationPage.statuses.skipped'),
      uncertain: t('analysis.clarificationPage.statuses.uncertain'),
      declined: t('analysis.clarificationPage.statuses.declined'),
    },
  }

  if (submitMutation.isPending) {
    return (
      <AnalysisPendingView
        eyebrow={t('common.nextStep')}
        title={t('analysis.clarificationPage.pendingView.title')}
        description={t('analysis.clarificationPage.pendingView.description')}
        loaderLabel={t('analysis.clarificationPage.pendingView.loaderLabel')}
        stageLabel={t('analysis.clarificationPage.pendingView.stageLabel')}
        stageTitle={t('analysis.clarificationPage.pendingView.stageTitle')}
        stageDescription={t('analysis.clarificationPage.pendingView.stageDescription')}
        tips={t('analysis.clarificationPage.pendingView.tips', {
          returnObjects: true,
        }) as [string, string]}
      />
    )
  }

  return (
    <div className="space-y-6" data-testid="clarification-page">
      <PageHeader
        eyebrow={t('common.nextStep')}
        title={t('analysis.clarifyTitle')}
        description={t('analysis.clarifySubtitle')}
      />

      <Card className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-border-subtle bg-app-bg-elevated p-3 text-gold-primary">
            <CircleHelp className="size-5" />
          </div>
          <div className="space-y-2">
            <p className="text-sm leading-7 text-text-secondary">{t('analysis.clarifyHint')}</p>
            <div className="flex flex-wrap gap-2">
              <Badge tone="neutral">{text.singleChoiceHint}</Badge>
              <Badge tone="neutral">{text.multiChoiceHint}</Badge>
              <Badge tone="gold">{t('analysis.customInput')}</Badge>
            </div>
          </div>
        </div>
      </Card>

      {submitMutation.isError ? (
        <Card className="space-y-3 border-[rgba(197,109,99,0.35)] bg-[rgba(197,109,99,0.08)] p-5">
          <h2 className="text-lg font-semibold text-[#f7d4cf]">
            {t('analysis.clarificationPage.submitErrorTitle')}
          </h2>
          <p className="text-sm leading-7 text-[#f1cbc6]">
            {getSubmitErrorMessage(submitMutation.error, t)}
          </p>
          <div className="flex gap-3">
            <Button type="button" onClick={() => submitMutation.reset()}>
              {t('analysis.clarificationPage.reviewAndRetry')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => void sessionQuery.refetch()}>
              {t('analysis.clarificationPage.refreshSession')}
            </Button>
          </div>
        </Card>
      ) : null}

      {sessionQuery.isLoading ? (
        <Card className="space-y-4 p-5">
          <Skeleton className="h-6 w-48 rounded-full" />
          <Skeleton className="h-24 w-full rounded-[20px]" />
          <Skeleton className="h-24 w-full rounded-[20px]" />
        </Card>
      ) : sessionQuery.error ? (
        <Card className="space-y-3 border-[rgba(197,109,99,0.35)] bg-[rgba(197,109,99,0.08)] p-5">
          <h2 className="text-lg font-semibold text-[#f7d4cf]">
            {t('analysis.clarificationPage.loadErrorTitle')}
          </h2>
          <p className="text-sm leading-7 text-[#f1cbc6]">
            {t('analysis.clarificationPage.loadErrorDescription')}
          </p>
          <div className="flex gap-3">
            <Button type="button" onClick={() => void sessionQuery.refetch()}>
              {t('common.retry')}
            </Button>
            <Button type="button" variant="ghost" onClick={() => void navigate('/analysis/intake')}>
              {t('analysis.clarificationPage.backToIntake')}
            </Button>
          </div>
        </Card>
      ) : sessionQuery.data && !questions.length ? (
        <Card className="space-y-4 p-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-text-primary">
              {t('analysis.clarificationPage.noPendingTitle')}
            </h2>
            <p className="text-sm leading-7 text-text-secondary">
              {t('analysis.clarificationPage.noPendingDescription')}
            </p>
          </div>
          <div className="flex gap-3">
            <Button type="button" onClick={() => void navigate(`/analysis/session/${sessionId}/progress`)}>
              {t('analysis.clarificationPage.openProgress')}
            </Button>
            <Button type="button" variant="secondary" onClick={() => void navigate(`/analysis/session/${sessionId}/report`)}>
              {t('analysis.clarificationPage.openReport')}
            </Button>
          </div>
        </Card>
      ) : sessionQuery.data ? (
        <Formik
          initialValues={initialValues}
          enableReinitialize
          onSubmit={async (values) => {
            await submitMutation.mutateAsync(toAnswers(questions, values))
          }}
        >
          {({ values, handleChange, setFieldValue, isSubmitting }) => (
            <Form className="space-y-4">
              {questions.map((question, index) => {
                const currentStatus = String(values[`${question.id}__status`] ?? 'answered') as UserAnswer['answerStatus']
                const selectedSummary = summarizeSelection(question, values, currentStatus, text.status[currentStatus])
                const choiceHint =
                  question.fieldType === 'multi-choice'
                    ? text.multiChoiceHint
                    : question.fieldType === 'single-choice'
                      ? text.singleChoiceHint
                      : question.fieldType === 'slider'
                        ? text.rangeHint
                        : text.questionTip

                return (
                  <Card key={question.id} className="space-y-5 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="neutral">{t('analysis.clarificationPage.questionNumber', { count: index + 1 })}</Badge>
                          <Badge tone="gold">{t('analysis.clarificationPage.priority', { count: question.priority })}</Badge>
                          <Badge tone="neutral">{choiceHint}</Badge>
                        </div>
                        <div className="space-y-2">
                          <h2 className="text-lg font-semibold text-text-primary">{question.question}</h2>
                          <p className="text-sm leading-7 text-text-secondary">
                            <span className="text-gold-ink">{t('analysis.whyThisMatters')}: </span>
                            {question.purpose}
                          </p>
                        </div>
                        {selectedSummary ? (
                          <div className="flex flex-wrap gap-2">
                            <Badge tone={currentStatus === 'answered' ? 'gold' : 'neutral'}>
                              {text.currentRecord}: {selectedSummary}
                            </Badge>
                          </div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {question.allowSkip ? (
                          <Button
                            type="button"
                            variant={currentStatus === 'skipped' ? 'secondary' : 'ghost'}
                            size="sm"
                            className={currentStatus === 'skipped' ? 'border border-border-strong' : ''}
                            onClick={() => setFieldValue(`${question.id}__status`, 'skipped')}
                          >
                            {t('analysis.skip')}
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant={currentStatus === 'uncertain' ? 'secondary' : 'ghost'}
                          size="sm"
                          className={currentStatus === 'uncertain' ? 'border border-border-strong' : ''}
                          onClick={() => setFieldValue(`${question.id}__status`, 'uncertain')}
                        >
                          {t('analysis.uncertain')}
                        </Button>
                        <Button
                          type="button"
                          variant={currentStatus === 'declined' ? 'secondary' : 'ghost'}
                          size="sm"
                          className={currentStatus === 'declined' ? 'border border-border-strong' : ''}
                          onClick={() => setFieldValue(`${question.id}__status`, 'declined')}
                        >
                          {t('analysis.decline')}
                        </Button>
                      </div>
                    </div>

                    {question.fieldType === 'single-choice' ? (
                      <div className="space-y-3">
                        <p className="text-sm text-text-muted">{text.singleChoiceHint}</p>
                        <div className="grid gap-2 md:grid-cols-2">
                          {question.options?.map((option) => {
                            const isActive = values[question.id] === option.value

                            return (
                              <button
                                key={option.value}
                                type="button"
                                aria-pressed={isActive}
                                onClick={() => {
                                  void setFieldValue(question.id, isActive ? '' : option.value)
                                  void setFieldValue(`${question.id}__status`, 'answered')
                                }}
                                className={`interactive-lift rounded-[20px] border px-4 py-4 text-left text-sm transition ${
                                  isActive
                                    ? 'border-border-strong bg-[linear-gradient(180deg,rgba(249,228,159,0.08),transparent_100%),var(--panel)] text-text-primary shadow-[0_0_0_1px_rgba(249,228,159,0.12),0_18px_42px_rgba(212,175,55,0.1)]'
                                    : 'border-border-subtle bg-app-bg-elevated text-text-secondary hover:border-border-strong hover:bg-panel-strong'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="font-medium">{option.label}</p>
                                    <p className="mt-1 text-xs leading-6 text-text-muted">
                                      {option.description ??
                                        t('analysis.clarificationPage.clickToSetCurrent')}
                                    </p>
                                  </div>
                                  {isActive ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-gold-bright" /> : null}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}

                    {question.fieldType === 'multi-choice' ? (
                      <div className="space-y-3">
                        <p className="text-sm text-text-muted">{text.multiChoiceHint}</p>
                        <div className="grid gap-2 md:grid-cols-2">
                          {question.options?.map((option) => {
                            const selectedValues = (values[question.id] as string[]) ?? []
                            const isActive = selectedValues.includes(option.value)

                            return (
                              <button
                                key={option.value}
                                type="button"
                                aria-pressed={isActive}
                                onClick={() => {
                                  const nextValues = isActive
                                    ? selectedValues.filter((item) => item !== option.value)
                                    : [...selectedValues, option.value]
                                  void setFieldValue(question.id, nextValues)
                                  void setFieldValue(`${question.id}__status`, 'answered')
                                }}
                                className={`interactive-lift rounded-[20px] border px-4 py-4 text-left text-sm transition ${
                                  isActive
                                    ? 'border-border-strong bg-[linear-gradient(180deg,rgba(249,228,159,0.08),transparent_100%),var(--panel)] text-text-primary shadow-[0_0_0_1px_rgba(249,228,159,0.12),0_18px_42px_rgba(212,175,55,0.1)]'
                                    : 'border-border-subtle bg-app-bg-elevated text-text-secondary hover:border-border-strong hover:bg-panel-strong'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <span className="font-medium">{option.label}</span>
                                  {isActive ? <CheckCircle2 className="size-4 shrink-0 text-gold-bright" /> : null}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ) : null}

                    {question.fieldType === 'slider' ? (
                      <div className="space-y-3">
                        <p className="text-sm text-text-muted">{text.rangeHint}</p>
                        <input
                          type="range"
                          min={question.min}
                          max={question.max}
                          value={String(values[question.id] || question.min || 1)}
                          onChange={(event) => {
                            void setFieldValue(question.id, event.target.value)
                            void setFieldValue(`${question.id}__status`, 'answered')
                          }}
                          className="w-full accent-[var(--gold-primary)]"
                        />
                        <p className="mono text-sm text-gold-ink">
                          {String(values[question.id] || question.min || 1)} {question.unit}
                        </p>
                      </div>
                    ) : null}

                    {question.fieldType === 'number' ? (
                      <Input
                        type="number"
                        name={question.id}
                        value={String(values[question.id] ?? '')}
                        onChange={(event) => {
                          handleChange(event)
                          void setFieldValue(`${question.id}__status`, 'answered')
                        }}
                        placeholder={text.textPlaceholder}
                      />
                    ) : null}

                    {question.fieldType === 'text' ? (
                      <Input
                        name={question.id}
                        value={String(values[question.id] ?? '')}
                        onChange={(event) => {
                          handleChange(event)
                          void setFieldValue(`${question.id}__status`, 'answered')
                        }}
                        placeholder={text.textPlaceholder}
                      />
                    ) : null}

                    {question.fieldType === 'textarea' ? (
                      <Textarea
                        name={question.id}
                        value={String(values[question.id] ?? '')}
                        onChange={(event) => {
                          handleChange(event)
                          void setFieldValue(`${question.id}__status`, 'answered')
                        }}
                        placeholder={text.textareaPlaceholder}
                      />
                    ) : null}

                    {question.allowCustomInput ? (
                      <div className="space-y-2">
                        <label htmlFor={`${question.id}__custom`} className="text-sm text-text-secondary">
                          {t('analysis.customInput')}
                        </label>
                        <Input
                          id={`${question.id}__custom`}
                          name={`${question.id}__custom`}
                          value={String(values[`${question.id}__custom`] ?? '')}
                          onChange={(event) => {
                            handleChange(event)
                            void setFieldValue(`${question.id}__status`, 'answered')
                          }}
                          placeholder={text.customPlaceholder}
                        />
                      </div>
                    ) : null}
                  </Card>
                )
              })}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-text-muted">{t('analysis.modeActionHint')}</p>
                <Button
                  type="submit"
                  data-testid="clarification-submit"
                  disabled={isSubmitting || submitMutation.isPending}
                >
                  {t('common.continue')}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      ) : null}
    </div>
  )
}
