/**
 * The audit trail: every recorded status transition, oldest first, with the
 * actor who made it and the note they left.
 *
 * The backend appends a `StatusEvent` on every PATCH, so this is the honest
 * history of the complaint — not a reconstruction from the current state.
 */

import { format, formatDistanceToNowStrict, parseISO } from 'date-fns'

import { STATUS_META } from '@/lib/domain'
import type { StatusEvent } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/EmptyState'

function when(iso: string): { absolute: string; relative: string } {
  try {
    const date = parseISO(iso)
    return {
      absolute: format(date, 'd MMM yyyy, HH:mm'),
      relative: formatDistanceToNowStrict(date, { addSuffix: true }),
    }
  } catch {
    return { absolute: iso, relative: '' }
  }
}

export interface StatusTimelineProps {
  /**
   * Defaulted on purpose. `PATCH /complaints/{id}` returns a plain `Complaint`
   * (no `timeline`, per CONTRACT §3) but the shared `useUpdateComplaint` hook
   * writes that response straight into the detail cache, so `timeline` is
   * briefly `undefined` between a successful mutation and its refetch.
   */
  events?: StatusEvent[]
  className?: string
}

export function StatusTimeline({ events = [], className }: StatusTimelineProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No status history"
        description="Nothing has changed since this complaint was filed."
        size="sm"
      />
    )
  }

  const ordered = [...events].sort(
    (a, b) => Date.parse(a.created_at) - Date.parse(b.created_at),
  )

  return (
    <ol className={cn('relative space-y-0', className)}>
      {ordered.map((event, index) => {
        const meta = STATUS_META[event.to_status]
        const Icon = meta.icon
        const time = when(event.created_at)
        const isLast = index === ordered.length - 1

        return (
          <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
            {/* rail */}
            {!isLast ? (
              <span
                className="absolute top-7 bottom-0 left-3.5 w-px bg-border"
                aria-hidden
              />
            ) : null}

            <span
              className={cn(
                'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border',
                meta.badgeClass,
              )}
            >
              <Icon className="size-3.5" aria-hidden strokeWidth={2.25} />
            </span>

            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <p className="text-sm font-medium">
                  {event.from_status ? (
                    <>
                      {STATUS_META[event.from_status].label}{' '}
                      <span className="text-muted-foreground" aria-label="changed to">
                        →
                      </span>{' '}
                      {meta.label}
                    </>
                  ) : (
                    <>Filed as {meta.label}</>
                  )}
                </p>
                <time
                  dateTime={event.created_at}
                  title={time.absolute}
                  className="text-xs text-muted-foreground"
                >
                  {time.relative}
                </time>
              </div>

              <p className="text-xs text-muted-foreground">
                {time.absolute} · {event.actor}
              </p>

              {event.note ? (
                <p className="mt-1.5 rounded-lg border bg-muted/40 px-2.5 py-1.5 text-sm leading-relaxed text-pretty">
                  {event.note}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
