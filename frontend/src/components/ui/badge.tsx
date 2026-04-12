import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

const toneClasses = {
  neutral: 'border border-border-subtle bg-[rgba(19,34,58,0.84)] text-text-secondary',
  gold: 'border border-[rgba(139,92,246,0.24)] bg-[rgba(139,92,246,0.14)] text-accent-violet',
  primary: 'border border-[rgba(79,124,255,0.28)] bg-[rgba(79,124,255,0.14)] text-primary-hover',
  success: 'border border-[rgba(34,197,94,0.26)] bg-[rgba(20,184,122,0.14)] text-success',
  warning: 'border border-[rgba(245,158,11,0.26)] bg-[rgba(245,158,11,0.14)] text-warning',
  danger: 'border border-[rgba(244,63,94,0.3)] bg-[rgba(244,63,94,0.14)] text-danger',
  info: 'border border-[rgba(34,211,238,0.28)] bg-[rgba(34,211,238,0.12)] text-info',
} as const

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof toneClasses
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.02em]',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}
