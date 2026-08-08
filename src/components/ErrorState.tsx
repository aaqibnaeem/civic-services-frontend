import type { ReactNode } from 'react'
import { RefreshCw, ServerCrash, SearchX, ShieldAlert, WifiOff } from 'lucide-react'

import { ApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface ErrorStateProps {
  /** Anything thrown by the API layer. `ApiError` gets a tailored message. */
  error?: unknown
  title?: string
  description?: ReactNode
  onRetry?: () => void
  retryLabel?: string
  action?: ReactNode
  variant?: 'card' | 'plain'
  className?: string
}

function describe(error: unknown): {
  title: string
  description: string
  icon: typeof ServerCrash
} {
  if (error instanceof ApiError) {
    if (error.isNetworkError) {
      return {
        title: 'Cannot reach the server',
        description:
          'The API did not respond. Check that the backend is running and your connection is live.',
        icon: WifiOff,
      }
    }
    if (error.isNotFound) {
      return {
        title: 'Not found',
        description: error.message,
        icon: SearchX,
      }
    }
    if (error.isUnauthorized || error.isForbidden) {
      return {
        title: 'Access denied',
        description: error.message,
        icon: ShieldAlert,
      }
    }
    if (error.isAiUnavailable) {
      return {
        title: 'AI service unavailable',
        description:
          'Every analyzer tier is down right now. Complaint data is unaffected — try again shortly.',
        icon: ServerCrash,
      }
    }
    return { title: 'Something went wrong', description: error.toUserMessage(), icon: ServerCrash }
  }

  return {
    title: 'Something went wrong',
    description:
      error instanceof Error && error.message
        ? error.message
        : 'An unexpected error occurred. Please try again.',
    icon: ServerCrash,
  }
}

/** The house error state. Pair with `<EmptyState/>` so failures never look blank. */
export function ErrorState({
  error,
  title,
  description,
  onRetry,
  retryLabel = 'Try again',
  action,
  variant = 'card',
  className,
}: ErrorStateProps) {
  const fallback = describe(error)
  const Icon = fallback.icon
  const requestId = error instanceof ApiError ? error.requestId : null

  return (
    <div
      role="alert"
      className={cn(
        'flex w-full flex-col items-center justify-center px-6 py-12 text-center',
        variant === 'card' && 'rounded-xl border border-destructive/25 bg-destructive/5',
        className,
      )}
    >
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl border border-destructive/25 bg-destructive/10 text-destructive">
        <Icon className="size-5" aria-hidden strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title ?? fallback.title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-balance text-muted-foreground">
        {description ?? fallback.description}
      </p>
      {(onRetry || action) && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="size-4" aria-hidden />
              {retryLabel}
            </Button>
          ) : null}
          {action}
        </div>
      )}
      {requestId ? (
        <p className="mt-4 font-mono text-[0.6875rem] text-muted-foreground/70">
          request id: {requestId}
        </p>
      ) : null}
    </div>
  )
}
