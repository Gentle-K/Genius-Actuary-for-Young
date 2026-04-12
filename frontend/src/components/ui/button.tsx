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
    'bg-gold-primary text-white shadow-[0_14px_32px_rgba(70,106,84,0.22)] hover:bg-gold-bright hover:shadow-[0_18px_40px_rgba(70,106,84,0.26)]',
  secondary:
    'border border-border-subtle bg-panel text-text-primary hover:border-border-strong hover:bg-panel-strong',
  ghost:
    'border border-transparent bg-transparent text-text-secondary hover:bg-brand-soft hover:text-text-primary',
  danger:
    'border border-[rgba(181,86,77,0.22)] bg-[rgba(181,86,77,0.1)] text-danger hover:bg-[rgba(181,86,77,0.16)]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 rounded-full px-3.5 text-[13px]',
  md: 'min-h-11 rounded-full px-5 text-sm',
  lg: 'min-h-12 rounded-full px-6 text-[15px]',
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
        'interactive-lift inline-flex items-center justify-center gap-2 font-medium tracking-[-0.01em] transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg disabled:pointer-events-none disabled:opacity-55',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
})
