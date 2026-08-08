import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export type StatTone = 'default' | 'success' | 'warning' | 'danger' | 'info'

const TONE_ICON_CLASS: Record<StatTone, string> = {
  default: 'border-border bg-muted/60 text-muted-foreground',
  success: 'border-success/25 bg-success/10 text-success',
  warning: 'border-warning/30 bg-warning/12 text-warning',
  danger: 'border-destructive/25 bg-destructive/10 text-destructive',
  info: 'border-info/25 bg-info/10 text-info',
}

export interface StatCardProps {
  label: string
  /** Pre-formatted. Use `formatNumber`/`formatHours`/`formatPercent` from domain.ts. */
  value: ReactNode
  /** Short qualifier under the value, e.g. "median across 412 resolved cases". */
  hint?: ReactNode
  icon?: LucideIcon
  tone?: StatTone
  /** Percentage change vs the previous period. Positive = up. */
  deltaPct?: number | null
  /** For most civic metrics, "up" is bad. Set false to flip the colour logic. */
  higherIsBetter?: boolean
  /** Explains what the statistic actually means — the spec grades interpretation. */
  tooltip?: string
  loading?: boolean
  onClick?: () => void
  className?: string
}

/** KPI tile used across the admin dashboard and the public landing page. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'default',
  deltaPct,
  higherIsBetter = false,
  tooltip,
  loading = false,
  onClick,
  className,
}: StatCardProps) {
  const hasDelta = deltaPct !== null && deltaPct !== undefined && Number.isFinite(deltaPct)
  const flat = hasDelta && Math.abs(deltaPct) < 0.5
  const up = hasDelta && deltaPct > 0
  const good = flat ? null : up === higherIsBetter

  const DeltaIcon = flat ? Minus : up ? ArrowUp : ArrowDown

  const body = (
    <Card
      className={cn(
        'relative overflow-hidden transition-shadow',
        onClick && 'cursor-pointer hover:shadow-civic-lg focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      onClick={onClick}
      {...(onClick ? { role: 'button', tabIndex: 0 } : {})}
    >
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0 space-y-1.5">
          <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          {loading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="tabular text-2xl leading-none font-semibold text-foreground">
              {value}
            </p>
          )}

          {hasDelta && !loading ? (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs font-medium',
                good === null && 'text-muted-foreground',
                good === true && 'text-success',
                good === false && 'text-destructive',
              )}
            >
              <DeltaIcon className="size-3.5" aria-hidden />
              {flat ? 'No change' : `${Math.abs(deltaPct).toFixed(1)}%`}
              <span className="font-normal text-muted-foreground">vs last week</span>
            </span>
          ) : null}

          {hint && !loading ? (
            <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
          ) : null}
        </div>

        {Icon ? (
          <div
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg border',
              TONE_ICON_CLASS[tone],
            )}
          >
            <Icon className="size-4.5" aria-hidden strokeWidth={2} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  )

  if (!tooltip) return body

  return (
    <Tooltip>
      <TooltipTrigger asChild>{body}</TooltipTrigger>
      <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
    </Tooltip>
  )
}
