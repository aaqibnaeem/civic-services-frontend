import { useMemo, useState } from 'react'
import { Check, ChevronsUpDown, UserMinus, UserRound } from 'lucide-react'

import { sortByWorkload } from '@/hooks/useStaff'
import type { StaffMember } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export interface StaffPickerProps {
  staff: StaffMember[]
  /** Currently assigned member id, or null when nobody owns the complaint. */
  value: string | null
  /** Receives a member id, or null for "unassign". */
  onChange: (assigneeId: string | null) => void
  disabled?: boolean
  loading?: boolean
  /** Hide the unassign entry where clearing makes no sense (nothing assigned yet). */
  allowUnassign?: boolean
  placeholder?: string
  id?: string
  className?: string
  /**
   * Render the search list directly instead of behind a popover trigger.
   *
   * Use this inside a dialog: the dialog is already the surface a popover would
   * open into, and nesting the two fights over focus. It also puts the search box
   * in front of the user immediately, which is the point of the control.
   */
  inline?: boolean
}

export function staffLabel(member: StaffMember): string {
  return member.full_name?.trim() || member.email
}

/** `3 active` — omitted entirely when the API did not compute a workload. */
export function workloadLabel(member: StaffMember): string | null {
  const n = member.active_assignments
  return typeof n === 'number' ? `${n} active` : null
}

/**
 * Type-to-search staff picker.
 *
 * A plain `<select>` stops being usable the moment a department has more than a
 * handful of people, and it cannot show *why* one name is a better choice than
 * another. This lists each person with their workload and availability, orders
 * the lightest-loaded first so the sensible pick is already at the top, and
 * filters on name, email and department as you type. Unavailable staff stay
 * visible but unselectable — knowing someone is off is useful; hiding them just
 * looks like the roster is wrong.
 */
export function StaffPicker({
  staff,
  value,
  onChange,
  disabled = false,
  loading = false,
  allowUnassign = true,
  placeholder = 'Search staff by name…',
  id,
  className,
  inline = false,
}: StaffPickerProps) {
  const [open, setOpen] = useState(false)

  const ordered = useMemo(() => sortByWorkload(staff), [staff])
  const selected = useMemo(
    () => staff.find((member) => member.id === value) ?? null,
    [staff, value],
  )

  const triggerLabel = selected
    ? staffLabel(selected)
    : loading
      ? 'Loading staff…'
      : 'Nobody assigned'

  const list = (
    <Command
      filter={(itemValue, search) =>
        itemValue.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
      }
    >
      <CommandInput placeholder={placeholder} />
      <CommandList>
        <CommandEmpty>No staff match that search.</CommandEmpty>

        <CommandGroup heading={ordered.length ? 'Lightest workload first' : undefined}>
          {ordered.map((member) => {
            const unavailable = member.is_available === false
            const load = workloadLabel(member)
            const department = member.department?.name ?? null
            const haystack = [staffLabel(member), member.email, department]
              .filter(Boolean)
              .join(' ')

            return (
              <CommandItem
                key={member.id}
                value={haystack}
                disabled={unavailable}
                onSelect={() => {
                  if (unavailable) return
                  onChange(member.id)
                  setOpen(false)
                }}
                className="gap-2"
              >
                <Check
                  className={cn(
                    'size-4 shrink-0',
                    member.id === value ? 'opacity-100' : 'opacity-0',
                  )}
                  aria-hidden
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm">{staffLabel(member)}</span>
                  {department ? (
                    <span className="truncate text-[0.6875rem] text-muted-foreground">
                      {department}
                    </span>
                  ) : null}
                </span>
                {unavailable ? (
                  <span className="shrink-0 text-[0.6875rem] text-muted-foreground">
                    unavailable
                  </span>
                ) : load ? (
                  <span
                    className={cn(
                      'shrink-0 rounded-full border px-1.5 py-px text-[0.6875rem] tabular-nums',
                      (member.active_assignments ?? 0) === 0
                        ? 'border-success/30 bg-success/10 text-success'
                        : 'text-muted-foreground',
                    )}
                  >
                    {load}
                  </span>
                ) : null}
              </CommandItem>
            )
          })}
        </CommandGroup>

        {allowUnassign && value ? (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="unassign clear remove owner"
                onSelect={() => {
                  onChange(null)
                  setOpen(false)
                }}
                className="gap-2 text-muted-foreground"
              >
                <UserMinus className="size-4 shrink-0" aria-hidden />
                Unassign
              </CommandItem>
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </Command>
  )

  if (inline) {
    return <div className={cn('rounded-md border', className)}>{list}</div>
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn('w-full justify-between font-normal', className)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className={cn('truncate', !selected && 'text-muted-foreground')}>
              {triggerLabel}
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        {list}
      </PopoverContent>
    </Popover>
  )
}
