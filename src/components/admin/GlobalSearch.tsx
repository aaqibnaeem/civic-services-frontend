/**
 * Global search (⌘K / Ctrl-K).
 *
 * Hits `GET /complaints?q=` directly — the same server-side full-text search the
 * inbox uses — so results are authoritative rather than a scan of whatever the
 * table happens to have loaded. Typing a reference code jumps straight to it.
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChartNoAxesCombined, Inbox, LoaderCircle, Search } from 'lucide-react'

import { CategoryBadge } from '@/components/CategoryBadge'
import { PriorityBadge } from '@/components/PriorityBadge'
import { StatusBadge } from '@/components/StatusBadge'
import { ReferenceCode } from '@/components/ReferenceCode'
import { useComplaints, useDebouncedValue } from '@/hooks'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

export function GlobalSearch({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const debounced = useDebouncedValue(query.trim(), 300)

  const results = useComplaints(
    { q: debounced, page_size: 8, sort: 'created_at', order: 'desc' },
    open && debounced.length >= 2,
  )

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const go = (path: string) => {
    setOpen(false)
    setQuery('')
    navigate(path)
  }

  const items = results.data?.items ?? []

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className={cn(
          'gap-2 text-muted-foreground sm:min-w-56 sm:justify-start',
          className,
        )}
        aria-label="Search complaints"
      >
        <Search className="size-4" aria-hidden />
        <span className="hidden sm:inline">Search complaints…</span>
        <kbd className="ml-auto hidden rounded border bg-muted px-1.5 font-mono text-[0.625rem] sm:inline">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search complaints"
        description="Search by description, reference code or location."
        className="max-w-2xl"
      >
        {/* The server already filtered and ranked; cmdk must not re-filter. */}
        <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search by description, reference code or location…"
        />
        <CommandList>
          {debounced.length < 2 ? (
            <CommandEmpty>Type at least two characters to search.</CommandEmpty>
          ) : results.isFetching && items.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Searching the complaint database…
            </div>
          ) : items.length === 0 ? (
            <CommandEmpty>No complaints match “{debounced}”.</CommandEmpty>
          ) : (
            <CommandGroup
              heading={`${results.data?.total ?? 0} match${
                (results.data?.total ?? 0) === 1 ? '' : 'es'
              } — showing the ${items.length} most recent`}
            >
              {items.map((complaint) => (
                <CommandItem
                  key={complaint.id}
                  value={`${complaint.reference_code} ${complaint.title} ${complaint.location_text}`}
                  onSelect={() => go(`/admin/complaints/${complaint.id}`)}
                  className="flex-col items-start gap-1.5"
                >
                  <div className="flex w-full items-center gap-2">
                    <ReferenceCode code={complaint.reference_code} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {complaint.title}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CategoryBadge category={complaint.category} size="sm" short />
                    <PriorityBadge
                      priority={complaint.priority}
                      size="sm"
                      showIcon={false}
                    />
                    <StatusBadge status={complaint.status} size="sm" dot />
                    <span className="truncate text-xs text-muted-foreground">
                      {complaint.location_text}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />
          <CommandGroup heading="Go to">
            <CommandItem
              value="inbox triage complaints"
              onSelect={() =>
                go(debounced ? `/admin?q=${encodeURIComponent(debounced)}` : '/admin')
              }
            >
              <Inbox className="size-4" aria-hidden />
              {debounced
                ? `Search “${debounced}” in the full inbox`
                : 'Open the triage inbox'}
            </CommandItem>
            <CommandItem value="analytics statistics" onSelect={() => go('/admin/analytics')}>
              <ChartNoAxesCombined className="size-4" aria-hidden />
              Open the analytics dashboard
            </CommandItem>
          </CommandGroup>
        </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
