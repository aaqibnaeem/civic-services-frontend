/**
 * A faceted multi-select. Values are pushed straight into the query string and
 * the server does the filtering — the table never filters what it already has.
 */

import type { LucideIcon } from 'lucide-react'
import { Check, Funnel } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

export interface FacetOption {
  value: string
  label: string
  icon?: LucideIcon
  /** Solid swatch class from `@/lib/domain`, e.g. `bg-cat-road`. */
  dotClass?: string
  count?: number
}

export interface FacetFilterProps {
  label: string
  icon?: LucideIcon
  options: FacetOption[]
  selected: string[]
  onToggle: (value: string) => void
  onClear: () => void
  /** Renders a single-select list (used for area / department). */
  single?: boolean
  className?: string
}

export function FacetFilter({
  label,
  icon: Icon = Funnel,
  options,
  selected,
  onToggle,
  onClear,
  single = false,
  className,
}: FacetFilterProps) {
  const selectedSet = new Set(selected)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-1.5 border-dashed', selected.length > 0 && 'border-solid', className)}
        >
          <Icon className="size-4" aria-hidden />
          {label}
          {selected.length > 0 ? (
            <>
              <Separator orientation="vertical" className="mx-0.5 h-4" />
              <span className="tabular rounded-sm bg-primary/12 px-1.5 text-xs font-medium text-primary">
                {selected.length}
              </span>
            </>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-60 p-1.5">
        <div className="max-h-72 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-2.5 py-3 text-sm text-muted-foreground">Nothing to filter by.</p>
          ) : (
            options.map((option) => {
              const isSelected = selectedSet.has(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onToggle(option.value)}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors',
                    'hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                    isSelected && 'font-medium text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
                      single && 'rounded-full',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input',
                    )}
                    aria-hidden
                  >
                    {isSelected ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>

                  {option.dotClass ? (
                    <span
                      className={cn('size-2 shrink-0 rounded-full', option.dotClass)}
                      aria-hidden
                    />
                  ) : option.icon ? (
                    <option.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  ) : null}

                  <span className="min-w-0 flex-1 truncate">{option.label}</span>

                  {option.count !== undefined ? (
                    <span className="tabular shrink-0 text-xs text-muted-foreground">
                      {option.count}
                    </span>
                  ) : null}
                </button>
              )
            })
          )}
        </div>

        {selected.length > 0 ? (
          <>
            <Separator className="my-1.5" />
            <Button variant="ghost" size="sm" className="w-full" onClick={onClear}>
              Clear {label.toLowerCase()}
            </Button>
          </>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
