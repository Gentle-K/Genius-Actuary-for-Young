import { cn } from '@/lib/utils/cn'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-2xl bg-[linear-gradient(90deg,rgba(255,255,255,0.02),rgba(79,124,255,0.12),rgba(255,255,255,0.02))] bg-[length:200%_100%]',
        className,
      )}
    />
  )
}
