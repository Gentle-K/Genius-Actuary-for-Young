import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils/cn'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
  primaryAction?: ReactNode
  secondaryActions?: ReactNode
  statusBadges?: ReactNode
  backLink?: ReactNode
}

function normalizeHeaderLabel(value?: string) {
  return value?.trim().replace(/\s+/g, ' ') ?? ''
}

export function PageContainer({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mx-auto flex min-w-0 max-w-[1440px] flex-col gap-6 lg:gap-8', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function PageSection({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn('min-w-0', className)} {...props}>
      {children}
    </section>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  primaryAction,
  secondaryActions,
  statusBadges,
  backLink,
}: PageHeaderProps) {
  const showEyebrow =
    normalizeHeaderLabel(eyebrow).length > 0 &&
    normalizeHeaderLabel(eyebrow) !== normalizeHeaderLabel(title)
  const resolvedActions =
    actions ?? (
      <>
        {secondaryActions}
        {primaryAction}
      </>
    )

  return (
    <div className="flex min-w-0 flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0 space-y-3">
        {backLink ? <div>{backLink}</div> : null}
        {showEyebrow ? <p className="apple-kicker">{eyebrow}</p> : null}
        <h1 className="text-balance max-w-[18ch] text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[0.94] tracking-[-0.06em] text-text-primary">
          {title}
        </h1>
        <p className="max-w-4xl text-[15px] leading-7 text-text-secondary md:text-base">
          {description}
        </p>
        {statusBadges ? (
          <div className="flex flex-wrap items-center gap-2">{statusBadges}</div>
        ) : null}
      </div>
      {resolvedActions ? (
        <div className="flex min-w-0 flex-wrap items-center gap-3 xl:justify-end">
          {resolvedActions}
        </div>
      ) : null}
    </div>
  )
}
