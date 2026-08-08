/**
 * One filter row, above everything it scopes.
 *
 * Every analytics endpoint takes the same `{date_from, date_to, category, area}`
 * object, so a single piece of page state drives all eight requests and the
 * numbers on screen always agree with each other. Date presets are rows, not a
 * calendar grid — nobody wants to fight a date picker for "last 30 days".
 */

import { CalendarRange, Check, RotateCcw } from 'lucide-react'
import { format, subDays } from 'date-fns'

import { CATEGORY_OPTIONS } from '@/lib/domain'
import type { AnalyticsFilters, Category } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ALL = '__all__'

export interface DatePreset {
  id: string
  label: string
  days: number | null
}

export const DATE_PRESETS: DatePreset[] = [
  { id: '7', label: 'Last 7 days', days: 7 },
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: '90', label: 'Last 90 days', days: 90 },
  { id: '365', label: 'Last 12 months', days: 365 },
  { id: 'all', label: 'All time', days: null },
]

const iso = (date: Date) => format(date, 'yyyy-MM-dd')

export function presetToFilters(preset: DatePreset): Pick<
  AnalyticsFilters,
  'date_from' | 'date_to'
> {
  if (preset.days === null) return { date_from: null, date_to: null }
  const today = new Date()
  return { date_from: iso(subDays(today, preset.days - 1)), date_to: iso(today) }
}

/** Which preset (if any) the current range corresponds to. */
export function matchPreset(filters: AnalyticsFilters): string {
  if (!filters.date_from && !filters.date_to) return 'all'
  for (const preset of DATE_PRESETS) {
    if (preset.days === null) continue
    const candidate = presetToFilters(preset)
    if (
      candidate.date_from === filters.date_from &&
      candidate.date_to === filters.date_to
    ) {
      return preset.id
    }
  }
  return 'custom'
}

export interface AnalyticsFilterBarProps {
  filters: AnalyticsFilters
  onChange: (filters: AnalyticsFilters) => void
  /** Area names to offer. Derive from an unfiltered `/analytics/areas` call. */
  areas?: string[]
  /** True while any of the eight analytics queries is refetching. */
  busy?: boolean
  className?: string
}

export function AnalyticsFilterBar({
  filters,
  onChange,
  areas = [],
  busy = false,
  className,
}: AnalyticsFilterBarProps) {
  const activePreset = matchPreset(filters)
  const presetLabel =
    activePreset === 'custom'
      ? `${filters.date_from ?? '…'} → ${filters.date_to ?? '…'}`
      : (DATE_PRESETS.find((p) => p.id === activePreset)?.label ?? 'All time')

  const isFiltered =
    Boolean(filters.date_from) ||
    Boolean(filters.date_to) ||
    Boolean(filters.category) ||
    Boolean(filters.area)

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2.5',
        className,
      )}
      role="group"
      aria-label="Dashboard filters"
    >
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <CalendarRange className="size-4" aria-hidden />
            <span className="max-w-56 truncate">{presetLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-1.5">
          <div className="flex flex-col">
            {DATE_PRESETS.map((preset) => {
              const selected = activePreset === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onChange({ ...filters, ...presetToFilters(preset) })}
                  className={cn(
                    'flex items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
                    'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    selected && 'font-medium text-foreground',
                  )}
                >
                  {preset.label}
                  {selected ? <Check className="size-4 text-primary" aria-hidden /> : null}
                </button>
              )
            })}
          </div>

          <div className="mt-1.5 space-y-2 border-t pt-2.5">
            <p className="px-1 text-xs font-medium text-muted-foreground">Custom range</p>
            <div className="flex items-center gap-2 px-1">
              <div className="flex-1 space-y-1">
                <Label htmlFor="analytics-from" className="text-[0.6875rem]">
                  From
                </Label>
                <Input
                  id="analytics-from"
                  type="date"
                  value={filters.date_from ?? ''}
                  max={filters.date_to ?? undefined}
                  onChange={(event) =>
                    onChange({ ...filters, date_from: event.target.value || null })
                  }
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label htmlFor="analytics-to" className="text-[0.6875rem]">
                  To
                </Label>
                <Input
                  id="analytics-to"
                  type="date"
                  value={filters.date_to ?? ''}
                  min={filters.date_from ?? undefined}
                  onChange={(event) =>
                    onChange({ ...filters, date_to: event.target.value || null })
                  }
                />
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Select
        value={(filters.category as string) || ALL}
        onValueChange={(value) =>
          onChange({ ...filters, category: value === ALL ? null : (value as Category) })
        }
      >
        <SelectTrigger size="sm" className="w-44" aria-label="Filter by category">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All categories</SelectItem>
          {CATEGORY_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.area || ALL}
        onValueChange={(value) =>
          onChange({ ...filters, area: value === ALL ? null : value })
        }
      >
        <SelectTrigger size="sm" className="w-40" aria-label="Filter by area">
          <SelectValue placeholder="All areas" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All areas</SelectItem>
          {areas.map((area) => (
            <SelectItem key={area} value={area}>
              {area}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isFiltered ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            onChange({ date_from: null, date_to: null, category: null, area: null })
          }
        >
          <RotateCcw className="size-4" aria-hidden />
          Reset
        </Button>
      ) : null}

      <span
        aria-live="polite"
        className={cn(
          'ml-auto text-xs text-muted-foreground transition-opacity',
          busy ? 'opacity-100' : 'opacity-0',
        )}
      >
        Recomputing…
      </span>
    </div>
  )
}
