import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-3">
        {eyebrow ? <p className="apple-kicker">{eyebrow}</p> : null}
        <h1 className="text-balance max-w-[18ch] text-[2.2rem] font-semibold leading-[0.94] tracking-[-0.06em] text-text-primary md:text-[3.25rem]">
          {title}
        </h1>
        <p className="max-w-4xl text-[15px] leading-7 text-text-secondary md:text-[16px]">
          {description}
        </p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  )
}
