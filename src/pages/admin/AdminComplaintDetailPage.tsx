/**
 * `/admin/complaints/:id` — the triage detail view.
 *
 * Two columns: the complaint and its evidence on the left, the action panel on
 * the right. The AI analysis panel is the centrepiece and states plainly which
 * analyzer tier produced the result, as the contract requires.
 */

import { Link, useParams } from 'react-router-dom'
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns'
import {
  ArrowLeft,
  CalendarClock,
  Clock,
  Mail,
  MapPin,
  Phone,
  User,
} from 'lucide-react'

import { CategoryBadge } from '@/components/CategoryBadge'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { PriorityBadge } from '@/components/PriorityBadge'
import { ReferenceCode } from '@/components/ReferenceCode'
import { StatusBadge } from '@/components/StatusBadge'
import {
  useComplaint,
  useDepartments,
  useDuplicates,
  useReanalyzeComplaint,
} from '@/hooks'
import { formatHours } from '@/lib/domain'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

import { AiAnalysisPanel } from '@/components/admin/AiAnalysisPanel'
import { ComplaintActionPanel } from '@/components/admin/ComplaintActionPanel'
import { DuplicatesPanel } from '@/components/admin/DuplicatesPanel'
import { StatusTimeline } from '@/components/admin/StatusTimeline'

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof User
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0 space-y-0.5">
        <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <div className="text-sm break-words">{children}</div>
      </div>
    </div>
  )
}

function safeDate(iso: string): { absolute: string; relative: string } {
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

export default function AdminComplaintDetailPage() {
  const { id } = useParams<{ id: string }>()
  const complaint = useComplaint(id)
  const duplicates = useDuplicates(id)
  const departments = useDepartments()
  const reanalyze = useReanalyzeComplaint()

  if (complaint.isPending) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="detail" />
      </div>
    )
  }

  if (complaint.isError || !complaint.data) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Triage"
          title="Complaint"
          breadcrumbs={[{ label: 'Inbox', to: '/admin' }, { label: 'Complaint' }]}
        />
        <ErrorState
          error={complaint.error}
          onRetry={() => void complaint.refetch()}
          action={
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin">Back to the inbox</Link>
            </Button>
          }
        />
      </div>
    )
  }

  const data = complaint.data
  const created = safeDate(data.created_at)
  const updated = safeDate(data.updated_at)
  const resolved = data.resolved_at ? safeDate(data.resolved_at) : null

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Triage"
        breadcrumbs={[
          { label: 'Inbox', to: '/admin' },
          { label: data.reference_code },
        ]}
        title={data.title}
        description={data.location_text}
        meta={
          <div className="flex flex-wrap items-center gap-1.5">
            <ReferenceCode code={data.reference_code} copyable size="md" />
            <StatusBadge status={data.status} withTooltip />
            <PriorityBadge priority={data.priority} withTooltip />
            <CategoryBadge category={data.category} withTooltip />
          </div>
        }
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin">
              <ArrowLeft className="size-4" aria-hidden />
              Back to inbox
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        {/* ------------------------------------------------------ Left column */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="gap-1">
              <h2 className="text-base font-semibold">The report</h2>
              <p className="text-sm text-muted-foreground">
                The citizen&rsquo;s own words, exactly as submitted.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-pretty">
                {data.description}
              </p>

              {data.image_url ? (
                <img
                  src={data.image_url}
                  alt="Photo attached to the complaint"
                  loading="lazy"
                  className="max-h-96 w-full rounded-lg border object-cover"
                />
              ) : null}

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <DetailRow icon={MapPin} label="Location">
                  <p>{data.location_text}</p>
                  {data.area ? (
                    <p className="text-muted-foreground">Area: {data.area}</p>
                  ) : null}
                  {data.latitude !== null && data.longitude !== null ? (
                    <p className="tabular font-mono text-xs text-muted-foreground">
                      {data.latitude.toFixed(5)}, {data.longitude.toFixed(5)}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No GPS coordinates supplied.
                    </p>
                  )}
                </DetailRow>

                <DetailRow icon={User} label="Citizen">
                  <p>{data.citizen_name ?? 'Reported anonymously'}</p>
                  {data.citizen_phone ? (
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="size-3.5" aria-hidden />
                      <a
                        href={`tel:${data.citizen_phone}`}
                        className="underline underline-offset-2 hover:text-foreground"
                      >
                        {data.citizen_phone}
                      </a>
                    </p>
                  ) : null}
                  {data.citizen_email ? (
                    <p className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="size-3.5" aria-hidden />
                      <a
                        href={`mailto:${data.citizen_email}`}
                        className="break-all underline underline-offset-2 hover:text-foreground"
                      >
                        {data.citizen_email}
                      </a>
                    </p>
                  ) : null}
                  {!data.citizen_phone && !data.citizen_email ? (
                    <p className="text-xs text-muted-foreground">
                      No contact details — updates are only visible via the tracking code.
                    </p>
                  ) : null}
                </DetailRow>

                <DetailRow icon={Clock} label="Submitted">
                  <p>{created.absolute}</p>
                  <p className="text-muted-foreground">{created.relative}</p>
                </DetailRow>

                <DetailRow icon={CalendarClock} label="Last updated">
                  <p>{updated.absolute}</p>
                  <p className="text-muted-foreground">{updated.relative}</p>
                  {resolved ? (
                    <p className="text-muted-foreground">
                      Resolved {resolved.relative} · took{' '}
                      <span className="tabular font-medium text-foreground">
                        {formatHours(data.resolution_hours)}
                      </span>
                    </p>
                  ) : null}
                </DetailRow>
              </div>

              {data.duplicate_of_id ? (
                <p className="rounded-lg border border-warning/35 bg-warning/10 p-3 text-sm dark:bg-warning/14">
                  This complaint has already been marked as a duplicate of another report.{' '}
                  <Link
                    to={`/admin/complaints/${data.duplicate_of_id}`}
                    className="font-medium underline underline-offset-2"
                  >
                    Open the original
                  </Link>
                  .
                </p>
              ) : null}
            </CardContent>
          </Card>

          <AiAnalysisPanel
            ai={data.ai}
            aiStatus={data.ai_status}
            onReanalyze={() => reanalyze.mutate(data.id)}
            reanalyzing={reanalyze.isPending}
          />

          <DuplicatesPanel
            candidates={duplicates.data?.candidates}
            isPending={duplicates.isPending}
            error={duplicates.error}
            onRetry={() => void duplicates.refetch()}
          />
        </div>

        {/* ----------------------------------------------------- Right column */}
        <div className="space-y-6">
          <ComplaintActionPanel complaint={data} departments={departments.data ?? []} />

          <Card>
            <CardHeader className="gap-1">
              <h2 className="text-base font-semibold">Status history</h2>
              <p className="text-sm text-muted-foreground">
                Every transition, with who made it and why.
              </p>
            </CardHeader>
            <CardContent>
              <StatusTimeline events={data.timeline ?? []} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
