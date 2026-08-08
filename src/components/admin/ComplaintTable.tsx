/**
 * The triage table.
 *
 * Dense on desktop, cards on mobile, and every column that can be sorted is
 * sorted BY THE SERVER — the header just rewrites the query string. Row density
 * comes from `uiStore` via the `data-density` attribute the admin shell sets.
 */

import { Link, useNavigate } from 'react-router-dom'
import { formatDistanceToNowStrict, parseISO } from 'date-fns'
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  Ellipsis,
  LoaderCircle,
  Sparkles,
  UserRound,
} from 'lucide-react'

import { AiSourceBadge } from '@/components/AiSourceBadge'
import { CategoryBadge } from '@/components/CategoryBadge'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
import { PriorityBadge } from '@/components/PriorityBadge'
import { ReferenceCode } from '@/components/ReferenceCode'
import { StatusBadge } from '@/components/StatusBadge'
import { STATUS_META, STATUS_OPTIONS, formatHours } from '@/lib/domain'
import type { Complaint, SortField, SortOrder, Status } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/* ========================================================================== */
/* Helpers                                                                    */
/* ========================================================================== */

export function complaintAge(createdAt: string): string {
  try {
    return formatDistanceToNowStrict(parseISO(createdAt), { addSuffix: false })
  } catch {
    return '—'
  }
}

/** `resolved` and `rejected` are terminal — the API returns 409 on any move out. */
export function allowedTransitions(status: Status): Status[] {
  if (STATUS_META[status].terminal) return []
  return STATUS_OPTIONS.map((option) => option.value).filter((value) => value !== status)
}

/**
 * Who is carrying this complaint.
 *
 * "Unassigned" is drawn as a real state rather than an em dash: roughly 800
 * seeded rows predate assignment and will read `assignee: null` forever, and a
 * complaint nobody owns is exactly the thing a triage screen should make
 * visible.
 */
export function AssigneeCell({
  complaint,
  className,
}: {
  complaint: Complaint
  className?: string
}) {
  if (!complaint.assignee) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full border border-dashed border-muted-foreground/40 px-1.5 py-0.5 text-[0.6875rem] font-medium text-muted-foreground',
          className,
        )}
      >
        <UserRound className="size-3" aria-hidden />
        Unassigned
      </span>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('block min-w-0 cursor-help truncate', className)}>
          {complaint.assignee.full_name || complaint.assignee.email}
        </span>
      </TooltipTrigger>
      <TooltipContent className="block max-w-xs space-y-0.5 py-2">
        <span className="block font-semibold">
          {complaint.assignee.full_name || complaint.assignee.email}
        </span>
        <span className="block opacity-90">{complaint.assignee.email}</span>
        {complaint.assigned_at ? (
          <span className="block text-xs opacity-75">
            Assigned {complaintAge(complaint.assigned_at)} ago
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  )
}

/* ========================================================================== */
/* Sortable header                                                            */
/* ========================================================================== */

interface SortHeaderProps {
  field: SortField
  label: string
  activeField: SortField | undefined
  order: SortOrder | undefined
  onSort: (field: SortField) => void
  className?: string
}

