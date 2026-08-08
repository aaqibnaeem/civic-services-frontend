import { useEffect, useState } from 'react'
import { LoaderCircle, TriangleAlert } from 'lucide-react'

import { useDepartmentStaff, useUpdateComplaint } from '@/hooks'
import { isApiError } from '@/lib/api/client'
import type { Complaint } from '@/lib/api/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { StaffPicker } from './StaffPicker'

export interface RowAssignDialogProps {
  /** The complaint being assigned; `null` keeps the dialog closed. */
  complaint: Complaint | null
  onOpenChange: (open: boolean) => void
}

/**
 * Assign a complaint straight from the inbox.
 *
 * Triagers work down a list, so making them open each complaint just to put a
 * name on it is the slow path. Setting the status to `assigned` from the row
 * menu used to leave the assignee empty, which is the bug this closes: the
 * status dropdown asks no follow-up question, so ownership now has its own
 * action that actually names somebody.
 */
export function RowAssignDialog({ complaint, onOpenChange }: RowAssignDialogProps) {
  const departmentId = complaint?.department?.id ?? null
  const staff = useDepartmentStaff(departmentId)
  const update = useUpdateComplaint()

  const [selected, setSelected] = useState<string | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)

  // Reset whenever a different row opens the dialog.
  useEffect(() => {
    setSelected(complaint?.assignee?.id ?? null)
    setConflict(null)
  }, [complaint?.id, complaint?.assignee?.id])

  if (!complaint) return null

  const roster = staff.data ?? []
  const unchanged = selected === (complaint.assignee?.id ?? null)

  const submit = () => {
    if (unchanged) return
    const member = roster.find((entry) => entry.id === selected)
    setConflict(null)
    update.mutate(
      {
        id: complaint.id,
        patch: { assignee_id: selected },
        // The hook cannot resolve a name from an id; this dialog can, so the
        // Assignee column fills in immediately instead of after the refetch.
        optimistic: selected
          ? member
            ? {
                assignee: {
                  id: member.id,
                  full_name: member.full_name,
                  email: member.email,
                  department_id: member.department_id ?? departmentId,
                },
                assigned_at: new Date().toISOString(),
              }
            : undefined
          : { assignee: null, assigned_at: null },
      },
      {
        onSuccess: () => onOpenChange(false),
        onError: (error) => {
          if (isApiError(error) && error.status === 409) setConflict(error.message)
        },
      },
    )
  }

  return (
    <Dialog open={Boolean(complaint)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {complaint.assignee ? 'Reassign' : 'Assign'} {complaint.reference_code}
          </DialogTitle>
          <DialogDescription>
            {departmentId
              ? `Staff in ${complaint.department?.name}, lightest workload first.`
              : 'This complaint has no department yet, and staff belong to departments. Open it and set one, or run auto-assign.'}
          </DialogDescription>
        </DialogHeader>

        {conflict ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-destructive/35 bg-destructive/10 p-3 text-sm dark:bg-destructive/14"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <span className="leading-relaxed">{conflict}</span>
          </div>
        ) : null}

        {departmentId ? (
          staff.isPending ? (
            <Skeleton className="h-9 w-full rounded-md" />
          ) : staff.isError ? (
            <p className="text-sm text-muted-foreground">{staff.error?.toUserMessage()}</p>
          ) : roster.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nobody is on this department&rsquo;s roster yet.
            </p>
          ) : (
            <StaffPicker
              inline
              staff={roster}
              value={selected}
              onChange={setSelected}
              disabled={update.isPending}
              allowUnassign={Boolean(complaint.assignee)}
            />
          )
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={unchanged || update.isPending || !departmentId}>
            {update.isPending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : null}
            {selected ? (complaint.assignee ? 'Reassign' : 'Assign') : 'Unassign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
