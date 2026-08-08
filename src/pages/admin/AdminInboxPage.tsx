/**
 * `/admin` — the triage inbox.
 *
 * Server-side everything: search, faceted filters, sorting and pagination are
 * all query parameters. The table never filters or sorts what it already holds,
 * so the row count on screen is always the row count in the database.
 *
 * Filter state lives in the URL (`inbox-filters.ts`), which makes any view
 * shareable and lets the departments page deep-link into a pre-filtered inbox.
 */

import { useEffect, useMemo, useState } from 'react'
import { Inbox, LoaderCircle, RefreshCw, SearchX } from 'lucide-react'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import {
  useAnalyticsAreas,
  useComplaints,
  useDebouncedValue,
  useDepartments,
  useIsMobile,
  useUpdateComplaint,
} from '@/hooks'
import type { Complaint, Status } from '@/lib/api/types'
import { isApiError } from '@/lib/api/client'
import { formatNumber } from '@/lib/domain'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

import {
  ComplaintCards,
  ComplaintTable,
  ComplaintTableSkeleton,
} from '@/components/admin/ComplaintTable'
import { InboxToolbar } from '@/components/admin/InboxToolbar'
import {
  PAGE_SIZE_OPTIONS,
  hasActiveFilters,
  useInboxFilters,
} from '@/components/admin/inbox-filters'

export default function AdminInboxPage() {
  const { filters, setFilters, replaceFilters, clearFilters, toggleFacet, setSort } =
    useInboxFilters()
  const isMobile = useIsMobile()

  // Local search box state so typing stays instant; the URL only updates when
  // the debounce settles, which also keeps the browser history clean.
  const [search, setSearch] = useState(filters.q ?? '')
  const debouncedSearch = useDebouncedValue(search, 350)

  useEffect(() => {
    const next = debouncedSearch.trim()
    if ((filters.q ?? '') !== next) setFilters({ q: next || undefined })
    // `setFilters` is stable per filter object; only react to the debounced value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  // Keep the input in sync when filters are replaced externally (saved view,
  // clear-all, or a deep link).
  useEffect(() => {
    setSearch((current) => (current.trim() === (filters.q ?? '') ? current : (filters.q ?? '')))
  }, [filters.q])

  const complaints = useComplaints(filters)
  const departments = useDepartments()
  const areasQuery = useAnalyticsAreas()
  const update = useUpdateComplaint()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const areas = useMemo(
    () => (areasQuery.data?.areas ?? []).map((area) => area.area),
    [areasQuery.data],
  )

  const page = filters.page ?? 1
  const pageSize = filters.page_size ?? 20
  const total = complaints.data?.total ?? 0
  const pages = complaints.data?.pages ?? 1
  const items = complaints.data?.items ?? []
  const firstRow = total === 0 ? 0 : (page - 1) * pageSize + 1
  const lastRow = Math.min(page * pageSize, total)

  const onStatusChange = (complaint: Complaint, status: Status) => {
    setPendingId(complaint.id)
    update.mutate(
      { id: complaint.id, patch: { status } },
      {
        onError: (error) => {
          // The API rejects illegal transitions with 409 — say so plainly rather
          // than showing a generic failure.
          if (isApiError(error) && error.status === 409) {
            toast.error('That status change is not allowed', {
              description: error.message,
            })
          }
        },
        onSettled: () => setPendingId(null),
      },
    )
  }

  const filtered = hasActiveFilters(filters)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Triage"
        title="Complaint inbox"
        description="Every incoming report, ranked by what needs attention first. Search, filter, sort and update without leaving the page — the backend does all of it, so what you see is what is stored."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void complaints.refetch()}
            disabled={complaints.isFetching}
          >
            <RefreshCw
              className={cn('size-4', complaints.isFetching && 'animate-spin')}
              aria-hidden
            />
            Refresh
          </Button>
        }
      />

      <InboxToolbar
        filters={filters}
        search={search}
        onSearchChange={setSearch}
        onFiltersChange={setFilters}
        onToggleFacet={(key, value) =>
          toggleFacet(key, value as never)
        }
        onClear={() => {
          setSearch('')
          clearFilters()
        }}
        onApplyView={(view) => {
          setSearch(view.q ?? '')
          replaceFilters(view)
        }}
        departments={departments.data ?? []}
        areas={areas}
      />

      {/* --------------------------------------------------------- Results */}
      {complaints.isError ? (
        <ErrorState error={complaints.error} onRetry={() => void complaints.refetch()} />
      ) : complaints.isPending ? (
        <ComplaintTableSkeleton rows={pageSize > 20 ? 12 : 8} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={filtered ? SearchX : Inbox}
          title={filtered ? 'No complaints match these filters' : 'The inbox is empty'}
          description={
            filtered
              ? 'Nothing in the database matches this combination. Loosen a filter or clear them all.'
              : 'No complaints have been submitted yet. New reports appear here the moment a citizen files one.'
          }
          action={
            filtered ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('')
                  clearFilters()
                }}
              >
                Clear all filters
              </Button>
            ) : undefined
          }
          size="lg"
        />
      ) : (
        <div
          className={cn(
            'space-y-4 transition-opacity',
            complaints.isFetching && 'opacity-70',
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="tabular text-sm text-muted-foreground" aria-live="polite">
              Showing{' '}
              <span className="font-medium text-foreground">
                {formatNumber(firstRow)}–{formatNumber(lastRow)}
              </span>{' '}
              of <span className="font-medium text-foreground">{formatNumber(total)}</span>{' '}
              complaint{total === 1 ? '' : 's'}
              {filtered ? ' matching your filters' : ''}
              {complaints.isFetching ? (
                <LoaderCircle
                  className="ml-2 inline size-3.5 animate-spin align-[-2px]"
                  aria-hidden
                />
              ) : null}
            </p>

            <div className="flex items-center gap-2">
              <label
                htmlFor="page-size"
                className="text-xs text-muted-foreground"
              >
                Rows
              </label>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => setFilters({ page_size: Number(value) })}
              >
                <SelectTrigger id="page-size" size="sm" className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isMobile ? (
            <ComplaintCards
              complaints={items}
              onStatusChange={onStatusChange}
              pendingId={pendingId}
            />
          ) : (
            <ComplaintTable
              complaints={items}
              sort={filters.sort}
              order={filters.order}
              onSort={setSort}
              onStatusChange={onStatusChange}
              pendingId={pendingId}
            />
          )}

          {/* ------------------------------------------------- Pagination */}
          <nav
            className="flex flex-wrap items-center justify-between gap-3"
            aria-label="Pagination"
          >
            <p className="tabular text-sm text-muted-foreground">
              Page {formatNumber(page)} of {formatNumber(pages)}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setFilters({ page: 1 })}
              >
                First
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setFilters({ page: page - 1 })}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setFilters({ page: page + 1 })}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => setFilters({ page: pages })}
              >
                Last
              </Button>
            </div>
          </nav>
        </div>
      )}
    </div>
  )
}
