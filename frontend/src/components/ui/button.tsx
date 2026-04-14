import { forwardRef, type ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'button-primary-surface border text-white',
  secondary:
    'button-secondary-surface border border-border-subtle text-text-primary hover:border-border-strong',
  ghost:
    'button-ghost-surface border border-transparent bg-transparent text-text-secondary hover:text-text-primary',
  danger:
    'button-danger-surface border border-[rgba(244,63,94,0.32)] text-danger',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 rounded-2xl px-3.5 text-[13px]',
  md: 'min-h-11 rounded-[18px] px-5 text-sm',
  lg: 'min-h-12 rounded-[18px] px-6 text-[15px]',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, size = 'md', style, variant = 'primary', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      style={style}
      className={cn(
        'interactive-lift inline-flex items-center justify-center gap-2 font-medium tracking-[-0.01em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-page disabled:pointer-events-none disabled:opacity-55',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
})