function SortHeader({
  field,
  label,
  activeField,
  order,
  onSort,
  className,
}: SortHeaderProps) {
  const active = activeField === field
  const Icon = !active ? ChevronsUpDown : order === 'asc' ? ArrowUp : ArrowDown

  return (
    <TableHead className={className} aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={cn(
          '-mx-1 inline-flex items-center gap-1 rounded-sm px-1 py-0.5 transition-colors',
          'hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
          active ? 'font-semibold text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
        <Icon className="size-3.5 opacity-70" aria-hidden />
      </button>
    </TableHead>
  )
}

/* ========================================================================== */
/* Quick status control                                                       */
/* ========================================================================== */

export interface StatusQuickChangeProps {
  complaint: Complaint
  onChange: (status: Status) => void
  /** Open the staff picker for this row. Omitted where assignment is unavailable. */
  onAssign?: (complaint: Complaint) => void
  /** Run the workload rule server-side for this row. */
  onAutoAssign?: (complaint: Complaint) => void
  pending?: boolean
  align?: 'start' | 'end'
}

export function StatusQuickChange({
  complaint,
  onChange,
  onAssign,
  onAutoAssign,
  pending = false,
  align = 'end',
}: StatusQuickChangeProps) {
  const transitions = allowedTransitions(complaint.status)
  const terminal = STATUS_META[complaint.status].terminal

  if (terminal) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <Button variant="ghost" size="icon-sm" disabled aria-label="Status is final">
              <Ellipsis className="size-4" aria-hidden />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-56">
          {STATUS_META[complaint.status].label} is a terminal state — the API rejects any
          further transition with a 409. Reopen it from the detail page audit trail if this
          was a mistake.
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Change status of ${complaint.reference_code}`}
          onClick={(event) => event.stopPropagation()}
          disabled={pending}
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden />
          ) : (
            <Ellipsis className="size-4" aria-hidden />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-52">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Move {complaint.reference_code} to
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {transitions.map((status) => {
          const meta = STATUS_META[status]
          return (
            <DropdownMenuItem
              key={status}
              onSelect={() => onChange(status)}
              className="gap-2"
            >
              <span className={cn('size-2 rounded-full', meta.dotClass)} aria-hidden />
              {meta.action}
              <span className="ml-auto text-xs text-muted-foreground">{meta.label}</span>
            </DropdownMenuItem>
          )
        })}

        {onAssign || onAutoAssign ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
              Ownership
            </DropdownMenuLabel>
            {onAssign ? (
              <DropdownMenuItem onSelect={() => onAssign(complaint)} className="gap-2">
                <UserRound className="size-3.5" aria-hidden />
                {complaint.assignee ? 'Reassign…' : 'Assign to…'}
              </DropdownMenuItem>
            ) : null}
            {onAutoAssign ? (
              <DropdownMenuItem onSelect={() => onAutoAssign(complaint)} className="gap-2">
                <Sparkles className="size-3.5" aria-hidden />
                Auto-assign
              </DropdownMenuItem>
            ) : null}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/* ========================================================================== */
/* Table                                                                      */
/* ========================================================================== */

export interface ComplaintTableProps {
  complaints: Complaint[]
  sort: SortField | undefined
  order: SortOrder | undefined
  onSort: (field: SortField) => void
  onStatusChange: (complaint: Complaint, status: Status) => void
  onAssign?: (complaint: Complaint) => void
  onAutoAssign?: (complaint: Complaint) => void
  pendingId?: string | null
  className?: string
}

export function ComplaintTable({
  complaints,
  sort,
  order,
  onSort,
  onStatusChange,
  onAssign,
  onAutoAssign,
  pendingId,
  className,
}: ComplaintTableProps) {
  const navigate = useNavigate()

  return (
    <div className={cn('overflow-hidden rounded-xl border', className)}>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-28">Reference</TableHead>
            <TableHead className="min-w-44">Complaint</TableHead>
            <TableHead className="w-28">Category</TableHead>
            <SortHeader
              field="priority"
              label="Priority"
              activeField={sort}
              order={order}
              onSort={onSort}
              className="w-24"
            />
            <SortHeader
              field="status"
              label="Status"
              activeField={sort}
              order={order}
              onSort={onSort}
              className="w-32"
            />
            <TableHead className="hidden w-32 lg:table-cell">Assignee</TableHead>
            <TableHead className="hidden w-36 2xl:table-cell">Department</TableHead>
            <TableHead className="hidden w-28 xl:table-cell">Area</TableHead>
            <SortHeader
              field="created_at"
              label="Age"
              activeField={sort}
              order={order}
              onSort={onSort}
              className="w-20"
            />
            <SortHeader
              field="resolution_hours"
              label="Resolved in"
              activeField={sort}
              order={order}
              onSort={onSort}
              className="hidden w-24 2xl:table-cell"
            />
            <TableHead className="w-32">AI</TableHead>
            <TableHead className="w-10">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {complaints.map((complaint) => (
            <TableRow
              key={complaint.id}
              onClick={() => navigate(`/admin/complaints/${complaint.id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') navigate(`/admin/complaints/${complaint.id}`)
              }}
              tabIndex={0}
              className="cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <TableCell className="align-top">
                <ReferenceCode code={complaint.reference_code} size="sm" />
              </TableCell>

              <TableCell className="max-w-56 align-top">
                <p className="truncate font-medium">{complaint.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {complaint.location_text}
                </p>
              </TableCell>

              <TableCell className="align-top">
                <CategoryBadge category={complaint.category} size="sm" short />
              </TableCell>

              <TableCell className="align-top">
                <PriorityBadge priority={complaint.priority} size="sm" showIcon={false} />
              </TableCell>

              <TableCell className="align-top">
                <StatusBadge status={complaint.status} size="sm" dot />
              </TableCell>

              <TableCell className="hidden max-w-32 align-top text-xs lg:table-cell">
                <AssigneeCell complaint={complaint} />
              </TableCell>

              <TableCell className="hidden max-w-36 align-top text-xs text-muted-foreground 2xl:table-cell">
                <span className="block truncate">{complaint.department?.name ?? '—'}</span>
              </TableCell>

              <TableCell className="hidden align-top text-xs text-muted-foreground xl:table-cell">
                {complaint.area ?? '—'}
              </TableCell>

              <TableCell className="align-top tabular text-xs whitespace-nowrap">
                {complaintAge(complaint.created_at)}
              </TableCell>

              <TableCell className="hidden align-top tabular text-xs whitespace-nowrap text-muted-foreground 2xl:table-cell">
                {complaint.resolution_hours === null
                  ? '—'
                  : formatHours(complaint.resolution_hours)}
              </TableCell>

              <TableCell className="align-top">
                {complaint.ai ? (
                  <div className="space-y-1">
                    <AiSourceBadge
                      source={complaint.ai.source}
                      size="sm"
                      modelName={complaint.ai.model_name}
                      latencyMs={complaint.ai.latency_ms}
                    />
                    <ConfidenceMeter value={complaint.ai.confidence} variant="compact" />
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {complaint.ai_status === 'pending' ? 'Analysing…' : 'Not analysed'}
                  </span>
                )}
              </TableCell>

              <TableCell
                className="align-top"
                onClick={(event) => event.stopPropagation()}
              >
                <StatusQuickChange
                  complaint={complaint}
                  pending={pendingId === complaint.id}
                  onChange={(status) => onStatusChange(complaint, status)}
                  onAssign={onAssign}
                  onAutoAssign={onAutoAssign}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/* ========================================================================== */
/* Mobile cards                                                               */
/* ========================================================================== */

export interface ComplaintCardsProps {
  complaints: Complaint[]
  onStatusChange: (complaint: Complaint, status: Status) => void
  onAssign?: (complaint: Complaint) => void
  onAutoAssign?: (complaint: Complaint) => void
  pendingId?: string | null
  className?: string
}

export function ComplaintCards({
  complaints,
  onStatusChange,
  onAssign,
  onAutoAssign,
  pendingId,
  className,
}: ComplaintCardsProps) {
  return (
    <ul className={cn('space-y-3', className)}>
      {complaints.map((complaint) => (
        <li key={complaint.id} className="rounded-xl border bg-card p-3.5">
          <div className="flex items-start justify-between gap-2">
            <Link
              to={`/admin/complaints/${complaint.id}`}
              className="min-w-0 flex-1 rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ReferenceCode code={complaint.reference_code} size="sm" />
              <p className="mt-1.5 line-clamp-2 text-sm font-medium">{complaint.title}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {complaint.location_text}
              </p>
            </Link>
            <StatusQuickChange
              complaint={complaint}
              pending={pendingId === complaint.id}
              onChange={(status) => onStatusChange(complaint, status)}
              onAssign={onAssign}
              onAutoAssign={onAutoAssign}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <CategoryBadge category={complaint.category} size="sm" short />
            <PriorityBadge priority={complaint.priority} size="sm" showIcon={false} />
            <StatusBadge status={complaint.status} size="sm" dot />
            {complaint.ai ? (
              <AiSourceBadge
                source={complaint.ai.source}
                size="sm"
                modelName={complaint.ai.model_name}
                latencyMs={complaint.ai.latency_ms}
              />
            ) : null}
          </div>

          <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{complaint.area ?? 'Unknown area'}</span>
            <span aria-hidden>·</span>
            <span className="tabular">{complaintAge(complaint.created_at)} old</span>
            {complaint.department ? (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{complaint.department.name}</span>
              </>
            ) : null}
            <span aria-hidden>·</span>
            <AssigneeCell complaint={complaint} className="max-w-40" />
          </p>
        </li>
      ))}
    </ul>
  )
}

/* ========================================================================== */
/* Skeleton                                                                   */
/* ========================================================================== */

export function ComplaintTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex items-center gap-4 border-b bg-muted/40 px-3 py-2.5">
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton key={i} className={cn('h-3.5 flex-1', i === 1 && 'flex-[2.5]')} />
        ))}
      </div>
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className="flex items-center gap-4 border-b px-3 py-3 last:border-b-0"
        >
          {Array.from({ length: 7 }, (_, col) => (
            <Skeleton
              key={col}
              className={cn('h-4 flex-1', col === 1 && 'flex-[2.5]', col === 0 && 'max-w-24')}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
