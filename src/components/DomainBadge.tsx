/**
 * Internal base for every domain badge (category / priority / status / AI tier).
 *
 * Pages should not use this directly — use `<CategoryBadge/>` etc. so labels and
 * colours stay in one place. Sizes are fixed on purpose: three options is enough
 * and it keeps tables visually aligned.
 */

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type BadgeSize = 'sm' | 'md' | 'lg'

const SIZE_CLASS: Record<BadgeSize, string> = {
  sm: 'h-5 gap-1 px-1.5 text-[0.6875rem]',
  md: 'h-6 gap-1.5 px-2 text-xs',
  lg: 'h-7 gap-1.5 px-2.5 text-sm',
}

const ICON_CLASS: Record<BadgeSize, string> = {
  sm: 'size-3',
  md: 'size-3.5',
  lg: 'size-4',
}

export interface DomainBadgeProps {
  label: string
  icon?: LucideIcon
  /** Tinted border/background/foreground triple from `@/lib/domain`. */
  className?: string
  size?: BadgeSize
  /** Hide the icon (dense tables). */
  iconOnly?: boolean
  showIcon?: boolean
  /** Small leading dot instead of an icon — good for chart legends. */
  dotClass?: string
  children?: ReactNode
  title?: string
}

export function DomainBadge({
  label,
  icon: Icon,
  className,
  size = 'md',
  iconOnly = false,
  showIcon = true,
  dotClass,
  children,
  title,
}: DomainBadgeProps) {
  return (
    <span
      data-slot="domain-badge"
      title={title ?? label}
      className={cn(
        'inline-flex w-fit shrink-0 items-center justify-center rounded-full border font-medium whitespace-nowrap',
        'transition-colors [&>svg]:shrink-0',
        SIZE_CLASS[size],
        iconOnly && 'aspect-square px-0',
        className,
      )}
    >
      {dotClass ? (
        <span className={cn('size-1.5 rounded-full', dotClass)} aria-hidden />
      ) : null}
      {showIcon && Icon ? (
        <Icon className={ICON_CLASS[size]} aria-hidden strokeWidth={2.25} />
      ) : null}
      {iconOnly ? <span className="sr-only">{label}</span> : (children ?? label)}
    </span>
  )
}
