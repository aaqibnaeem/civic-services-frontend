import { CATEGORY_META } from '@/lib/domain'
import type { Category } from '@/lib/api/types'
import { DomainBadge, type BadgeSize } from './DomainBadge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export interface CategoryBadgeProps {
  category: Category
  size?: BadgeSize
  /** Use the short label ("Roads") — for table cells and chart legends. */
  short?: boolean
  showIcon?: boolean
  iconOnly?: boolean
  /** Explain what the category covers on hover. */
  withTooltip?: boolean
  className?: string
}

/**
 * The canonical way to render a complaint category. Labels come from
 * CONTRACT §1 ("Roads & Potholes", not "road").
 */
export function CategoryBadge({
  category,
  size = 'md',
  short = false,
  showIcon = true,
  iconOnly = false,
  withTooltip = false,
  className,
}: CategoryBadgeProps) {
  const meta = CATEGORY_META[category]
  const badge = (
    <DomainBadge
      label={short ? meta.short : meta.label}
      title={meta.label}
      icon={meta.icon}
      showIcon={showIcon}
      iconOnly={iconOnly}
      size={size}
      className={`${meta.badgeClass} ${className ?? ''}`}
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
