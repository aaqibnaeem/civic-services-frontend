/**
 * Who is carrying this complaint — CONTRACT §4b.
 *
 * Three ways to change it, in the order a triager reaches for them: re-run the
 * auto-assignment rule, hand it to a named person in the owning department, or
 * take it off everybody. The picker shows each person's live workload
 * (`active_assignments`) because "assign to Ayesha" is a different decision when
 * Ayesha already holds nine cases.
 *
 * The API answers `409` when an assignee is invalid — wrong department,
 * unavailable, or not staff at all. That message names the actual reason, so it
 * is shown verbatim instead of a generic failure.
 */

import { useEffect, useMemo, useState } from 'react'
import { format, formatDistanceToNowStrict, parseISO } from 'date-fns'
import {
  Building2,
  CalendarClock,
  LoaderCircle,
  Mail,
  Sparkles,
  TriangleAlert,
  UserMinus,
  UserPlus,
  UserRound,
} from 'lucide-react'

import { useAutoAssignComplaint, useDepartmentStaff, useUpdateComplaint } from '@/hooks'
import { sortByWorkload } from '@/hooks/useStaff'
import { isApiError } from '@/lib/api/client'
import type { ComplaintDetail, StaffMember } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

const NOBODY = '__unassigned__'

export interface AssignmentPanelProps {
  complaint: ComplaintDetail
  className?: string
}

function staffLabel(member: StaffMember): string {
  return member.full_name || member.email
}

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

/** "3 active" — the number that makes a reassignment an informed choice. */
function workloadLabel(member: StaffMember): string | null {
  const count = member.active_assignments
  if (count === null || count === undefined) return null
  return `${count} active`
}

