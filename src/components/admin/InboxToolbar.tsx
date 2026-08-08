/**
 * Filter row for the triage inbox: search, facets, date range, saved views and
 * the removable chip summary.
 *
 * Everything writes to the URL (see `inbox-filters.ts`), which is what the
 * server query is built from. Saved views persist to `uiStore`.
 */

import { useState } from 'react'
import {
  Bookmark,
  BookmarkPlus,
  CalendarRange,
  Building2,
  Funnel,
  MapPin,
  Rows3,
  Search,
  SignalHigh,
  Tag,
  Trash2,
  UserCheck,
  UserRound,
  X,
} from 'lucide-react'

import {
  CATEGORY_META,
  CATEGORY_OPTIONS,
  PRIORITY_META,
  PRIORITY_OPTIONS,
  STATUS_META,
  STATUS_OPTIONS,
} from '@/lib/domain'
import type {
  Category,
  ComplaintFilters,
  Department,
  Priority,
  StaffMember,
  Status,
} from '@/lib/api/types'
import { useUiStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

import { FacetFilter } from './FacetFilter'
import { hasActiveFilters } from './inbox-filters'

export interface InboxToolbarProps {
  filters: ComplaintFilters
  search: string
  onSearchChange: (value: string) => void
  onFiltersChange: (patch: Partial<ComplaintFilters>) => void
  onToggleFacet: (
    key: 'category' | 'priority' | 'status',
    value: string,
  ) => void
  onClear: () => void
  onApplyView: (filters: ComplaintFilters) => void
  departments: Department[]
  areas: string[]
  /**
   * Staff directory for the assignee facet. Empty when `GET /staff` is not
   * available to this account (it is admin-only) — the facet then hides itself
   * rather than offering an empty dropdown, but "Assigned to me" still works
   * because that filter needs no directory at all.
   */
  staff?: StaffMember[]
  className?: string
}

export function InboxToolbar({
  filters,
  search,
  onSearchChange,
  onFiltersChange,
  onToggleFacet,
  onClear,
  onApplyView,
  departments,
  areas,
  staff = [],
  className,
}: InboxToolbarProps) {
  const savedViews = useUiStore((s) => s.savedViews)
  const saveView = useUiStore((s) => s.saveView)
  const removeView = useUiStore((s) => s.removeView)
  const density = useUiStore((s) => s.density)
  const setDensity = useUiStore((s) => s.setDensity)

  const [viewName, setViewName] = useState('')
  const [saveOpen, setSaveOpen] = useState(false)

  const active = hasActiveFilters(filters)
  const departmentName = departments.find((d) => d.id === filters.department_id)?.name
  const assignee = staff.find((member) => member.id === filters.assignee_id)
  const staffName = (member: StaffMember) => member.full_name || member.email

  /** `mine` and a named assignee are two answers to one question — never both. */
  const toggleMine = () =>
    onFiltersChange({ mine: filters.mine ? undefined : true, assignee_id: undefined })
  const selectAssignee = (value: string | undefined) =>
    onFiltersChange({ assignee_id: value, mine: undefined })

  const chips: Array<{ key: string; label: string; onRemove: () => void }> = []
  if (filters.q) {
    chips.push({
      key: 'q',
      label: `“${filters.q}”`,
      onRemove: () => onSearchChange(''),
    })
  }
  for (const value of filters.category ?? []) {
    chips.push({
      key: `category-${value}`,
      label: CATEGORY_META[value].label,
      onRemove: () => onToggleFacet('category', value),
    })
  }
  for (const value of filters.priority ?? []) {
    chips.push({
      key: `priority-${value}`,
      label: `${PRIORITY_META[value].label} priority`,
      onRemove: () => onToggleFacet('priority', value),
    })
  }
  for (const value of filters.status ?? []) {
    chips.push({
      key: `status-${value}`,
      label: STATUS_META[value].label,
      onRemove: () => onToggleFacet('status', value),
    })
  }
  if (filters.department_id) {
    chips.push({
      key: 'department',
      label: departmentName ?? 'Department',
      onRemove: () => onFiltersChange({ department_id: undefined }),
    })
  }
  if (filters.mine) {
    chips.push({
      key: 'mine',
      label: 'Assigned to me',
      onRemove: () => onFiltersChange({ mine: undefined }),
    })
  }
  if (filters.assignee_id) {
    chips.push({
      key: 'assignee',
      label: assignee ? `Assigned to ${staffName(assignee)}` : 'One assignee',
      onRemove: () => selectAssignee(undefined),
    })
  }
  if (filters.area) {
    chips.push({
      key: 'area',
      label: filters.area,
      onRemove: () => onFiltersChange({ area: undefined }),
    })
  }
  if (filters.date_from || filters.date_to) {
    chips.push({
      key: 'dates',
      label: `${filters.date_from ?? 'start'} → ${filters.date_to ?? 'today'}`,
      onRemove: () => onFiltersChange({ date_from: undefined, date_to: undefined }),
    })
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1 sm:max-w-80">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search description, reference, location…"
            aria-label="Search complaints"
            className="pl-8"
          />
          {search ? (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>

        <FacetFilter
          label="Category"
          icon={Tag}
          options={CATEGORY_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
            dotClass: CATEGORY_META[option.value].dotClass,
          }))}
          selected={filters.category ?? []}
          onToggle={(value) => onToggleFacet('category', value as Category)}
          onClear={() => onFiltersChange({ category: undefined })}
        />

        <FacetFilter
          label="Priority"
          icon={SignalHigh}
          options={PRIORITY_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
            dotClass: PRIORITY_META[option.value].dotClass,
          }))}
          selected={filters.priority ?? []}
          onToggle={(value) => onToggleFacet('priority', value as Priority)}
          onClear={() => onFiltersChange({ priority: undefined })}
        />

        <FacetFilter
          label="Status"
          icon={Funnel}
          options={STATUS_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
            dotClass: STATUS_META[option.value].dotClass,
          }))}
          selected={filters.status ?? []}
          onToggle={(value) => onToggleFacet('status', value as Status)}
          onClear={() => onFiltersChange({ status: undefined })}
        />

        <FacetFilter
          label="Department"
          icon={Building2}
          single
          options={departments.map((department) => ({
            value: department.id,
            label: department.name,
            count: department.open_complaints,
          }))}
          selected={filters.department_id ? [filters.department_id] : []}
          onToggle={(value) =>
            onFiltersChange({
              department_id: filters.department_id === value ? undefined : value,
            })
          }
          onClear={() => onFiltersChange({ department_id: undefined })}
        />

        {staff.length > 0 ? (
          <FacetFilter
            label="Assignee"
            icon={UserRound}
            single
            options={staff.map((member) => ({
              value: member.id,
              label: member.is_available === false
                ? `${staffName(member)} · unavailable`
                : staffName(member),
              count: member.active_assignments ?? undefined,
            }))}
            selected={filters.assignee_id ? [filters.assignee_id] : []}
            onToggle={(value) =>
              selectAssignee(filters.assignee_id === value ? undefined : value)
            }
            onClear={() => selectAssignee(undefined)}
          />
        ) : null}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={filters.mine ? 'default' : 'outline'}
              size="sm"
              aria-pressed={Boolean(filters.mine)}
              onClick={toggleMine}
              className={cn('gap-1.5', !filters.mine && 'border-dashed')}
            >
              <UserCheck className="size-4" aria-hidden />
              Assigned to me
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-56">
            Only complaints assigned to the account you are signed in as. Filtered by the server
            (<code>mine=true</code>), so the count is the real one.
          </TooltipContent>
        </Tooltip>

        <FacetFilter
          label="Area"
          icon={MapPin}
          single
          options={areas.map((area) => ({ value: area, label: area }))}
          selected={filters.area ? [filters.area] : []}
          onToggle={(value) =>
            onFiltersChange({ area: filters.area === value ? undefined : value })
          }
          onClear={() => onFiltersChange({ area: undefined })}
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'gap-1.5 border-dashed',
                (filters.date_from || filters.date_to) && 'border-solid',
              )}
            >
              <CalendarRange className="size-4" aria-hidden />
              Dates
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <div className="space-y-1.5">
              <Label htmlFor="inbox-from" className="text-xs">
                Reported from
              </Label>
              <Input
                id="inbox-from"
                type="date"
                value={filters.date_from ?? ''}
                max={filters.date_to ?? undefined}
                onChange={(event) =>
                  onFiltersChange({ date_from: event.target.value || undefined })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inbox-to" className="text-xs">
                Reported to
              </Label>
              <Input
                id="inbox-to"
                type="date"
                value={filters.date_to ?? ''}
                min={filters.date_from ?? undefined}
                onChange={(event) =>
                  onFiltersChange({ date_to: event.target.value || undefined })
                }
              />
            </div>
            {(filters.date_from || filters.date_to) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFiltersChange({ date_from: undefined, date_to: undefined })}
              >
                Clear dates
              </Button>
            )}
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex items-center gap-2">
          {/* Saved views */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Bookmark className="size-4" aria-hidden />
                Views
                {savedViews.length ? (
                  <span className="tabular text-xs text-muted-foreground">
                    {savedViews.length}
                  </span>
                ) : null}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Saved filter views
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {savedViews.length === 0 ? (
                <p className="px-2 py-3 text-xs text-muted-foreground">
                  No saved views yet. Filter the inbox, then save it.
                </p>
              ) : (
                savedViews.map((view) => (
                  <DropdownMenuItem
                    key={view.id}
                    onSelect={() => onApplyView(view.filters)}
                    className="gap-2"
                  >
                    <Bookmark className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{view.name}</span>
                    <button
                      type="button"
                      aria-label={`Delete view ${view.name}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        event.preventDefault()
                        removeView(view.id)
                      }}
                      className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                    </button>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Popover open={saveOpen} onOpenChange={setSaveOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={!active} className="gap-1.5">
                <BookmarkPlus className="size-4" aria-hidden />
                <span className="hidden sm:inline">Save view</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64">
              <Label htmlFor="view-name" className="text-xs">
                Name this view
              </Label>
              <Input
                id="view-name"
                value={viewName}
                onChange={(event) => setViewName(event.target.value)}
                placeholder="Critical & open in Lyari"
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && viewName.trim()) {
                    saveView(viewName, filters)
                    setViewName('')
                    setSaveOpen(false)
                  }
                }}
              />
              <Button
                size="sm"
                disabled={!viewName.trim()}
                onClick={() => {
                  saveView(viewName, filters)
                  setViewName('')
                  setSaveOpen(false)
                }}
              >
                Save
              </Button>
            </PopoverContent>
          </Popover>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Toggle row density"
                aria-pressed={density === 'compact'}
                onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
              >
                <Rows3 className="size-4" aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {density === 'compact' ? 'Comfortable rows' : 'Compact rows'}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Filters:</span>
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex h-6 items-center gap-1 rounded-full border bg-muted/60 pr-1 pl-2.5 text-xs"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remove filter ${chip.label}`}
                className="rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <X className="size-3" aria-hidden />
              </button>
            </span>
          ))}
          <Button variant="ghost" size="xs" onClick={onClear}>
            Clear all
          </Button>
        </div>
      ) : null}
    </div>
  )
}
