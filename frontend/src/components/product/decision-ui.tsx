import type { ReactNode } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleHelp,
  Clock3,
  ExternalLink,
  FileSearch,
  Search,
  Sigma,
  Sparkles,
} from 'lucide-react'

import { Skeleton } from '@/components/feedback/skeleton'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input, Textarea } from '@/components/ui/field'
import { cn } from '@/lib/utils/cn'
import { formatDateTime } from '@/lib/utils/format'
import {
  calculationTitle,
  confidenceMeta,
  currentUnderstanding,
  evidenceDomain,
  evidenceFreshnessMeta,
  formatRelativeTime,
  modeLabel,
  sessionKeyConclusion,
  statusMeta,
} from '@/features/analysis/lib/view-models'
import type {
  AnalysisSession,
  CalculationTask,
  ClarificationQuestion,
  EvidenceItem,
} from '@/types'

export interface ClarificationDraftValue {
  selectedOptions: string[]
  customInput: string
  answerStatus: 'answered' | 'skipped' | 'uncertain' | 'declined'
}

export function StatusBadge({ status }: { status: string }) {
  const meta = statusMeta(status)
  return <Badge tone={meta.tone}>{meta.label}</Badge>
}

export function ConfidenceBadge({ confidence }: { confidence?: number }) {
  const meta = confidenceMeta(confidence)
  return (
    <Badge tone={meta.tone}>
      {meta.label}
      {typeof confidence === 'number' ? ` · ${Math.round(confidence * 100)}%` : ''}
    </Badge>
  )
}

export function SearchInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn('relative min-w-[220px] flex-1', className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
      <Input {...props} className="pl-10" />
    </div>
  )
}

