import type { ReactNode } from 'react'
import { DatabaseZap } from 'lucide-react'

import { Card } from '@/components/ui/card'

interface EmptyStateProps {
  title: string
  description: string
  action?: ReactNode
  icon?: ReactNode
}

export function EmptyState({
  action,
  description,
  icon,
  title,
}: EmptyStateProps) {
  return (
    <Card className="flex min-h-56 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="rounded-full border border-border-subtle bg-app-bg-elevated p-4 text-gold-primary">
        {icon ?? <DatabaseZap className="size-6" />}
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        <p className="max-w-md text-sm leading-6 text-text-secondary">{description}</p>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </Card>
  )
}
