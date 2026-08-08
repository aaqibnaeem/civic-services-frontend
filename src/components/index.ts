/**
 * Shared, domain-aware components. Import from `@/components`:
 *
 *   import { StatusBadge, PageHeader, EmptyState } from '@/components'
 *
 * Raw shadcn primitives stay at `@/components/ui/*` and are imported directly.
 */

export { DomainBadge, type BadgeSize } from './DomainBadge'
export { CategoryBadge } from './CategoryBadge'
export { PriorityBadge } from './PriorityBadge'
export { StatusBadge } from './StatusBadge'
export { AiSourceBadge } from './AiSourceBadge'
export { ConfidenceMeter } from './ConfidenceMeter'
export { EmptyState } from './EmptyState'
export { ErrorState } from './ErrorState'
export { LoadingSkeleton, type SkeletonVariant } from './LoadingSkeleton'
export { StatCard, type StatTone } from './StatCard'
export { PageHeader, type Crumb } from './PageHeader'
export { ThemeToggle } from './ThemeToggle'
export { ReferenceCode } from './ReferenceCode'
