import { CONFIDENCE_BAND_META, confidenceBand, formatPercent } from '@/lib/domain'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export interface ConfidenceMeterProps {
  /** 0..1 as returned in `AIAnalysis.confidence`. */
  value: number
  /** Compact: a slim inline bar. Default: bar + label + percentage. */
  variant?: 'default' | 'compact'
  showLabel?: boolean
  showValue?: boolean
  className?: string
}

/**
 * Renders the AI's self-reported confidence as a banded meter.
 *
 * The band (high / moderate / low) is the honest headline — a raw "0.91" implies
 * a precision the model does not have, so the number is secondary.
 */
export function ConfidenceMeter({
  value,
  variant = 'default',
  showLabel = true,
  showValue = true,
  className,
}: ConfidenceMeterProps) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
  const band = confidenceBand(clamped)
  const meta = CONFIDENCE_BAND_META[band]
  const pct = formatPercent(clamped)

  const bar = (
    <div
      role="meter"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`AI confidence: ${meta.label}`}
      className={cn(
        'relative w-full overflow-hidden rounded-full bg-muted',
        variant === 'compact' ? 'h-1' : 'h-1.5',
      )}
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', meta.barClass)}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  )

  if (variant === 'compact') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex w-full min-w-16 items-center gap-2', className)}>
            {bar}
            {showValue && (
              <span className="tabular text-[0.6875rem] text-muted-foreground">{pct}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <span className="font-medium">{meta.label}</span>
          <span className="opacity-80">— {meta.hint}</span>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className={cn('w-full space-y-1.5', className)}>
      {(showLabel || showValue) && (
        <div className="flex items-baseline justify-between gap-3">
          {showLabel && (
            <span className={cn('text-xs font-medium', meta.textClass)}>{meta.label}</span>
          )}
          {showValue && (
            <span className="tabular text-xs text-muted-foreground">{pct}</span>
          )}
        </div>
      )}
      {bar}
      {showLabel && <p className="text-xs text-muted-foreground">{meta.hint}</p>}
    </div>
  )
}
