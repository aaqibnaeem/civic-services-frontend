import type { ReactNode } from 'react'
import { Inbox, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  /** Primary call to action — a <Button/> or a <Link/>. */
  action?: ReactNode
  /** Secondary hint below the action, e.g. "Try clearing your filters". */
  footer?: ReactNode
  /** `card` draws a dashed container; `plain` sits inside one you already have. */
  variant?: 'card' | 'plain'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const PADDING: Record<NonNullable<EmptyStateProps['size']>, string> = {
  sm: 'px-4 py-8',
  md: 'px-6 py-12',
  lg: 'px-6 py-20',
}

/**
 * The house empty state. Every list, search and detail page should use this so
 * "no data" always looks intentional rather than broken.
 */
export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  footer,
  variant = 'card',
  size = 'md',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center text-center',
        PADDING[size],
        variant === 'card' && 'rounded-xl border border-dashed bg-card/40',
        className,
      )}
    >
      <div className="mb-4 flex size-11 items-center justify-center rounded-xl border bg-muted/60 text-muted-foreground">
        <Icon className="size-5" aria-hidden strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-balance text-muted-foreground">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
      {footer ? <div className="mt-4 text-xs text-muted-foreground">{footer}</div> : null}
    </div>
  )
}
