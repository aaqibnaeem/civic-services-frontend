/**
 * `/track/:referenceCode` — the public status view for one complaint.
 *
 * Uses `usePollUntilAnalyzed`, so a citizen who lands here seconds after
 * submitting watches the AI result appear without touching the page
 * (CONTRACT §5.1 — submission never blocks on the analyzer).
 *
 * Contact details belong to whoever filed the report and are never rendered
 * here, even though the API returns them.
 */

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  BrainCircuit,
  Building2,
  CalendarDays,
  CircleDashed,
  MapPin,
  RefreshCw,
  SearchX,
  TriangleAlert,
} from 'lucide-react'

import { CategoryBadge } from '@/components/CategoryBadge'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { PriorityBadge } from '@/components/PriorityBadge'
import { ReferenceCode } from '@/components/ReferenceCode'
import { StatusBadge } from '@/components/StatusBadge'
import {
  AiAnalysisCard,
  PageShell,
  StatusTimeline,
  absoluteTime,
  relativeTime,
} from '@/components/citizen'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { usePollUntilAnalyzed } from '@/hooks'
import { STATUS_META, formatHours, formatReferenceCode, isReferenceCode } from '@/lib/domain'
import { useTrackedStore } from '@/stores/trackedStore'

export default function TrackDetailPage() {
  const { referenceCode = '' } = useParams<{ referenceCode: string }>()
  const code = formatReferenceCode(referenceCode)
  const validShape = isReferenceCode(code)

  // The poller keeps retrying on the interval, which is right while a complaint
  // is being analysed but wrong once the server has told us the code is bad.
  // Halting on the first error stops it and hands control to the retry button.
  const [halted, setHalted] = useState(false)
  const poll = usePollUntilAnalyzed(code, { enabled: validShape && !halted })
  const complaint = poll.complaint
  const addTracked = useTrackedStore((s) => s.add)

  useEffect(() => {
    if (poll.error) setHalted(true)
  }, [poll.error])

  // Remember any code the citizen successfully opens, so /my-reports finds it
  // again even if they tracked it from a link rather than filing it here.
  useEffect(() => {
    if (!complaint) return
    addTracked({
      reference_code: complaint.reference_code,
      id: complaint.id,
      title: complaint.title,
      category: complaint.category,
      location_text: complaint.location_text,
    })
  }, [complaint, addTracked])

  const retry = () => {
    setHalted(false)
    poll.refetch()
  }

  const header = (
    <PageHeader
      breadcrumbs={[{ label: 'Track', to: '/track' }, { label: code || 'Report' }]}
      eyebrow="Public status"
      title={complaint?.title ?? 'Report status'}
      meta={
        <span className="flex flex-wrap items-center gap-2">
          <ReferenceCode code={code} copyable />
          {complaint ? <StatusBadge status={complaint.status} withTooltip /> : null}
        </span>
      }
      description={
        complaint
          ? STATUS_META[complaint.status].description
          : 'Live status, the AI’s reading of the report, and every milestone we can publish.'
      }
    />
  )

  /* ------------------------------------------------------------- bad shape */

  if (!validShape) {
    return (
      <PageShell width="form" className="space-y-8">
        {header}
        <EmptyState
          icon={SearchX}
          title={`“${referenceCode}” is not a reference code`}
          description="Codes look like CIV-8F3K2M — three letters, a dash, then six characters. Check the code you were given and try again."
          action={
            <Button asChild size="sm">
              <Link to="/track">
                <ArrowLeft className="size-4" aria-hidden />
                Back to tracking
              </Link>
            </Button>
          }
          size="lg"
        />
      </PageShell>
    )
  }

  /* ---------------------------------------------------------------- states */

  if (poll.isPending && !complaint) {
    return (
      <PageShell width="default" className="space-y-8">
        {header}
        <LoadingSkeleton variant="detail" />
      </PageShell>
    )
  }

  if (poll.error && !complaint) {
    const notFound = poll.error.isNotFound
    return (
      <PageShell width="form" className="space-y-8">
        {header}
        {notFound ? (
          <EmptyState
            icon={SearchX}
            title="No report with that code"
            description={
              <>
                We could not find <span className="ref-code">{code}</span>. Reference codes are
                case-insensitive, but everything else has to match exactly — it is worth checking
                for a <span className="ref-code">0</span> that should be an{' '}
                <span className="ref-code">O</span>.
              </>
            }
            action={
              <>
                <Button asChild size="sm">
                  <Link to="/track">Try another code</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/report">Report a new issue</Link>
                </Button>
              </>
            }
            footer="If you have just submitted, give it a few seconds and refresh."
            size="lg"
          />
        ) : (
          <ErrorState error={poll.error} onRetry={retry} />
        )}
      </PageShell>
    )
  }

  if (!complaint) return null

  const analysing = poll.isAnalyzing || complaint.ai_status === 'pending'

  return (
    <PageShell width="default" className="space-y-8">
      {header}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* ------------------------------------------------ current status */}
          <Card>
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={complaint.status} size="lg" withTooltip />
                <CategoryBadge category={complaint.category} size="lg" withTooltip />
                <PriorityBadge priority={complaint.priority} size="lg" withTooltip />
              </div>

              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="size-3.5" aria-hidden />
                    Submitted
                  </dt>
                  <dd className="text-sm">
                    {absoluteTime(complaint.created_at)}
                    <span className="block text-xs text-muted-foreground">
                      {relativeTime(complaint.created_at)}
                    </span>
                  </dd>
                </div>

                <div className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" aria-hidden />
                    Location
                  </dt>
                  <dd className="text-sm wrap-break-word">
                    {complaint.location_text}
                    {complaint.area ? (
                      <span className="block text-xs text-muted-foreground">{complaint.area}</span>
                    ) : null}
                  </dd>
                </div>

                <div className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Building2 className="size-3.5" aria-hidden />
                    Department
                  </dt>
                  <dd className="text-sm wrap-break-word">
                    {complaint.department?.name ?? (
                      <span className="text-muted-foreground">Not assigned yet</span>
                    )}
                  </dd>
                </div>

                <div className="space-y-1">
                  <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <RefreshCw className="size-3.5" aria-hidden />
                    Last update
                  </dt>
                  <dd className="text-sm">
                    {relativeTime(complaint.updated_at)}
                    {complaint.resolved_at ? (
                      <span className="block text-xs text-success">
                        Resolved in {formatHours(complaint.resolution_hours)}
                      </span>
                    ) : null}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* -------------------------------------------------- description */}
          <Card>
            <CardContent className="space-y-2 p-5 sm:p-6">
              <h2 className="text-sm font-semibold">What was reported</h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {complaint.description}
              </p>
            </CardContent>
          </Card>

          {/* ----------------------------------------------------- timeline */}
          <Card>
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold">Progress</h2>
                <p className="text-xs text-muted-foreground">
                  Everything that has happened to this report so far.
                </p>
              </div>
              <StatusTimeline complaint={complaint} />
            </CardContent>
          </Card>
        </div>

        {/* --------------------------------------------------- AI side panel */}
        <div className="space-y-6">
          <div aria-live="polite" aria-busy={analysing}>
            {complaint.ai && complaint.ai_status === 'complete' ? (
              <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-500">
                <AiAnalysisCard analysis={complaint.ai} />
              </div>
            ) : analysing ? (
              <Card className="border-info/30">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center gap-3">
                    <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg border border-info/30 bg-info/10 text-info">
                      <BrainCircuit className="size-4.5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <CircleDashed className="size-3.5 animate-spin text-info" aria-hidden />
                        AI is analysing this complaint…
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This panel fills in on its own — no refresh needed.
                      </p>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    The report is already saved and queued. Analysis runs in the background so an AI
                    outage can never stop a complaint being filed.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-warning/35">
                <CardContent className="space-y-3 p-5">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <TriangleAlert className="size-4 text-warning" aria-hidden />
                    {poll.timedOut ? 'Analysis is taking longer than usual' : 'Not analysed'}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {poll.timedOut
                      ? 'We stopped waiting after 90 seconds. The report itself is safe — check back shortly.'
                      : 'Every analyzer tier was unavailable for this report. It is stored safely and a person will triage it by hand.'}
                  </p>
                  <Button variant="outline" size="sm" onClick={retry}>
                    <RefreshCw className="size-3.5" aria-hidden />
                    Check again
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardContent className="space-y-3 p-5 text-xs leading-relaxed text-muted-foreground">
              <p className="text-sm font-medium text-foreground">Keep this code</p>
              <ReferenceCode code={complaint.reference_code} copyable />
              <p>
                Anyone with this code can see this page, so share it only with people you want to
                see the report. Names, phone numbers and email addresses are never shown here.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/my-reports">See all my reports</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
