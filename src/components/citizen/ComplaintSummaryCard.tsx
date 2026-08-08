import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CircleDashed, MapPin } from 'lucide-react'

import { CategoryBadge } from '@/components/CategoryBadge'
import { PriorityBadge } from '@/components/PriorityBadge'
import { ReferenceCode } from '@/components/ReferenceCode'
import { StatusBadge } from '@/components/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Complaint } from '@/lib/api/types'
import { cn } from '@/lib/utils'

import { relativeTime, shortDate } from './utils'

export interface ComplaintSummaryCardProps {
  complaint: Complaint
  /** Overrides the title — e.g. a nickname saved on this device. */
  title?: string | null
  /** Rendered at the end of the badge row, e.g. a remove button. */
  action?: ReactNode
  /** A small line above the footer, e.g. where this entry came from. */
  footnote?: ReactNode
  className?: string
}

/**
 * One report, as a citizen sees it.
 *
 * Shared by both halves of /my-reports — the reference codes stored in this
 * browser and the complaints returned by `GET /complaints/mine` — so a report
 * looks identical whether it was found through an account or through a code.
 */
export function ComplaintSummaryCard({
  complaint,
  title,
  action,
  footnote,
  className,
}: ComplaintSummaryCardProps) {
  return (
    <Card className={cn('transition-shadow hover:shadow-civic-lg', className)}>
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
            {action}
          </span>
        </div>

        <div className="space-y-1">
          <h3 className="text-sm leading-snug font-medium">{title || complaint.title}</h3>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">{complaint.location_text}</span>
          </p>
        </div>

        {footnote ? <div className="text-xs text-muted-foreground">{footnote}</div> : null}

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
