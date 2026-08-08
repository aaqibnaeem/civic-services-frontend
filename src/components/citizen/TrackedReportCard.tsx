import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CircleDashed,
  MapPin,
  RefreshCw,
  SearchX,
  Trash2,
} from 'lucide-react'

import { CategoryBadge } from '@/components/CategoryBadge'
import { PriorityBadge } from '@/components/PriorityBadge'
import { ReferenceCode } from '@/components/ReferenceCode'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useTrackComplaint } from '@/hooks'
import type { TrackedRef } from '@/stores/trackedStore'

import { relativeTime, shortDate } from './utils'

export interface TrackedReportCardProps {
  entry: TrackedRef
  onRemove: (referenceCode: string) => void
}

/**
 * One row on /my-reports. Each card fetches its own live status by reference
 * code, so the list is never stale even though the codes themselves live in
 * localStorage.
 */
export function TrackedReportCard({ entry, onRemove }: TrackedReportCardProps) {
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
    <Card className="transition-shadow hover:shadow-civic-lg">
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <ReferenceCode code={complaint.reference_code} size="sm" copyable />
          <StatusBadge status={complaint.status} size="sm" withTooltip />
          <CategoryBadge category={complaint.category} size="sm" short withTooltip />
          <PriorityBadge priority={complaint.priority} size="sm" />
          <span className="ml-auto flex items-center gap-1">
            {complaint.ai_status === 'pending' ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-info/30 bg-info/10 px-2 py-0.5 text-[0.6875rem] text-info">
                <CircleDashed className="size-3 animate-spin" aria-hidden />
                AI analysing
              </span>
            ) : null}
            {removeButton}
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm leading-snug font-medium">
            {entry.nickname || complaint.title}
          </h3>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">{complaint.location_text}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            Reported {shortDate(complaint.created_at)}
            <span className="opacity-70"> · {relativeTime(complaint.created_at)}</span>
          </p>
          <Button asChild variant="ghost" size="sm">
            <Link to={`/track/${complaint.reference_code}`}>
              View status
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
