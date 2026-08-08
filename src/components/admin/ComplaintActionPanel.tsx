/**
 * The triage action panel: status, department, category, priority and a note,
 * all in one PATCH.
 *
 * Workflow rules are surfaced rather than hidden. `resolved` and `rejected` are
 * terminal — the API answers any move out of them with a 409 — so the control is
 * disabled with an explanation instead of letting a staff member click into an
 * error. If the server rejects a transition anyway, the 409 message is shown
 * verbatim because it names the exact illegal move.
 */

import { useEffect, useMemo, useState } from 'react'
import { LoaderCircle, Save, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'

import { StatusBadge } from '@/components/StatusBadge'
import {
  CATEGORY_OPTIONS,
  PRIORITY_OPTIONS,
  STATUS_META,
  STATUS_OPTIONS,
} from '@/lib/domain'
import type {
  Category,
  ComplaintDetail,
  ComplaintUpdate,
  Department,
  Priority,
  Status,
} from '@/lib/api/types'
import { isApiError } from '@/lib/api/client'
import { useUpdateComplaint } from '@/hooks'
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
import { Textarea } from '@/components/ui/textarea'

const UNASSIGNED = '__unassigned__'

export interface ComplaintActionPanelProps {
  complaint: ComplaintDetail
  departments: Department[]
  className?: string
}

export function ComplaintActionPanel({
  complaint,
  departments,
  className,
}: ComplaintActionPanelProps) {
  const update = useUpdateComplaint()

  const [status, setStatus] = useState<Status>(complaint.status)
  const [category, setCategory] = useState<Category>(complaint.category)
  const [priority, setPriority] = useState<Priority>(complaint.priority)
  const [departmentId, setDepartmentId] = useState<string>(
    complaint.department?.id ?? UNASSIGNED,
  )
  const [note, setNote] = useState('')
  const [conflict, setConflict] = useState<string | null>(null)

  // Re-sync when the server response lands (or another tab changes it).
  useEffect(() => {
    setStatus(complaint.status)
    setCategory(complaint.category)
    setPriority(complaint.priority)
    setDepartmentId(complaint.department?.id ?? UNASSIGNED)
  }, [
    complaint.status,
    complaint.category,
    complaint.priority,
    complaint.department?.id,
  ])

  const terminal = STATUS_META[complaint.status].terminal

  const patch = useMemo<ComplaintUpdate>(() => {
    const next: ComplaintUpdate = {}
    if (status !== complaint.status) next.status = status
    if (category !== complaint.category) next.category = category
    if (priority !== complaint.priority) next.priority = priority
    const currentDept = complaint.department?.id ?? UNASSIGNED
    if (departmentId !== currentDept && departmentId !== UNASSIGNED) {
      next.department_id = departmentId
    }
    if (note.trim()) next.note = note.trim()
    return next
  }, [
    status,
    category,
    priority,
    departmentId,
    note,
    complaint.status,
    complaint.category,
    complaint.priority,
    complaint.department?.id,
  ])

  const dirty = Object.keys(patch).length > 0
  const onlyNote = dirty && Object.keys(patch).length === 1 && 'note' in patch

  const submit = () => {
    if (!dirty) return
    setConflict(null)
    update.mutate(
      { id: complaint.id, patch },
      {
        onSuccess: () => setNote(''),
        onError: (error) => {
          if (isApiError(error) && error.status === 409) {
            setConflict(error.message)
            // The optimistic hook already toasts a generic failure; make the
            // reason unmissable.
            toast.error('Illegal status transition', { description: error.message })
          }
        },
      },
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="gap-1">
        <h2 className="text-base font-semibold">Take action</h2>
        <p className="text-sm text-muted-foreground">
          Changes are written as one PATCH and appended to the audit trail.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {terminal ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-warning/35 bg-warning/10 p-3 dark:bg-warning/14">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <p className="text-sm leading-relaxed">
              This complaint is{' '}
              <span className="font-medium">{STATUS_META[complaint.status].label}</span>,
              which is a terminal state. The API rejects any further status change with a
              409 conflict. Category, priority, department and notes can still be corrected.
            </p>
          </div>
        ) : null}

        {conflict ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-destructive/35 bg-destructive/10 p-3 dark:bg-destructive/14"
          >
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden
            />
            <p className="text-sm leading-relaxed">{conflict}</p>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="action-status">Status</Label>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as Status)}
            disabled={terminal || update.isPending}
          >
            <SelectTrigger id="action-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        'size-2 rounded-full',
                        STATUS_META[option.value].dotClass,
                      )}
                      aria-hidden
                    />
                    {option.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Currently <StatusBadge status={complaint.status} size="sm" dot />
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="action-department">Department</Label>
          <Select
            value={departmentId}
            onValueChange={setDepartmentId}
            disabled={update.isPending}
          >
            <SelectTrigger id="action-department" className="w-full">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={UNASSIGNED} disabled>
                Unassigned
              </SelectItem>
              {departments.map((department) => (
                <SelectItem key={department.id} value={department.id}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="action-category">Category override</Label>
            <Select
              value={category}
              onValueChange={(value) => setCategory(value as Category)}
              disabled={update.isPending}
            >
              <SelectTrigger id="action-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="action-priority">Priority override</Label>
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as Priority)}
              disabled={update.isPending}
            >
              <SelectTrigger id="action-priority" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {complaint.ai &&
        (complaint.ai.category !== category || complaint.ai.priority !== priority) ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            The analyzer proposed{' '}
            <span className="font-medium text-foreground">{complaint.ai.category}</span> /{' '}
            <span className="font-medium text-foreground">{complaint.ai.priority}</span>.
            Overriding is normal — the AI is a triage assistant, not the decision-maker.
          </p>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="action-note">Note for the audit trail</Label>
          <Textarea
            id="action-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Crew dispatched; expect completion by Friday."
            rows={3}
            maxLength={1000}
            disabled={update.isPending}
          />
          <p className="text-xs text-muted-foreground">
            {onlyNote
              ? 'A note on its own is recorded against the current status.'
              : 'Attached to the status event this change creates.'}
          </p>
        </div>

        <Button onClick={submit} disabled={!dirty || update.isPending} className="w-full">
          {update.isPending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Save className="size-4" aria-hidden />
          )}
          {update.isPending ? 'Saving…' : dirty ? 'Apply changes' : 'No changes to apply'}
        </Button>
      </CardContent>
    </Card>
  )
}
