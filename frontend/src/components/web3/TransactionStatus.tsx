interface TransactionStatusProps {
  status: 'idle' | 'signing' | 'submitted' | 'pending' | 'confirmed' | 'failed'
  txHash?: string
  explorerUrl?: string
  blockNumber?: number
  errorMessage?: string
  className?: string
}

const STATUS_CONFIG = {
  idle: {
    label: 'Ready',
    dot: 'bg-neutral-500',
    text: 'text-neutral-300',
    bg: 'bg-neutral-900/40',
  },
  signing: {
    label: 'Awaiting Signature',
    dot: 'bg-blue-400 animate-pulse',
    text: 'text-blue-300',
    bg: 'bg-blue-900/20',
  },
  submitted: {
    label: 'Submitted',
    dot: 'bg-amber-400 animate-pulse',
    text: 'text-amber-300',
    bg: 'bg-amber-900/20',
  },
  pending: {
    label: 'Pending Confirmation',
    dot: 'bg-amber-400 animate-pulse',
    text: 'text-amber-300',
    bg: 'bg-amber-900/20',
  },
  confirmed: {
    label: 'Confirmed',
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
    bg: 'bg-emerald-900/20',
  },
  failed: {
    label: 'Failed',
    dot: 'bg-red-400',
    text: 'text-red-300',
    bg: 'bg-red-900/20',
  },
} as const

export function TransactionStatus({
  status,
  txHash,
  explorerUrl,
  blockNumber,
  errorMessage,
  className = '',
}: TransactionStatusProps) {
  const config = STATUS_CONFIG[status]

  return (
    <div
      className={`rounded-lg border border-neutral-700/50 p-3 ${config.bg} ${className}`}
    >
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${config.dot}`} />
        <span className={`text-sm font-medium ${config.text}`}>{config.label}</span>
        {blockNumber != null ? (
          <span className="ml-auto text-xs text-neutral-500">Block #{blockNumber}</span>
        ) : null}
      </div>

      {txHash ? (
        <div className="mt-2">
          {explorerUrl ? (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block break-all font-mono text-xs text-blue-400 underline decoration-blue-400/30 transition-colors hover:text-blue-300"
            >
              {txHash}
            </a>
          ) : (
            <span className="inline-block break-all font-mono text-xs text-neutral-300">
              {txHash}
            </span>
          )}
        </div>
      ) : null}

      {errorMessage && status === 'failed' ? (
        <p className="mt-2 text-xs text-red-300">{errorMessage}</p>
      ) : null}
    </div>
  )
}
