import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, CircleHelp, Save } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import {
  FormField,
  SectionCard,
  StatusBadge,
  StickyFooter,
} from '@/components/product/workspace-ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'
import { getLocalStorageItem, removeLocalStorageItem, setLocalStorageItem } from '@/lib/utils/safe-storage'
import type { ClarificationQuestion, UserAnswer } from '@/types'

const draftKey = (sessionId: string) => `ga-clarify-draft:${sessionId}`

type ClarificationDraftValue = Record<
  string,
  {
    selectedOptions: string[]
    customInput: string
    numericValue: string
    answerStatus: UserAnswer['answerStatus']
  }
>

function buildInitialDraft(questions: ClarificationQuestion[], raw: string | null) {
  const fallback = questions.reduce<ClarificationDraftValue>((accumulator, question) => {
    accumulator[question.id] = {
      selectedOptions: question.recommended ?? [],
      customInput: '',
      numericValue: '',
      answerStatus: 'answered',
    }
    return accumulator
  }, {})

  if (!raw) {
    return fallback
  }

  try {
    return {
      ...fallback,
      ...(JSON.parse(raw) as ClarificationDraftValue),
    }
  } catch {
    return fallback
  }
}

function hasMeaningfulAnswer(value: ClarificationDraftValue[string]) {
  return Boolean(
    value.selectedOptions.length ||
      value.customInput.trim() ||
      (value.numericValue && Number.isFinite(Number(value.numericValue))),
  )
}

