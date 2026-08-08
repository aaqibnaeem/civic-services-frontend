import { STATUS_META } from '@/lib/domain'
import type { Status } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { DomainBadge, type BadgeSize } from './DomainBadge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export interface StatusBadgeProps {
  status: Status
  size?: BadgeSize
  showIcon?: boolean
  /** Render as a coloured dot + text, which reads better inside dense tables. */
  dot?: boolean
  withTooltip?: boolean
  className?: string
}

/** Lifecycle status badge: open → assigned → in progress → resolved / rejected. */
export function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
  dot = false,
  withTooltip = false,
  className,
}: StatusBadgeProps) {
  const meta = STATUS_META[status]
  const badge = (
    <DomainBadge
      label={meta.label}
      icon={meta.icon}
      showIcon={!dot && showIcon}
      dotClass={dot ? meta.dotClass : undefined}
      size={size}
      className={cn(meta.badgeClass, className)}
    />
  )

  if (!withTooltip) return badge

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{badge}</span>
      </TooltipTrigger>
      <TooltipContent>
        <span className="font-medium">{meta.label}</span>
        <span className="opacity-80">— {meta.description}</span>
      </TooltipContent>
    </Tooltip>
  )
}
