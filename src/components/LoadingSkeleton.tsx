import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export type SkeletonVariant =
  | 'list'
  | 'table'
  | 'cards'
  | 'stats'
  | 'detail'
  | 'chart'
  | 'text'

export interface LoadingSkeletonProps {
  variant?: SkeletonVariant
  /** Rows / cards / lines to draw. */
  count?: number
  /** Columns, for `variant="table"`. */
  columns?: number
  className?: string
}

/**
 * Shape-matched loading placeholders. Always prefer the variant that matches the
 * real content — a skeleton that mirrors the final layout stops the page jumping
 * when data lands.
 */
export function LoadingSkeleton({
  variant = 'list',
  count = 5,
  columns = 5,
  className,
}: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i)

  if (variant === 'stats') {
    return (
      <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
        {items.slice(0, count || 4).map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-3.5 w-24" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div className={cn('w-full overflow-hidden rounded-xl border', className)}>
        <div className="flex items-center gap-4 border-b bg-muted/40 px-4 py-3">
          {Array.from({ length: columns }, (_, i) => (
            <Skeleton key={i} className="h-3.5 flex-1" />
          ))}
        </div>
        {items.map((row) => (
          <div key={row} className="flex items-center gap-4 border-b px-4 py-3.5 last:border-b-0">
            {Array.from({ length: columns }, (_, col) => (
              <Skeleton
                key={col}
                className={cn('h-4 flex-1', col === 0 && 'max-w-24', col === 1 && 'flex-[2]')}
              />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (variant === 'cards') {
    return (
      <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
        {items.map((i) => (
          <Card key={i}>
            <CardHeader className="space-y-2">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
              <Skeleton className="h-3.5 w-2/5" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (variant === 'chart') {
    return (
      <Card className={className}>
        <CardHeader className="space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-64" />
        </CardHeader>
        <CardContent>
          <div className="flex h-56 items-end gap-2">
            {Array.from({ length: 12 }, (_, i) => (
              <Skeleton
                key={i}
                className="flex-1 rounded-t-md"
                style={{ height: `${30 + ((i * 37) % 65)}%` }}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === 'detail') {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="space-y-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3 lg:col-span-2">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (variant === 'text') {
    return (
      <div className={cn('space-y-2', className)}>
        {items.map((i) => (
          <Skeleton key={i} className={cn('h-3.5 w-full', i === count - 1 && 'w-3/5')} />
        ))}
      </div>
    )
  }

  // list
  return (
    <div className={cn('space-y-3', className)}>
      {items.map((i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl border p-4">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  )
}