function toAnswers(questions: ClarificationQuestion[], draft: ClarificationDraftValue): UserAnswer[] {
  return questions.flatMap((question) => {
    const value = draft[question.id]
    if (!value) {
      return []
    }

    if (value.answerStatus === 'answered' && !hasMeaningfulAnswer(value)) {
      return []
    }

    return [
      {
        id: `${question.id}-answer`,
        questionId: question.id,
        selectedOptions: value.selectedOptions.length ? value.selectedOptions : undefined,
        customInput: value.customInput.trim() || undefined,
        numericValue: value.numericValue ? Number(value.numericValue) : undefined,
        answerStatus: value.answerStatus,
      },
    ]
  })
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

  const questions = useMemo(
    () => (sessionQuery.data?.questions ?? []).filter((question) => !question.answered),
    [sessionQuery.data?.questions],
  )
  const [draft, setDraft] = useState<ClarificationDraftValue>({})
  const [currentQuestionId, setCurrentQuestionId] = useState('')
  const persistedDraft = useMemo(
    () =>
      questions.length
        ? buildInitialDraft(questions, getLocalStorageItem(draftKey(sessionId)))
        : {},
    [questions, sessionId],
  )
  const effectiveDraft = Object.keys(draft).length ? draft : persistedDraft

  const submitMutation = useMutation({
    mutationFn: (answers: UserAnswer[]) => adapter.analysis.submitAnswers(sessionId, { answers }),
    onSuccess: async (session) => {
      removeLocalStorageItem(draftKey(sessionId))
      queryClient.setQueryData(['analysis', sessionId, 'clarification-page', locale], session)
      if (session.status === 'CLARIFYING') {
        return
      }
      await navigate(`/sessions/${session.id}/analyzing`)
    },
  })

  const currentQuestion =
    questions.find((question) => question.id === currentQuestionId) ?? questions[0]
  const draftValue = currentQuestion ? effectiveDraft[currentQuestion.id] : undefined
  const pendingQueue = questions.filter((question) => question.id !== currentQuestion?.id)
  const saveDraftLocally = () => {
    setLocalStorageItem(draftKey(sessionId), JSON.stringify(effectiveDraft))
  }
  const currentQuestionReady =
    !currentQuestion ||
    draftValue?.answerStatus !== 'answered' ||
    Boolean(draftValue && hasMeaningfulAnswer(draftValue))
  const continueReason = currentQuestionReady
    ? ''
    : 'Continue analysis disabled: answer, skip, or mark uncertain for the current question first.'

  const updateQuestionDraft = (
    questionId: string,
    patch: Partial<ClarificationDraftValue[string]>,
  ) => {
    setDraft((current) => ({
      ...(Object.keys(current).length ? current : persistedDraft),
      [questionId]: {
        ...((Object.keys(current).length ? current : persistedDraft)[questionId] ?? {
          selectedOptions: [],
          customInput: '',
          numericValue: '',
          answerStatus: 'answered' as const,
        }),
        ...patch,
      },
    }))
  }

  if (sessionQuery.isLoading) {
    return (
      <Card className="space-y-4 p-6">
        <p className="text-sm text-text-secondary">Loading clarification workspace…</p>
      </Card>
    )
  }

  if (sessionQuery.error) {
    return (
      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold text-text-primary">
          Failed to load the analysis session
        </h2>
        <p className="text-sm text-text-secondary">
          Review the connection, then retry the clarification workspace.
        </p>
        <Button variant="secondary" onClick={() => void sessionQuery.refetch()}>
          Retry
        </Button>
      </Card>
    )
  }

  if (!sessionQuery.data || !questions.length) {
    return (
      <Card className="space-y-4 p-6">
        <p className="text-sm text-text-secondary">
          No pending clarification questions remain for this session.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void navigate(`/sessions/${sessionId}`)}>Open session</Button>
          <Button variant="secondary" onClick={() => void navigate(`/reports/${sessionId}`)}>
            Open report
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6" data-testid="clarification-page">
      <PageHeader
        eyebrow={t('common.nextStep')}
        title={t('analysis.clarifyTitle')}
        description={t('analysis.clarifySubtitle')}
        statusBadges={
          <>
            <StatusBadge label={`Open questions · ${questions.length}`} severity="warning" />
            <StatusBadge label={`Current focus · ${currentQuestion.priority}`} severity="info" />
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
        <SectionCard
          title={currentQuestion.question}
          description={currentQuestion.purpose}
          state="highlight"
          action={<Badge tone="gold">Current question</Badge>}
        >
          <div className="space-y-5">
            <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
                Why it matters
              </p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                {currentQuestion.purpose}
              </p>
            </div>

            {currentQuestion.options?.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {currentQuestion.options.map((option) => {
                  const selected = draftValue?.selectedOptions.includes(option.value)
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`rounded-[22px] border p-4 text-left transition ${
                        selected
                          ? 'border-primary bg-primary-soft text-text-primary'
                          : 'border-border-subtle bg-app-bg-elevated text-text-secondary hover:border-border-strong hover:text-text-primary'
                      }`}
                      onClick={() => {
                        updateQuestionDraft(currentQuestion.id, {
                          answerStatus: 'answered',
                          selectedOptions:
                            currentQuestion.fieldType === 'multi-choice'
                              ? selected
                                ? (draftValue?.selectedOptions ?? []).filter((item) => item !== option.value)
                                : [...(draftValue?.selectedOptions ?? []), option.value]
                              : [option.value],
                        })
                      }}
                    >
                      <p className="text-sm font-semibold">{option.label}</p>
                      {option.description ? (
                        <p className="mt-2 text-sm leading-6">{option.description}</p>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            ) : null}

            {currentQuestion.fieldType === 'text' || currentQuestion.fieldType === 'textarea' ? (
              <FormField
                label="Custom input"
                helperText={currentQuestion.inputHint ?? 'Add context when the quick answer is incomplete.'}
              >
                {(fieldProps) => (
                  <Textarea
                    {...fieldProps}
                    value={draftValue?.customInput ?? ''}
                    onChange={(event) =>
                      updateQuestionDraft(currentQuestion.id, {
                        answerStatus: 'answered',
                        customInput: event.target.value,
                      })
                    }
                  />
                )}
              </FormField>
            ) : null}

            {currentQuestion.fieldType === 'number' || currentQuestion.fieldType === 'slider' ? (
              <FormField
                label="Numeric input"
                helperText={
                  currentQuestion.unit
                    ? `Use ${currentQuestion.unit} for this answer.`
                    : 'Enter a numeric value if it applies.'
                }
              >
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={draftValue?.numericValue ?? ''}
                    onChange={(event) =>
                      updateQuestionDraft(currentQuestion.id, {
                        answerStatus: 'answered',
                        numericValue: event.target.value,
                      })
                    }
                  />
                )}
              </FormField>
            ) : null}

            {currentQuestion.allowCustomInput && currentQuestion.fieldType !== 'textarea' && currentQuestion.fieldType !== 'text' ? (
              <FormField label="Custom input" helperText="Add supporting context or exceptions.">
                {(fieldProps) => (
                  <Input
                    {...fieldProps}
                    value={draftValue?.customInput ?? ''}
                    onChange={(event) =>
                      updateQuestionDraft(currentQuestion.id, {
                        answerStatus: 'answered',
                        customInput: event.target.value,
                      })
                    }
                  />
                )}
              </FormField>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  updateQuestionDraft(currentQuestion.id, {
                    answerStatus: 'uncertain',
                    selectedOptions: [],
                    customInput: '',
                    numericValue: '',
                  })
                }
              >
                Mark uncertain
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  updateQuestionDraft(currentQuestion.id, {
                    answerStatus: 'skipped',
                    selectedOptions: [],
                    customInput: '',
                    numericValue: '',
                  })
                }
              >
                Skip with reason
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  updateQuestionDraft(currentQuestion.id, {
                    answerStatus: 'declined',
                    selectedOptions: [],
                    customInput: '',
                    numericValue: '',
                  })
                }
              >
                Prefer not to answer
              </Button>
            </div>
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Round progress" description="Keep the unresolved queue compact while the current question stays primary.">
            <div className="space-y-3">
              <div className="rounded-[18px] border border-border-subtle bg-app-bg-elevated px-4 py-3">
                <p className="text-sm text-text-secondary">
                  {questions.length - pendingQueue.length} focused now · {pendingQueue.length} queued
                </p>
              </div>
              {pendingQueue.map((question) => (
                <button
                  key={question.id}
                  type="button"
                  className="w-full rounded-[20px] border border-border-subtle bg-app-bg-elevated px-4 py-4 text-left transition hover:border-border-strong"
                  onClick={() => setCurrentQuestionId(question.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{question.question}</p>
                      <p className="mt-1 text-sm text-text-secondary">{question.purpose}</p>
                    </div>
                    {effectiveDraft[question.id] && hasMeaningfulAnswer(effectiveDraft[question.id]) ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : (
                      <CircleHelp className="size-4 text-warning" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Analysis context" description="Surface what is unresolved before the session moves forward.">
            <div className="space-y-3 text-sm text-text-secondary">
              <div className="rounded-[18px] bg-app-bg-elevated px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Evidence progress</p>
                <p className="mt-2">{sessionQuery.data.evidence.length} evidence items loaded</p>
              </div>
              <div className="rounded-[18px] bg-app-bg-elevated px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Calculation progress</p>
                <p className="mt-2">{sessionQuery.data.calculations.length} calculations ready</p>
              </div>
              <div className="rounded-[18px] bg-app-bg-elevated px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Conclusions so far</p>
                <p className="mt-2">{sessionQuery.data.conclusions[0]?.conclusion ?? 'No conclusion has been recorded yet.'}</p>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      <StickyFooter>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-text-primary">
              Save answers locally if you need to pause without advancing the session.
            </p>
            {continueReason ? <p className="text-sm text-warning">{continueReason}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={saveDraftLocally}>
              <Save className="size-4" />
              Save answers
            </Button>
            <Button
              data-testid="clarification-submit"
              type="button"
              onClick={() => submitMutation.mutate(toAnswers(questions, effectiveDraft))}
              disabled={submitMutation.isPending || !currentQuestionReady}
            >
              Continue analysis
            </Button>
          </div>
        </div>
      </StickyFooter>
    </div>
  )
}
