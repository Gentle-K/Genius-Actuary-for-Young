import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

const toneClasses = {
  neutral: 'border border-border-subtle bg-brand-soft/40 text-text-secondary',
  gold: 'border border-[rgba(70,106,84,0.18)] bg-[rgba(70,106,84,0.12)] text-gold-primary',
  success: 'border border-[rgba(45,118,80,0.18)] bg-[rgba(45,118,80,0.12)] text-success',
  warning: 'border border-[rgba(185,115,44,0.18)] bg-[rgba(185,115,44,0.12)] text-warning',
  danger: 'border border-[rgba(181,86,77,0.18)] bg-[rgba(181,86,77,0.12)] text-danger',
  info: 'border border-[rgba(79,122,134,0.18)] bg-[rgba(79,122,134,0.12)] text-info',
} as const

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof toneClasses
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.01em]',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}
