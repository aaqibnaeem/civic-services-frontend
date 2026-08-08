import { AI_SOURCE_META } from '@/lib/domain'
import type { AISource } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { DomainBadge, type BadgeSize } from './DomainBadge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export interface AiSourceBadgeProps {
  source: AISource
  size?: BadgeSize
  /** Optional model name, e.g. `deepseek-v4-flash`, shown inside the tooltip. */
  modelName?: string | null
  latencyMs?: number | null
  showIcon?: boolean
  /** Set false only where a tooltip is impossible (e.g. inside another tooltip). */
  withTooltip?: boolean
  className?: string
}

/**
 * Which analyzer tier produced a result — CONTRACT §5.3 requires this to be
 * surfaced honestly, never dressed up as the LLM. The tooltip explains what the
 * tier means and how much to trust it.
 */
export function AiSourceBadge({
  source,
  size = 'sm',
  modelName,
  latencyMs,
  showIcon = true,
  withTooltip = true,
  className,
}: AiSourceBadgeProps) {
  const meta = AI_SOURCE_META[source]
  const badge = (
    <DomainBadge
      label={meta.label}
      icon={meta.icon}
      showIcon={showIcon}
      size={size}
      className={cn(meta.badgeClass, 'font-medium tracking-tight', className)}
    />
  )

  if (!withTooltip) return badge

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help">{badge}</span>
      </TooltipTrigger>
      <TooltipContent className="block max-w-xs space-y-1.5 py-2">
        <span className="block font-semibold">
          Tier {meta.tier} · {meta.label}
        </span>
        <span className="block leading-relaxed opacity-90">{meta.tooltip}</span>
        {(modelName || latencyMs != null) && (
          <span className="block font-mono text-[0.6875rem] opacity-70">
            {modelName}
            {modelName && latencyMs != null ? ' · ' : ''}
            {latencyMs != null ? `${latencyMs} ms` : ''}
          </span>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
