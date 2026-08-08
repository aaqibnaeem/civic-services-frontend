/**
 * Possible duplicates for a complaint.
 *
 * The similarity score alone is not actionable, so every candidate carries the
 * human-readable `reason` the backend produced — a triage officer needs to know
 * WHY two reports look alike before merging or rejecting one.
 */

import { Link } from 'react-router-dom'
import { ArrowUpRight, CopyCheck } from 'lucide-react'

import { CategoryBadge } from '@/components/CategoryBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { ReferenceCode } from '@/components/ReferenceCode'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import type { DuplicateCandidate } from '@/lib/api/types'
import { formatPercent } from '@/lib/domain'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

function similarityTone(similarity: number): string {
  if (similarity >= 0.8) return 'text-destructive'
  if (similarity >= 0.6) return 'text-warning'
  return 'text-muted-foreground'
}

export interface DuplicatesPanelProps {
  candidates: DuplicateCandidate[] | undefined
  isPending: boolean
  error: unknown
  onRetry?: () => void
  className?: string
}

export function DuplicatesPanel({
  candidates,
  isPending,
  error,
  onRetry,
  className,
}: DuplicatesPanelProps) {
  return (
    <Card className={className}>
      <CardHeader className="gap-1">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <CopyCheck className="size-4 text-primary" aria-hidden />
          Possible duplicates
        </h2>
        <p className="text-sm text-muted-foreground">
          Other reports that may describe the same underlying problem.
        </p>
      </CardHeader>

      <CardContent>
        {error ? (
          <ErrorState error={error} onRetry={onRetry} variant="plain" />
        ) : isPending ? (
          <LoadingSkeleton variant="list" count={2} />
        ) : !candidates || candidates.length === 0 ? (
          <EmptyState
            icon={CopyCheck}
            title="No duplicates found"
            description="Nothing else in the database looks close enough to this report to be the same incident."
            size="sm"
          />
        ) : (
          <ul className="space-y-3">
            {candidates.map((candidate) => (
              <li key={candidate.complaint.id}>
                <Link
                  to={`/admin/complaints/${candidate.complaint.id}`}
                  className={cn(
                    'block rounded-lg border p-3 transition-colors',
                    'hover:border-primary/40 hover:bg-muted/50',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      Possible duplicate of{' '}
                      <ReferenceCode code={candidate.complaint.reference_code} size="sm" />
                    </p>
                    <span
                      className={cn(
                        'tabular text-sm font-semibold',
                        similarityTone(candidate.similarity),
                      )}
                    >
                      {formatPercent(candidate.similarity)} similar
                    </span>
                  </div>

                  <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                    {candidate.complaint.title}
                  </p>

                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Why: </span>
                    {candidate.reason}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <CategoryBadge
                      category={candidate.complaint.category}
                      size="sm"
                      short
                    />
                    <StatusBadge status={candidate.complaint.status} size="sm" dot />
                    {candidate.complaint.area ? (
                      <span className="text-xs text-muted-foreground">
                        {candidate.complaint.area}
                      </span>
                    ) : null}
                    <ArrowUpRight
                      className="ml-auto size-4 text-muted-foreground"
                      aria-hidden
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
