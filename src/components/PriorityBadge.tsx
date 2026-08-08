import { PRIORITY_META } from '@/lib/domain'
import type { Priority } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { DomainBadge, type BadgeSize } from './DomainBadge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export interface PriorityBadgeProps {
  priority: Priority
  size?: BadgeSize
  showIcon?: boolean
  /** Adds a subtle pulse to `critical` so it is impossible to miss in a list. */
  emphasiseCritical?: boolean
  withTooltip?: boolean
  className?: string
}

/** Priority badge on an escalating low → critical colour ramp. */
export function PriorityBadge({
  priority,
  size = 'md',
  showIcon = true,
  emphasiseCritical = true,
  withTooltip = false,
  className,
}: PriorityBadgeProps) {
  const meta = PRIORITY_META[priority]
  const badge = (
    <DomainBadge
      label={meta.label}
      icon={meta.icon}
      showIcon={showIcon}
      size={size}
      className={cn(
        meta.badgeClass,
        priority === 'critical' && emphasiseCritical && 'font-semibold',
        className,
      )}
    />
  )

  if (!withTooltip) return badge

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{badge}</span>
      </TooltipTrigger>
      <TooltipContent>
        <span className="font-medium">
          {meta.label} · {meta.slaHint}
        </span>
        <span className="opacity-80">— {meta.description}</span>
      </TooltipContent>
    </Tooltip>
  )
}
