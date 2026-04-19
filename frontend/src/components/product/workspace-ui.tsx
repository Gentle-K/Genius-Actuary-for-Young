import {
  type ChangeEvent,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useMemo,
} from 'react'
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react'
import { AlertTriangle, CheckCircle2, ChevronRight, Clock3, Info, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState as BaseEmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/field'
import { cn } from '@/lib/utils/cn'
import { formatDateTime } from '@/lib/utils/format'
import type { StatusDescriptor, StatusSeverity } from '@/domain/status'

function badgeTone(severity: StatusSeverity) {
  if (severity === 'success') return 'success' as const
  if (severity === 'warning') return 'warning' as const
  if (severity === 'danger') return 'danger' as const
  if (severity === 'info') return 'info' as const
  return 'neutral' as const
}

function stateSurface(state: 'default' | 'highlight' | 'warning' | 'danger') {
  if (state === 'highlight') return 'border-[rgba(79,124,255,0.22)] bg-primary-soft/35'
  if (state === 'warning') return 'border-[rgba(245,158,11,0.22)] bg-[rgba(245,158,11,0.08)]'
  if (state === 'danger') return 'border-[rgba(244,63,94,0.22)] bg-[rgba(244,63,94,0.08)]'
  return 'border-border-subtle bg-panel'
}

export function StatusBadge({
  label,
  severity,
  description,
  timestamp,
  className,
}: {
  label: string
  severity: StatusSeverity
  description?: string
  timestamp?: string
  className?: string
}) {
  const title = [description, timestamp ? formatDateTime(timestamp) : ''].filter(Boolean).join(' · ')

  return (
    <Badge tone={badgeTone(severity)} className={className} title={title || undefined}>
      <span className="status-dot bg-current/75" aria-hidden="true" />
      <span>{label}</span>
    </Badge>
  )
}

export function SectionCard({
  title,
  description,
  action,
  density = 'comfortable',
  state = 'default',
  className,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  density?: 'comfortable' | 'compact'
  state?: 'default' | 'highlight' | 'warning' | 'danger'
  className?: string
  children: ReactNode
}) {
  return (
    <Card
      className={cn(
        'space-y-4 rounded-[24px] border',
        density === 'compact' ? 'p-4' : 'p-5 md:p-6',
        stateSurface(state),
        className,
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-[-0.03em] text-text-primary">{title}</h2>
          {description ? (
            <p className="max-w-3xl text-sm leading-6 text-text-secondary">{description}</p>
          ) : null}
        </div>
        {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      {children}
    </Card>
  )
}

export function MetricCard({
  label,
  value,
  helperText,
  status,
  timestamp,
  trend,
  className,
}: {
  label: string
  value: string
  helperText?: string
  status?: ReactNode
  timestamp?: string
  trend?: string
  className?: string
}) {
  return (
    <Card className={cn('space-y-3 rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">{label}</p>
        {status}
      </div>
      <p className="metric-value text-[1.95rem] font-semibold leading-none tabular-nums text-text-primary">
        {value}
      </p>
      {helperText ? <p className="text-sm leading-6 text-text-secondary">{helperText}</p> : null}
      {timestamp || trend ? (
        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
          {trend ? <span>{trend}</span> : null}
          {timestamp ? (
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3.5" />
              {formatDateTime(timestamp)}
            </span>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}

export function StatusSummaryCard({
  title,
  descriptor,
  action,
}: {
  title: string
  descriptor: StatusDescriptor
  action?: ReactNode
}) {
  return (
    <SectionCard
      title={title}
      density="compact"
      state={
        descriptor.severity === 'danger'
          ? 'danger'
          : descriptor.severity === 'warning'
            ? 'warning'
            : descriptor.severity === 'success'
              ? 'highlight'
              : 'default'
      }
      action={action}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            label={descriptor.label}
            severity={descriptor.severity}
            description={descriptor.reason}
            timestamp={descriptor.lastUpdated}
          />
          {descriptor.lastUpdated ? (
            <span className="text-xs text-text-muted">{formatDateTime(descriptor.lastUpdated)}</span>
          ) : null}
        </div>
        {descriptor.reason ? <p className="text-sm leading-6 text-text-secondary">{descriptor.reason}</p> : null}
        {descriptor.nextAction ? (
          <div className="rounded-[18px] border border-border-subtle bg-bg-surface px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Next safe action</p>
            <p className="mt-2 text-sm leading-6 text-text-primary">{descriptor.nextAction}</p>
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[18px] bg-bg-surface px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Required checks</p>
            <p className="mt-2 text-sm text-text-primary">{descriptor.requiredChecks.length}</p>
          </div>
          <div className="rounded-[18px] bg-bg-surface px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Blocking checks</p>
            <p className="mt-2 text-sm text-text-primary">{descriptor.blockingChecks.length}</p>
          </div>
        </div>
        {descriptor.blockingChecks.length ? (
          <div className="space-y-2">
            {descriptor.blockingChecks.map((check) => (
              <div
                key={check}
                className="rounded-[16px] border border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.08)] px-3 py-2.5 text-sm text-text-secondary"
              >
                {check}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </SectionCard>
  )
}

export function EmptyState({
  title,
  description,
  primaryAction,
  secondaryAction,
  reason,
  requiredInputs,
}: {
  title: string
  description: string
  primaryAction?: ReactNode
  secondaryAction?: ReactNode
  reason?: string
  requiredInputs?: string[]
}) {
  return (
    <BaseEmptyState
      title={title}
      description={description}
      action={
        <div className="space-y-3">
          <div className="flex flex-wrap justify-center gap-2">
            {primaryAction}
            {secondaryAction}
          </div>
          {reason ? <p className="text-xs text-text-muted">{reason}</p> : null}
          {requiredInputs?.length ? (
            <p className="text-xs text-text-muted">
              Required inputs: {requiredInputs.join(' · ')}
            </p>
          ) : null}
        </div>
      }
      icon={reason ? <AlertTriangle className="size-6" /> : <Info className="size-6" />}
    />
  )
}

export function LoadingState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <Card className="space-y-4 rounded-[24px] border border-border-subtle p-6">
      <div className="flex items-center gap-2 text-text-secondary">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm font-medium">{title}</span>
      </div>
      <p className="text-sm leading-6 text-text-secondary">{description}</p>
    </Card>
  )
}

export function SkeletonList({
  count = 3,
  description,
}: {
  count?: number
  description: string
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">{description}</p>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="h-20 animate-pulse rounded-[22px] border border-border-subtle bg-app-bg-elevated"
        />
      ))}
    </div>
  )
}

export function FilterBar({
  children,
  className,
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-[24px] border border-border-subtle bg-panel p-4 lg:flex-row lg:flex-wrap lg:items-center',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Tabs({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: Array<{ value: string; label: string; disabled?: boolean; disabledReason?: string }>
  value: string
  onChange: (nextValue: string) => void
  ariaLabel: string
}) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return
    }

    event.preventDefault()

    const enabledItems = items.filter((item) => !item.disabled)
    const enabledIndex = enabledItems.findIndex((item) => item.value === value)

    if (event.key === 'Home') {
      onChange(enabledItems[0]?.value ?? value)
      return
    }

    if (event.key === 'End') {
      onChange(enabledItems.at(-1)?.value ?? value)
      return
    }

    const delta = event.key === 'ArrowRight' ? 1 : -1
    const nextItem =
      enabledItems[(enabledIndex + delta + enabledItems.length) % enabledItems.length]
    if (nextItem) {
      onChange(nextItem.value)
    }
  }

  return (
    <div
      className="flex flex-wrap gap-2 rounded-[22px] border border-border-subtle bg-app-bg-elevated p-1"
      role="tablist"
      tabIndex={0}
      aria-label={ariaLabel}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, index) => {
        const selected = item.value === value
        const tabId = `${ariaLabel.replace(/\s+/g, '-').toLowerCase()}-tab-${index}`
        const panelId = `${ariaLabel.replace(/\s+/g, '-').toLowerCase()}-panel-${index}`

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            id={tabId}
            aria-selected={selected}
            aria-controls={panelId}
            disabled={item.disabled}
            title={item.disabledReason}
            onClick={() => {
              if (!item.disabled) {
                onChange(item.value)
              }
            }}
            className={cn(
              'min-h-11 rounded-full px-4 py-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              selected
                ? 'bg-primary text-white shadow-[0_10px_22px_rgba(49,95,221,0.24)]'
                : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary',
              item.disabled ? 'cursor-not-allowed opacity-60' : '',
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

export function Stepper({
  steps,
  current,
  onStepChange,
}: {
  steps: Array<{ value: string; label: string; description?: string }>
  current: string
  onStepChange?: (value: string) => void
}) {
  const currentIndex = Math.max(0, steps.findIndex((step) => step.value === current))

  return (
    <ol className="grid gap-3 md:grid-cols-4">
      {steps.map((step, index) => {
        const active = step.value === current
        const complete = index < currentIndex
        return (
          <li key={step.value}>
            <button
              type="button"
              className={cn(
                'flex w-full min-h-16 items-start gap-3 rounded-[22px] border px-4 py-3 text-left transition',
                active
                  ? 'border-[rgba(79,124,255,0.24)] bg-primary-soft'
                  : complete
                    ? 'border-[rgba(34,197,94,0.22)] bg-[rgba(34,197,94,0.08)]'
                    : 'border-border-subtle bg-app-bg-elevated',
                onStepChange ? 'hover:border-border-strong' : 'cursor-default',
              )}
              onClick={() => onStepChange?.(step.value)}
            >
              <span
                className={cn(
                  'mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  active
                    ? 'bg-primary text-white'
                    : complete
                      ? 'bg-success text-[rgba(2,12,16,0.82)]'
                      : 'bg-bg-surface text-text-secondary',
                )}
              >
                {complete ? <CheckCircle2 className="size-4" /> : index + 1}
              </span>
              <span>
                <span className="block text-sm font-semibold text-text-primary">{step.label}</span>
                {step.description ? (
                  <span className="mt-1 block text-xs leading-5 text-text-secondary">{step.description}</span>
                ) : null}
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

export function FormField({
  label,
  helperText,
  errorText,
  disabledReason,
  required,
  children,
}: {
  label: string
  helperText?: string
  errorText?: string
  disabledReason?: string
  required?: boolean
  children: (props: {
    id: string
    'aria-describedby'?: string
    'aria-invalid'?: boolean
  }) => ReactNode
}) {
  const id = useId()
  const descriptionId = useMemo(() => `${id}-description`, [id])
  const helpBlocks = [helperText, errorText, disabledReason].filter(Boolean)

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-semibold text-text-primary">
        {label}
        {required ? <span className="ml-1 text-danger">*</span> : null}
      </label>
      {children({
        id,
        'aria-describedby': helpBlocks.length ? descriptionId : undefined,
        'aria-invalid': Boolean(errorText) || undefined,
      })}
      {helpBlocks.length ? (
        <div id={descriptionId} className="space-y-1">
          {helperText ? <p className="text-xs leading-5 text-text-muted">{helperText}</p> : null}
          {disabledReason ? <p className="text-xs leading-5 text-warning">{disabledReason}</p> : null}
          {errorText ? <p className="text-xs leading-5 text-danger">{errorText}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

export function StickyFooter({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('safe-bottom sticky bottom-0 z-20 -mx-4 mt-6 border-t border-border-subtle bg-panel/95 px-4 py-4 backdrop-blur md:mx-0 md:rounded-[24px]', className)}>
      {children}
    </div>
  )
}

export function RiskPreflightModal({
  open,
  onClose,
  title,
  description,
  summary,
  blockers,
  confirmLabel,
  onConfirm,
  confirmDisabled,
}: {
  open: boolean
  onClose: () => void
  title: string
  description: string
  summary: Array<{ label: string; value: string }>
  blockers: string[]
  confirmLabel: string
  onConfirm: () => void
  confirmDisabled?: boolean
}) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-[rgba(2,8,20,0.68)]" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 md:items-center">
          <DialogPanel className="panel-card w-full max-w-2xl space-y-5 rounded-[28px] p-6">
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-text-primary">{title}</h3>
              <p className="text-sm leading-6 text-text-secondary">{description}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {summary.map((item) => (
                <div key={item.label} className="rounded-[18px] border border-border-subtle bg-bg-surface px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">{item.label}</p>
                  <p className="mt-2 text-sm text-text-primary">{item.value}</p>
                </div>
              ))}
            </div>
            {blockers.length ? (
              <div className="space-y-2">
                {blockers.map((blocker) => (
                  <div
                    key={blocker}
                    className="rounded-[18px] border border-[rgba(244,63,94,0.2)] bg-[rgba(244,63,94,0.08)] px-4 py-3 text-sm text-text-secondary"
                  >
                    {blocker}
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="danger" onClick={onConfirm} disabled={confirmDisabled}>
                {confirmLabel}
              </Button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}

export function AuditTimeline({
  items,
}: {
  items: Array<{ id: string; title: string; detail?: string; timestamp?: string; tone?: StatusSeverity }>
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex gap-3">
          <span className={cn('mt-1 inline-flex size-2.5 shrink-0 rounded-full', item.tone === 'danger' ? 'bg-danger' : item.tone === 'warning' ? 'bg-warning' : item.tone === 'success' ? 'bg-success' : 'bg-info')} />
          <div className="min-w-0 space-y-1 rounded-[18px] border border-border-subtle bg-app-bg-elevated px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-text-primary">{item.title}</p>
              {item.timestamp ? <span className="text-xs text-text-muted">{formatDateTime(item.timestamp)}</span> : null}
            </div>
            {item.detail ? <p className="text-sm leading-6 text-text-secondary">{item.detail}</p> : null}
          </div>
        </div>
      ))}
    </div>
  )
}

export function EvidenceCard({
  title,
  sourceType,
  confidence,
  freshness,
  official,
  lastChecked,
  action,
}: {
  title: string
  sourceType: string
  confidence?: string
  freshness?: string
  official?: string
  lastChecked?: string
  action?: ReactNode
}) {
  return (
    <Card className="space-y-3 rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <p className="mt-1 text-sm text-text-secondary">{sourceType}</p>
        </div>
        {action}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <p className="text-sm text-text-secondary">Confidence: <span className="text-text-primary">{confidence ?? 'N/A'}</span></p>
        <p className="text-sm text-text-secondary">Freshness: <span className="text-text-primary">{freshness ?? 'N/A'}</span></p>
        <p className="text-sm text-text-secondary">Official: <span className="text-text-primary">{official ?? 'N/A'}</span></p>
        <p className="text-sm text-text-secondary">Last checked: <span className="text-text-primary">{lastChecked ?? 'N/A'}</span></p>
      </div>
    </Card>
  )
}

export function CalculationCard({
  title,
  inputs,
  result,
  assumptions,
  source,
  timestamp,
}: {
  title: string
  inputs: string
  result: string
  assumptions?: string
  source?: string
  timestamp?: string
}) {
  return (
    <Card className="space-y-4 rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">{title}</p>
          <p className="mt-1 text-sm leading-6 text-text-secondary">{inputs}</p>
        </div>
        <div className="rounded-[18px] border border-border-subtle bg-bg-surface px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Result</p>
          <p className="mt-2 text-sm font-semibold text-text-primary">{result}</p>
        </div>
      </div>
      {assumptions || source || timestamp ? (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-[18px] bg-bg-surface px-4 py-3 text-sm text-text-secondary">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Assumptions</p>
            <p className="mt-2">{assumptions ?? 'N/A'}</p>
          </div>
          <div className="rounded-[18px] bg-bg-surface px-4 py-3 text-sm text-text-secondary">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Source</p>
            <p className="mt-2">{source ?? 'N/A'}</p>
          </div>
          <div className="rounded-[18px] bg-bg-surface px-4 py-3 text-sm text-text-secondary">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-muted">Timestamp</p>
            <p className="mt-2">{timestamp ? formatDateTime(timestamp) : 'N/A'}</p>
          </div>
        </div>
      ) : null}
    </Card>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  placeholder: string
}) {
  return (
    <div className="min-w-[220px] flex-1">
      <Input value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  )
}

export function InlineList({
  items,
  empty,
}: {
  items: string[]
  empty: string
}) {
  return items.length ? (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div key={item} className="rounded-full border border-border-subtle bg-bg-surface px-3 py-1.5 text-sm text-text-secondary">
          {item}
        </div>
      ))}
    </div>
  ) : (
    <p className="text-sm text-text-secondary">{empty}</p>
  )
}

export function NextActionList({
  actions,
}: {
  actions: Array<{ id: string; label: string; detail?: string; action?: ReactNode }>
}) {
  return (
    <div className="space-y-3">
      {actions.map((item) => (
        <div key={item.id} className="flex items-start justify-between gap-3 rounded-[20px] border border-border-subtle bg-app-bg-elevated px-4 py-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary">
              <ChevronRight className="size-4 text-info" />
              {item.label}
            </div>
            {item.detail ? <p className="text-sm leading-6 text-text-secondary">{item.detail}</p> : null}
          </div>
          {item.action}
        </div>
      ))}
    </div>
  )
}
