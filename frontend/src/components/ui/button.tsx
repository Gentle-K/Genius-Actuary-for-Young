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
    'border border-[rgba(107,146,255,0.72)] bg-primary text-white shadow-[0_14px_34px_rgba(44,87,190,0.34)] hover:border-[rgba(139,165,255,0.8)] hover:bg-primary-hover hover:shadow-[0_18px_40px_rgba(44,87,190,0.42)]',
  secondary:
    'border border-border-subtle bg-[rgba(15,27,49,0.78)] text-text-primary hover:border-border-strong hover:bg-[rgba(19,34,58,0.94)]',
  ghost:
    'border border-transparent bg-transparent text-text-secondary hover:bg-[rgba(79,124,255,0.12)] hover:text-text-primary',
  danger:
    'border border-[rgba(244,63,94,0.32)] bg-[rgba(244,63,94,0.1)] text-danger hover:bg-[rgba(244,63,94,0.16)]',
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