export function FilterBar({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'panel-card flex flex-wrap items-center gap-3 rounded-[24px] p-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function SectionCard({
  actions,
  children,
  className,
  description,
  title,
}: {
  actions?: ReactNode
  children: ReactNode
  className?: string
  description?: string
  title: string
}) {
  return (
    <Card className={cn('space-y-5 p-6', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-text-primary">
            {title}
          </h2>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-text-secondary">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </Card>
  )
}

export function MetricCard({
  detail,
  title,
  tone = 'neutral',
  value,
}: {
  detail: string
  title: string
  tone?: 'neutral' | 'brand' | 'success' | 'warning'
  value: string
}) {
  const toneClass =
    tone === 'brand'
      ? 'bg-brand-soft/70'
      : tone === 'success'
        ? 'bg-[rgba(45,118,80,0.08)]'
        : tone === 'warning'
          ? 'bg-[rgba(185,115,44,0.08)]'
          : 'bg-app-bg-elevated'

  return (
    <Card className={cn('space-y-3 p-5', toneClass)}>
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      <p className="metric-value text-[1.95rem] font-semibold leading-none text-text-primary">
        {value}
      </p>
      <p className="text-sm leading-6 text-text-secondary">{detail}</p>
    </Card>
  )
}

export function LoadingState({
  description = 'Pulling the latest analysis state.',
  title = 'Loading',
}: {
  description?: string
  title?: string
}) {
  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        <p className="text-sm text-text-secondary">{description}</p>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-12 w-full rounded-[18px] bg-brand-soft/60" />
        <Skeleton className="h-12 w-full rounded-[18px] bg-brand-soft/50" />
        <Skeleton className="h-32 w-full rounded-[20px] bg-brand-soft/45" />
      </div>
    </Card>
  )
}

export function ErrorState({
  action,
  description,
  title,
}: {
  action?: ReactNode
  description: string
  title: string
}) {
  return (
    <Card className="space-y-4 border-[rgba(181,86,77,0.2)] bg-[rgba(181,86,77,0.08)] p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" />
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-text-primary">{title}</h3>
          <p className="text-sm leading-6 text-text-secondary">{description}</p>
        </div>
      </div>
      {action ? <div>{action}</div> : null}
    </Card>
  )
}

export function SourceCard({
  item,
  linkedConclusionCount,
  onOpen,
  sessionTitle,
}: {
  item: EvidenceItem
  linkedConclusionCount: number
  onOpen?: () => void
  sessionTitle?: string
}) {
  const freshness = evidenceFreshnessMeta(item)

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{evidenceDomain(item.sourceUrl)}</Badge>
            <ConfidenceBadge confidence={item.confidence} />
            <Badge tone={freshness.tone}>{freshness.label}</Badge>
          </div>
          <h3 className="text-base font-semibold text-text-primary">{item.title}</h3>
          <p className="text-sm text-text-secondary">
            {item.sourceName} · Fetched {formatRelativeTime(item.fetchedAt)}
          </p>
        </div>
        {onOpen ? (
          <Button variant="ghost" size="sm" onClick={onOpen}>
            View details
            <ArrowUpRight className="size-4" />
          </Button>
        ) : null}
      </div>
      <p className="text-sm leading-6 text-text-secondary">{item.summary}</p>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[20px] bg-app-bg-elevated p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
            Extracted facts
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-text-secondary">
            {item.extractedFacts.slice(0, 3).map((fact) => (
              <li key={fact} className="flex gap-2">
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-success" />
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[20px] bg-app-bg-elevated p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
            Usage
          </p>
          <div className="mt-3 space-y-2 text-sm text-text-secondary">
            <p>Linked conclusions: {linkedConclusionCount}</p>
            <p>Session: {sessionTitle ?? 'Unassigned'}</p>
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-gold-primary hover:text-gold-bright"
            >
              Open original source
              <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function ConclusionCard({
  basisCount,
  confidence,
  title,
  type,
}: {
  basisCount: number
  confidence?: number
  title: string
  type: 'fact' | 'estimate' | 'inference'
}) {
  const typeLabel =
    type === 'fact' ? 'Fact' : type === 'estimate' ? 'Estimate' : 'Inference'

  return (
    <Card className="space-y-3 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="info">{typeLabel}</Badge>
        <ConfidenceBadge confidence={confidence} />
      </div>
      <p className="text-sm leading-6 text-text-primary">{title}</p>
      <p className="text-xs text-text-muted">Basis references: {basisCount}</p>
    </Card>
  )
}

export function CalculationCard({
  sessionTitle,
  task,
}: {
  sessionTitle?: string
  task: CalculationTask
}) {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text-primary">
            {calculationTitle(task)}
          </h3>
          <p className="mt-1 text-sm text-text-secondary">
            {sessionTitle ?? 'Analysis calculation'} · {formatRelativeTime(task.createdAt)}
          </p>
        </div>
        <Badge tone={task.status === 'failed' ? 'danger' : 'info'}>
          {task.status === 'failed' ? 'Calculation failed' : 'Calculation ready'}
        </Badge>
      </div>
      <div className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[20px] bg-app-bg-elevated p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
            Formula
          </p>
          <p className="mono mt-3 text-sm leading-6 text-text-primary">
            {task.formulaExpression}
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {Object.entries(task.inputParams).map(([key, value]) => (
              <div key={key} className="rounded-2xl bg-panel px-3 py-2.5 text-sm">
                <span className="text-text-muted">{key}</span>
                <p className="mono mt-1 text-text-primary">{String(value)}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-[20px] bg-app-bg-elevated p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
            Result
          </p>
          <p className="metric-value mt-3 text-[1.8rem] font-semibold text-text-primary">
            {task.result}
          </p>
          <p className="mt-1 text-sm text-text-secondary">{task.units}</p>
          <p className="mt-4 text-sm leading-6 text-text-secondary">
            {task.errorMargin ?? task.notes ?? 'No additional applicability note provided.'}
          </p>
        </div>
      </div>
    </Card>
  )
}

export function SessionCard({
  actions,
  confidence,
  onOpen,
  session,
}: {
  actions?: ReactNode
  confidence?: number
  onOpen?: () => void
  session: AnalysisSession
}) {
  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">{modeLabel(session.mode)}</Badge>
            <StatusBadge status={session.status} />
            <ConfidenceBadge confidence={confidence} />
          </div>
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-text-primary">
            {session.problemStatement}
          </h3>
          <p className="text-sm text-text-secondary">
            Updated {formatRelativeTime(session.updatedAt)}
          </p>
        </div>
        {onOpen ? (
          <Button variant="ghost" size="sm" onClick={onOpen}>
            Open session
            <ArrowUpRight className="size-4" />
          </Button>
        ) : null}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-[20px] bg-app-bg-elevated p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
            Key conclusion
          </p>
          <p className="mt-2 text-sm leading-6 text-text-primary">
            {sessionKeyConclusion(session)}
          </p>
        </div>
        <div className="rounded-[20px] bg-app-bg-elevated p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
            Current understanding
          </p>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-text-secondary">
            {currentUnderstanding(session).slice(0, 3).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </Card>
  )
}

export function SessionRow({
  actions,
  confidence,
  evidenceCount,
  onOpen,
  session,
}: {
  actions?: ReactNode
  confidence?: number
  evidenceCount: number
  onOpen?: () => void
  session: AnalysisSession
}) {
  return (
    <div
      className="grid cursor-pointer gap-4 rounded-[24px] border border-border-subtle bg-panel px-4 py-4 transition hover:border-border-strong hover:bg-panel-strong xl:grid-cols-[2.5fr_1.1fr_1.1fr_1fr_2fr_1.4fr_1fr_auto]"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen?.()
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="space-y-1.5">
        <p className="font-semibold text-text-primary">{session.problemStatement}</p>
        <p className="text-sm text-text-secondary">{sessionKeyConclusion(session)}</p>
      </div>
      <div className="text-sm text-text-secondary">{modeLabel(session.mode)}</div>
      <div>
        <StatusBadge status={session.status} />
      </div>
      <div className="text-sm text-text-secondary">{formatRelativeTime(session.updatedAt)}</div>
      <div className="text-sm text-text-secondary">{session.lastInsight}</div>
      <div>
        <ConfidenceBadge confidence={confidence} />
      </div>
      <div className="text-sm text-text-secondary">{evidenceCount} sources</div>
      <div
        className="flex flex-wrap items-center justify-start gap-2"
        onClick={(event) => event.stopPropagation()}
      >
        {actions}
      </div>
    </div>
  )
}

export function ClarificationQuestionCard({
  onChange,
  question,
  value,
}: {
  onChange: (next: ClarificationDraftValue) => void
  question: ClarificationQuestion
  value: ClarificationDraftValue
}) {
  const currentSliderValue =
    Number(value.selectedOptions[0] ?? question.recommended?.[0] ?? question.min ?? 5)

  const updateSelectedOption = (nextValue: string) => {
    if (question.fieldType === 'multi-choice') {
      const exists = value.selectedOptions.includes(nextValue)
      onChange({
        ...value,
        answerStatus: 'answered',
        selectedOptions: exists
          ? value.selectedOptions.filter((item) => item !== nextValue)
          : [...value.selectedOptions, nextValue],
      })
      return
    }

    onChange({
      ...value,
      answerStatus: 'answered',
      selectedOptions: [nextValue],
    })
  }

  return (
    <Card className="space-y-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="neutral">Question</Badge>
            <Badge tone={value.answerStatus === 'answered' ? 'success' : value.answerStatus === 'skipped' ? 'warning' : 'neutral'}>
              {value.answerStatus === 'answered'
                ? 'Answered'
                : value.answerStatus === 'skipped'
                  ? 'Skipped'
                  : value.answerStatus === 'uncertain'
                    ? 'Needs more context'
                    : 'Pending'}
            </Badge>
          </div>
          <h3 className="text-base font-semibold text-text-primary">{question.question}</h3>
          <div className="flex items-start gap-2 rounded-[18px] bg-app-bg-elevated px-3 py-3 text-sm leading-6 text-text-secondary">
            <CircleHelp className="mt-0.5 size-4 shrink-0 text-info" />
            <span>{question.purpose}</span>
          </div>
        </div>
      </div>

      {question.fieldType === 'slider' ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">Current answer</span>
            <span className="mono rounded-full bg-brand-soft px-3 py-1 text-text-primary">
              {currentSliderValue}
              {question.unit ?? ''}
            </span>
          </div>
          <input
            type="range"
            min={question.min ?? 1}
            max={question.max ?? 10}
            value={currentSliderValue}
            onChange={(event) =>
              onChange({
                ...value,
                answerStatus: 'answered',
                selectedOptions: [event.target.value],
              })
            }
            className="w-full accent-[var(--brand-solid)]"
          />
        </div>
      ) : null}

      {question.options?.length ? (
        <div className="flex flex-wrap gap-2.5">
          {question.options.map((option) => {
            const active = value.selectedOptions.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateSelectedOption(option.value)}
                className={cn(
                  'interactive-lift rounded-full border px-3.5 py-2 text-sm',
                  active
                    ? 'border-border-strong bg-brand-soft text-text-primary'
                    : 'border-border-subtle bg-app-bg-elevated text-text-secondary hover:border-border-strong hover:text-text-primary',
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      ) : null}

      {question.allowCustomInput ? (
        question.fieldType === 'text' ? (
          <Input
            value={value.customInput}
            placeholder={question.inputHint || 'Add custom context'}
            onChange={(event) =>
              onChange({
                ...value,
                answerStatus: 'answered',
                customInput: event.target.value,
              })
            }
          />
        ) : (
          <Textarea
            value={value.customInput}
            placeholder={
              question.inputHint ||
              question.exampleAnswer ||
              'Add anything that changes the recommendation.'
            }
            onChange={(event) =>
              onChange({
                ...value,
                answerStatus: 'answered',
                customInput: event.target.value,
              })
            }
          />
        )
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onChange({ ...value, answerStatus: 'uncertain' })}
        >
          Mark uncertain
        </Button>
        {question.allowSkip ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                ...value,
                answerStatus: 'skipped',
                selectedOptions: [],
                customInput: '',
              })
            }
          >
            Skip for now
          </Button>
        ) : null}
      </div>
    </Card>
  )
}

export function ReportSection({
  children,
  description,
  id,
  title,
}: {
  children: ReactNode
  description?: string
  id: string
  title: string
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <Card className="space-y-5 p-6">
        <div className="space-y-1.5">
          <h2 className="apple-kicker text-left">{title}</h2>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-text-secondary">
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </Card>
    </section>
  )
}

export function MiniFact({
  icon,
  label,
  value,
}: {
  icon?: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-[20px] bg-app-bg-elevated p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">
        {label}
      </p>
      <div className="mt-2 flex items-center gap-2 text-sm text-text-primary">
        {icon}
        <span>{value}</span>
      </div>
    </div>
  )
}

export function SmallMetaList({
  items,
}: {
  items: Array<{ label: string; value: string }>
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <MiniFact key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  )
}

export function PreviewNote({
  children,
  icon,
}: {
  children: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="flex items-start gap-2 rounded-[18px] bg-brand-soft/60 px-4 py-3 text-sm leading-6 text-text-secondary">
      {icon ?? <Sparkles className="mt-0.5 size-4 shrink-0 text-gold-primary" />}
      <span>{children}</span>
    </div>
  )
}

export function ResourceKicker({
  fetchedAt,
  url,
}: {
  fetchedAt: string
  url: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
      <span className="inline-flex items-center gap-1">
        <Clock3 className="size-3.5" />
        {formatDateTime(fetchedAt, 'en')}
      </span>
      <span className="inline-flex items-center gap-1">
        <FileSearch className="size-3.5" />
        {evidenceDomain(url)}
      </span>
    </div>
  )
}

export function CalculationEmptyHint() {
  return (
    <div className="flex items-start gap-3 rounded-[20px] bg-app-bg-elevated px-4 py-4 text-sm leading-6 text-text-secondary">
      <Sigma className="mt-0.5 size-4 shrink-0 text-info" />
      <span>
        Calculations only appear when the system has enough structured inputs to
        compute a meaningful result.
      </span>
    </div>
  )
}

export { EmptyState }
