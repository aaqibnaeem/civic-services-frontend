import { ROLE_META } from '@/lib/domain'
import type { Role } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { DomainBadge, type BadgeSize } from '@/components/DomainBadge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

export interface RoleBadgeProps {
  role: Role
  size?: BadgeSize
  showIcon?: boolean
  withTooltip?: boolean
  className?: string
}

/**
 * Which account is driving the console.
 *
 * Staff and administrators see the same screens but not the same permissions —
 * only an administrator can delete. Showing the role in the shell means the
 * difference is visible up front rather than discovered through a 403 partway
 * through an action, and it makes the two accounts obviously distinct in a demo.
 */
export function RoleBadge({
  role,
  size = 'sm',
  showIcon = true,
  withTooltip = true,
  className,
}: RoleBadgeProps) {
  const meta = ROLE_META[role]
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
        <span className="block font-semibold">Signed in as {meta.label}</span>
        <span className="block leading-relaxed opacity-90">{meta.capabilities}</span>
      </TooltipContent>
    </Tooltip>
  )
}
