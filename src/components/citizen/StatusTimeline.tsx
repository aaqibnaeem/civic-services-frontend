import {
  Ban,
  BrainCircuit,
  Building2,
  Check,
  CircleDashed,
  LoaderCircle,
  Send,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'

import { CATEGORY_META, PRIORITY_META, STATUS_META, formatHours } from '@/lib/domain'
import { AI_SOURCE_META } from '@/lib/domain'
import type { Complaint } from '@/lib/api/types'
import { cn } from '@/lib/utils'

import { absoluteTime, relativeTime } from './utils'

type EntryState = 'done' | 'current' | 'pending' | 'failed'

interface TimelineEntry {
  key: string
  title: string
  detail: string
  timestamp: string | null
  state: EntryState
  icon: LucideIcon
}

const STATE_CLASS: Record<EntryState, { ring: string; text: string }> = {
  done: { ring: 'border-success/35 bg-success/12 text-success', text: 'text-foreground' },
  current: { ring: 'border-primary/40 bg-primary/12 text-primary', text: 'text-foreground' },
  pending: { ring: 'border-border bg-muted text-muted-foreground', text: 'text-muted-foreground' },
  failed: {
    ring: 'border-warning/40 bg-warning/12 text-warning',
    text: 'text-foreground',
  },
}

/**
 * Builds the public progress timeline for a complaint.
 *
 * The public tracking endpoint returns the complaint but not its internal
 * `StatusEvent[]` (those carry staff notes and actor emails), so this derives
 * the milestones that CAN be published — submission, AI analysis, routing and
 * the lifecycle position — and is explicit about which ones have no public
 * timestamp rather than inventing one.
 */
function buildEntries(complaint: Complaint): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  const currentStep = STATUS_META[complaint.status].step
  const isRejected = complaint.status === 'rejected'

  entries.push({
    key: 'submitted',
    title: 'Report received',
    detail: `Filed anonymously from a browser and given the reference ${complaint.reference_code}.`,
    timestamp: complaint.created_at,
    state: 'done',
    icon: Send,
  })

  if (complaint.ai_status === 'complete' && complaint.ai) {
    const tier = AI_SOURCE_META[complaint.ai.source]
    entries.push({
      key: 'analysed',
      title: 'Analysed by the AI',
      detail: `Read as ${CATEGORY_META[complaint.ai.category].label.toLowerCase()} at ${PRIORITY_META[
        complaint.ai.priority
      ].label.toLowerCase()} priority by the ${tier.label} tier (${tier.tier === 1 ? 'tier 1' : `tier ${tier.tier}`}).`,
      timestamp: complaint.ai.created_at,
      state: 'done',
      icon: BrainCircuit,
    })
  } else if (complaint.ai_status === 'pending') {
    entries.push({
      key: 'analysed',
      title: 'AI is analysing this report',
      detail: 'This page refreshes itself as soon as the analysis lands. Nothing is lost meanwhile.',
      timestamp: null,
      state: 'current',
      icon: LoaderCircle,
    })
  } else {
    entries.push({
      key: 'analysed',
      title: 'Automatic analysis unavailable',
      detail:
        'Every analyzer tier failed for this report. It is safely stored and will be triaged by a person instead.',
      timestamp: null,
      state: 'failed',
      icon: TriangleAlert,
    })
  }

  entries.push({
    key: 'routed',
    title: complaint.department
      ? `Routed to ${complaint.department.name}`
      : 'Waiting to be routed',
    detail: complaint.department
      ? 'The department that owns this kind of work now has it in its queue.'
      : 'No department has been assigned yet. Triage assigns one after the analysis.',
    timestamp: complaint.department ? (complaint.ai?.created_at ?? null) : null,
    state: complaint.department ? 'done' : 'pending',
    icon: Building2,
  })

  const assignedMeta = STATUS_META.assigned
  entries.push({
    key: 'assigned',
    title: 'Assigned to a crew',
    detail: assignedMeta.description,
    timestamp: null,
    state:
      complaint.status === 'assigned'
        ? 'current'
        : currentStep > assignedMeta.step && !isRejected
          ? 'done'
          : 'pending',
    icon: assignedMeta.icon,
  })

  const progressMeta = STATUS_META.in_progress
  entries.push({
    key: 'in_progress',
    title: 'Work under way',
    detail: progressMeta.description,
    timestamp: null,
    state:
      complaint.status === 'in_progress'
        ? 'current'
        : complaint.status === 'resolved'
          ? 'done'
          : 'pending',
    icon: progressMeta.icon,
  })

  if (isRejected) {
    entries.push({
      key: 'rejected',
      title: 'Closed without action',
      detail: STATUS_META.rejected.description,
      timestamp: complaint.updated_at,
      state: 'done',
      icon: Ban,
    })
  } else {
    const resolved = complaint.status === 'resolved'
    entries.push({
      key: 'resolved',
      title: resolved ? 'Resolved' : 'Resolution',
      detail: resolved
        ? complaint.resolution_hours != null
          ? `Closed ${formatHours(complaint.resolution_hours)} after it was reported.`
          : 'The department marked the work complete.'
        : 'Not yet. You will see the date here the moment the department closes it.',
      timestamp: complaint.resolved_at,
      state: resolved ? 'done' : 'pending',
      icon: resolved ? Check : CircleDashed,
    })
  }

  return entries
}

export interface StatusTimelineProps {
  complaint: Complaint
  className?: string
}

/** Vertical, public-safe progress timeline for one complaint. */
export function StatusTimeline({ complaint, className }: StatusTimelineProps) {
  const entries = buildEntries(complaint)

  return (
    <div className={className}>
      <ol className="relative space-y-6">
        <span
          className="absolute top-2 bottom-2 left-[15px] w-px bg-border"
          aria-hidden
        />
        {entries.map((entry) => {
          const tone = STATE_CLASS[entry.state]
          const Icon = entry.icon
          return (
            <li key={entry.key} className="relative flex gap-4">
              <span
                className={cn(
                  'relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background',
                  tone.ring,
                )}
              >
                <Icon
                  className={cn('size-4', entry.state === 'current' && entry.key === 'analysed' && 'animate-spin')}
                  aria-hidden
                  strokeWidth={2.2}
                />
              </span>

              <div className="min-w-0 flex-1 space-y-1 pb-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className={cn('text-sm font-medium', tone.text)}>{entry.title}</p>
                  {entry.timestamp ? (
                    <p className="text-xs text-muted-foreground">
                      <time dateTime={entry.timestamp} title={absoluteTime(entry.timestamp)}>
                        {absoluteTime(entry.timestamp)}
                      </time>
                      <span className="opacity-70"> · {relativeTime(entry.timestamp)}</span>
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground/80">
                      {entry.state === 'pending' ? 'not yet' : 'no public timestamp'}
                    </p>
                  )}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{entry.detail}</p>
              </div>
            </li>
          )
        })}
      </ol>

      <p className="mt-6 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
        Public tracking shows the milestones we can publish: submission, AI analysis, routing and
        resolution. Internal notes between staff, and the contact details of whoever reported it,
        stay private.
      </p>
    </div>
  )
}
