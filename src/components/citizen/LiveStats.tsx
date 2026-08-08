import { CircleCheck, Inbox, MapPin, Timer } from 'lucide-react'

import { StatCard } from '@/components/StatCard'
import { formatNumber, formatPercent } from '@/lib/domain'
import type { PublicSummaryResponse } from '@/lib/api/types'

import { formatDays, relativeTime } from './utils'

export interface LiveStatsProps {
  summary: PublicSummaryResponse
}

/**
 * The live numbers strip. Every figure comes from `/analytics/public-summary`
 * over the real database — nothing here is hard-coded.
 */
export function LiveStats({ summary }: LiveStatsProps) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Complaints handled"
          value={formatNumber(summary.total_complaints)}
          hint="Every report this service has taken in."
          icon={Inbox}
          tone="info"
          tooltip="The total number of complaints in the database right now, including the one you are about to file."
        />
        <StatCard
          label="Resolved"
          value={formatNumber(summary.resolved)}
          hint={`${formatPercent(summary.resolution_rate)} of everything reported`}
          icon={CircleCheck}
          tone="success"
          tooltip="Complaints a department has marked complete. The rest are open, assigned or in progress."
        />
        <StatCard
          label="Median resolution"
          value={formatDays(summary.median_resolution_days)}
          hint="Half of all reports close faster than this."
          icon={Timer}
          tone="default"
          tooltip="The median, not the average. A handful of very slow cases drags the mean upwards, so the median is the honest figure for what a typical citizen waits."
        />
        <StatCard
          label="Reported this week"
          value={formatNumber(summary.complaints_this_week)}
          hint={`Across ${formatNumber(summary.active_areas)} areas of Karachi`}
          icon={MapPin}
          tone="default"
          tooltip="Complaints filed in the last seven days, and how many distinct areas they came from."
        />
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {summary.interpretation}{' '}
        <span className="text-muted-foreground/70">
          Figures refreshed {relativeTime(summary.generated_at)}.
        </span>
      </p>
    </div>
  )
}