export function AssignmentPanel({ complaint, className }: AssignmentPanelProps) {
  const departmentId = complaint.department?.id ?? null
  const staff = useDepartmentStaff(departmentId)
  const update = useUpdateComplaint()
  const autoAssign = useAutoAssignComplaint()

  const assignee = complaint.assignee ?? null
  const [selected, setSelected] = useState<string>(assignee?.id ?? NOBODY)
  const [conflict, setConflict] = useState<string | null>(null)

  // Re-sync when the server response lands (or auto-assign moves it elsewhere).
  useEffect(() => setSelected(assignee?.id ?? NOBODY), [assignee?.id])

  const options = useMemo(() => sortByWorkload(staff.data ?? []), [staff.data])
  const busy = update.isPending || autoAssign.isPending

  const captureConflict = (error: unknown) => {
    if (isApiError(error) && error.status === 409) setConflict(error.message)
  }

  const assign = () => {
    if (selected === NOBODY || selected === assignee?.id) return
    const member = options.find((entry) => entry.id === selected)
    setConflict(null)
    update.mutate(
      {
        id: complaint.id,
        patch: { assignee_id: selected },
        // The hook cannot know the name behind an id; this panel can.
        optimistic: member
          ? {
              assignee: {
                id: member.id,
                full_name: member.full_name,
                email: member.email,
                department_id: member.department_id ?? departmentId,
              },
              assigned_at: new Date().toISOString(),
            }
          : undefined,
      },
      { onError: captureConflict },
    )
  }

  const unassign = () => {
    setConflict(null)
    update.mutate(
      { id: complaint.id, patch: { assignee_id: null } },
      { onError: captureConflict },
    )
  }

  const runAutoAssign = () => {
    setConflict(null)
    autoAssign.mutate(complaint.id, { onError: captureConflict })
  }

  /* ------------------------------------------------------------ staff list */

  let pickerHint: React.ReactNode = null
  if (!departmentId) {
    pickerHint = (
      <>
        This complaint has no department yet, and staff belong to departments. Set one below (or
        run auto-assign, which routes and assigns in one go).
      </>
    )
  } else if (staff.isError) {
    pickerHint = staff.error?.isNotFound ? (
      <>The staff directory is not available on this deployment yet.</>
    ) : staff.error?.isForbidden ? (
      <>Your account cannot list staff for this department.</>
    ) : (
      <>{staff.error?.toUserMessage()}</>
    )
  } else if (!staff.isPending && options.length === 0) {
    pickerHint = (
      <>
        Nobody is on {complaint.department?.name}&rsquo;s roster, so complaints routed here stay
        unassigned until someone is added.
      </>
    )
  } else {
    pickerHint = (
      <>Ordered by workload — the lightest load first, which is what auto-assign would pick.</>
    )
  }

  const pickerDisabled =
    busy || !departmentId || staff.isPending || staff.isError || options.length === 0

  return (
    <Card className={className}>
      <CardHeader className="gap-1">
        <h2 className="text-base font-semibold">Assignment</h2>
        <p className="text-sm text-muted-foreground">
          Who is responsible for this complaint right now.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {conflict ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-destructive/35 bg-destructive/10 p-3 dark:bg-destructive/14"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <div className="space-y-0.5">
              <p className="text-sm font-medium">That assignment was rejected</p>
              <p className="text-sm leading-relaxed">{conflict}</p>
            </div>
          </div>
        ) : null}

        {/* ------------------------------------------------ current assignee */}
        {assignee ? (
          <div className="space-y-2.5 rounded-lg border bg-muted/40 p-3.5">
            <div className="flex items-start gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground">
                <UserRound className="size-4.5" aria-hidden />
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-medium break-words">
                  {assignee.full_name || assignee.email}
                </p>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" aria-hidden />
                  <a
                    href={`mailto:${assignee.email}`}
                    className="break-all underline underline-offset-2 hover:text-foreground"
                  >
                    {assignee.email}
                  </a>
                </p>
              </div>
            </div>

            <dl className="grid gap-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <Building2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <dt className="sr-only">Department</dt>
                <dd className="text-muted-foreground">
                  {complaint.department?.name ?? 'No department on the complaint'}
                </dd>
              </div>
              <div className="flex items-center gap-1.5">
                <CalendarClock className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <dt className="sr-only">Assigned</dt>
                <dd className="text-muted-foreground">
                  {complaint.assigned_at
                    ? `Assigned ${when(complaint.assigned_at).relative} · ${when(complaint.assigned_at).absolute}`
                    : 'Assignment time not recorded'}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <div className="flex items-start gap-2.5 rounded-lg border border-dashed p-3.5">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/60 text-muted-foreground">
              <UserRound className="size-4.5" aria-hidden />
            </span>
            <div className="space-y-0.5">
              <p className="text-sm font-medium">Unassigned</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Nobody is carrying this yet. Either it predates auto-assignment, or its department
                had no available staff when it arrived.
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* ------------------------------------------------------ reassign */}
        <div className="space-y-1.5">
          <Label htmlFor="assignment-staff">
            {assignee ? 'Reassign to' : 'Assign to'}
          </Label>

          {staff.isPending && departmentId ? (
            <Skeleton className="h-9 w-full rounded-md" />
          ) : (
            <Select
              value={selected}
              onValueChange={setSelected}
              disabled={pickerDisabled}
            >
              <SelectTrigger id="assignment-staff" className="w-full">
                <SelectValue placeholder="Choose a staff member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NOBODY} disabled>
                  Nobody assigned
                </SelectItem>
                {options.map((member) => {
                  const unavailable = member.is_available === false
                  const load = workloadLabel(member)
                  return (
                    <SelectItem key={member.id} value={member.id} disabled={unavailable}>
                      <span className="flex w-full items-center gap-2">
                        <span className="min-w-0 flex-1 truncate">{staffLabel(member)}</span>
                        {load ? (
                          <span
                            className={cn(
                              'tabular shrink-0 rounded-full border px-1.5 py-px text-[0.6875rem]',
                              (member.active_assignments ?? 0) === 0
                                ? 'border-success/30 bg-success/10 text-success'
                                : 'text-muted-foreground',
                            )}
                          >
                            {load}
                          </span>
                        ) : null}
                        {unavailable ? (
                          <span className="shrink-0 text-[0.6875rem] text-muted-foreground">
                            unavailable
                          </span>
                        ) : null}
                      </span>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">{pickerHint}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={assign}
            disabled={pickerDisabled || selected === NOBODY || selected === assignee?.id}
            className="flex-1"
          >
            {update.isPending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <UserPlus className="size-4" aria-hidden />
            )}
            {assignee ? 'Reassign' : 'Assign'}
          </Button>

          {assignee ? (
            <Button variant="outline" onClick={unassign} disabled={busy}>
              <UserMinus className="size-4" aria-hidden />
              Unassign
            </Button>
          ) : null}
        </div>

        <Separator />

        <div className="space-y-2">
          <Button
            variant="outline"
            onClick={runAutoAssign}
            disabled={busy}
            className="w-full"
          >
            {autoAssign.isPending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
            {autoAssign.isPending ? 'Re-running…' : 'Re-run auto-assign'}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Picks the available person in the owning department with the fewest active complaints,
            breaking ties towards whoever is carrying the least urgent work. If nobody is
            available the complaint stays exactly as it is.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
