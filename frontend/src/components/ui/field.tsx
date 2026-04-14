import {
  Children,
  forwardRef,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { createPortal } from 'react-dom'

import { cn } from '@/lib/utils/cn'

const baseFieldClassName =
  'control-focus control-surface w-full rounded-[18px] border border-border-subtle px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(baseFieldClassName, className)} {...props} />
  },
)

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(baseFieldClassName, 'min-h-28 resize-y py-3.5', className)}
      {...props}
    />
  )
})

interface SelectOptionDefinition {
  value: string
  label: string
  disabled?: boolean
}

interface CustomSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string
}

interface SelectMenuPosition {
  left: number
  top: number
  width: number
  maxHeight: number
}

export const Select = forwardRef<HTMLSelectElement, CustomSelectProps>(
  function Select(
    { children, className, disabled, id, name, onChange, placeholder, value, ...props },
    ref,
  ) {
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const menuRef = useRef<HTMLDivElement>(null)
    const [menuPosition, setMenuPosition] = useState<SelectMenuPosition | null>(null)

    const options = useMemo<SelectOptionDefinition[]>(
      () =>
        Children.toArray(children).flatMap((child) => {
          if (!isValidElement(child)) {
            return []
          }

          const optionProps = child.props as {
            value?: string
            children?: unknown
            disabled?: boolean
          }
          const optionValue = optionProps.value
          const optionLabel =
            typeof optionProps.children === 'string'
              ? optionProps.children
              : String(optionProps.children ?? optionValue)

          return [
            {
              value: String(optionValue ?? ''),
              label: optionLabel,
              disabled: Boolean(optionProps.disabled),
            },
          ]
        }),
      [children],
    )

    const selectedOption =
      options.find((option) => option.value === String(value ?? '')) ?? options[0]

    useEffect(() => {
      if (!open) {
        return
      }

      const handlePointerDown = (event: PointerEvent) => {
        const target = event.target as Node
        if (
          !containerRef.current?.contains(target) &&
          !menuRef.current?.contains(target)
        ) {
          setOpen(false)
        }
      }

      window.addEventListener('pointerdown', handlePointerDown)
      return () => window.removeEventListener('pointerdown', handlePointerDown)
    }, [open])

    useLayoutEffect(() => {
      if (!open || typeof window === 'undefined') {
        return
      }

      const updateMenuPosition = () => {
        const rect = triggerRef.current?.getBoundingClientRect()
        if (!rect) {
          return
        }

        const viewportPadding = 16
        const menuGap = 8
        const minimumMenuHeight = 180
        const preferredMenuHeight = 320
        const spaceBelow = window.innerHeight - rect.bottom - viewportPadding
        const spaceAbove = rect.top - viewportPadding
        const placeAbove =
          spaceBelow < minimumMenuHeight && spaceAbove > spaceBelow

        const maxHeight = Math.max(
          140,
          Math.min(placeAbove ? spaceAbove - menuGap : spaceBelow - menuGap, preferredMenuHeight),
        )

        setMenuPosition({
          left: rect.left,
          top: placeAbove
            ? Math.max(viewportPadding, rect.top - maxHeight - menuGap)
            : rect.bottom + menuGap,
          width: rect.width,
          maxHeight,
        })
      }

      updateMenuPosition()

      window.addEventListener('resize', updateMenuPosition)
      window.addEventListener('scroll', updateMenuPosition, true)
      return () => {
        window.removeEventListener('resize', updateMenuPosition)
        window.removeEventListener('scroll', updateMenuPosition, true)
      }
    }, [open])

    const emitChange = (nextValue: string) => {
      if (disabled) {
        return
      }

      onChange?.({
        target: { name: name ?? '', value: nextValue },
        currentTarget: { name: name ?? '', value: nextValue },
      } as ChangeEvent<HTMLSelectElement>)

      setOpen(false)
    }

    return (
      <div ref={containerRef} className="relative">
        <button
          ref={triggerRef}
          type="button"
          id={id}
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            baseFieldClassName,
            'interactive-lift flex items-center justify-between gap-3 pr-11 text-left',
            className,
          )}
          onClick={() => setOpen((current) => !current)}
        >
          <span
            className={cn(
              selectedOption ? 'text-text-primary' : 'text-text-muted',
              'truncate',
            )}
          >
            {selectedOption?.label ?? placeholder ?? 'Select'}
          </span>
          <ChevronDown
            className={cn(
              'pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-text-muted transition-transform',
              open ? 'rotate-180 text-primary' : '',
            )}
          />
        </button>

        <select
          ref={ref}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
          disabled={disabled}
          id={id ? `${id}__native` : undefined}
          name={name}
          onChange={onChange}
          value={value}
          {...props}
        >
          {children}
        </select>

        {open && menuPosition && typeof document !== 'undefined'
          ? createPortal(
              <div
                ref={menuRef}
                className="menu-surface fixed z-[90] rounded-[22px] border border-border-subtle p-2"
                style={{
                  left: menuPosition.left,
                  top: menuPosition.top,
                  width: menuPosition.width,
                }}
              >
                <div
                  className="space-y-1 overflow-y-auto"
                  style={{ maxHeight: menuPosition.maxHeight }}
                  role="listbox"
                  aria-labelledby={id}
                >
                  {options.map((option) => {
                    const isActive = option.value === String(value ?? '')

                    return (
                      <button
                        key={`${name ?? id ?? 'select'}-${option.value}`}
                        type="button"
                        role="option"
                        aria-selected={isActive}
                        disabled={option.disabled}
                        onClick={() => emitChange(option.value)}
                        className={cn(
                          'interactive-lift flex w-full items-center justify-between rounded-2xl border border-transparent px-3 py-2.5 text-left text-sm transition',
                          option.disabled
                            ? 'cursor-not-allowed opacity-50'
                            : isActive
                              ? 'border-[var(--control-border-focus)] bg-primary-soft text-text-primary'
                              : 'text-text-secondary hover:bg-app-bg-elevated hover:text-text-primary',
                        )}
                      >
                        <span className="truncate">{option.label}</span>
                        {isActive ? (
                          <Check className="ml-3 size-4 shrink-0 text-primary" />
                        ) : null}
                      </button>
                    )
                  })}
                </div>
              </div>,
              document.body,
            )
          : null}
      </div>
    )
  },
)
