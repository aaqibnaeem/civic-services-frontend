import { RefreshCw, SearchX, Trash2 } from 'lucide-react'

import { ReferenceCode } from '@/components/ReferenceCode'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTrackComplaint } from '@/hooks'
import type { TrackedRef } from '@/stores/trackedStore'

import { ComplaintSummaryCard } from './ComplaintSummaryCard'

export interface TrackedReportCardProps {
  entry: TrackedRef
  onRemove: (referenceCode: string) => void
  /** Explains where this entry came from when it sits beside account reports. */
  footnote?: React.ReactNode
}

/**
 * One locally-remembered report on /my-reports. Each card fetches its own live
 * status by reference code, so the list is never stale even though the codes
 * themselves live in localStorage — which is what keeps this page working for
 * someone who has never signed in.
 */
export function TrackedReportCard({ entry, onRemove, footnote }: TrackedReportCardProps) {
  const query = useTrackComplaint(entry.reference_code)
  const complaint = query.data

  const removeButton = (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onRemove(entry.reference_code)}
          aria-label={`Remove ${entry.reference_code} from this device`}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Remove from this device</TooltipContent>
    </Tooltip>
  )

  if (query.isPending) {
    return (
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </CardContent>
      </Card>
    )
  }

  if (query.isError) {
    const notFound = query.error?.isNotFound
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-start gap-3 p-5">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/60 text-muted-foreground">
            <SearchX className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1.5">
            <ReferenceCode code={entry.reference_code} size="sm" />
            <p className="text-sm text-muted-foreground">
              {notFound
                ? 'No report exists with this code any more. It may have been removed by an administrator.'
                : (query.error?.toUserMessage() ?? 'Could not load this report.')}
            </p>
            {!notFound ? (
              <Button variant="outline" size="xs" onClick={() => void query.refetch()}>
                <RefreshCw className="size-3" aria-hidden />
                Try again
              </Button>
            ) : null}
          </div>
          {removeButton}
        </CardContent>
      </Card>
    )
  }

  if (!complaint) return null

  return (
    <ComplaintSummaryCard
      complaint={complaint}
      title={entry.nickname}
      action={removeButton}
      footnote={footnote}
    />
  )
}
