/**
 * Inbox filter state, serialised into the URL.
 *
 * The URL is the source of truth so a filtered view is shareable, survives a
 * refresh, and can be linked to from elsewhere in the admin (the departments
 * page links straight to `/admin?department_id=…`). The backend does all the
 * filtering, sorting and pagination — nothing here ever filters client-side.
 */

import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

import {
  CATEGORIES,
  PRIORITIES,
  SORT_FIELDS,
  STATUSES,
  type Category,
  type ComplaintFilters,
  type Priority,
  type SortField,
  type SortOrder,
  type Status,
} from '@/lib/api/types'

export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [20, 50, 100]

const isOneOf = <T extends string>(allowed: readonly T[], value: string): value is T =>
  (allowed as readonly string[]).includes(value)

function readEnumList<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T[] | undefined {
  const values = params.getAll(key).filter((value) => isOneOf(allowed, value)) as T[]
  return values.length ? values : undefined
}

/** Parses the URL into the exact `ComplaintFilters` shape the API expects. */
export function parseInboxFilters(params: URLSearchParams): ComplaintFilters {
  const sortParam = params.get('sort') ?? ''
  const orderParam = params.get('order') ?? ''
  const pageParam = Number(params.get('page') ?? '1')
  const sizeParam = Number(params.get('page_size') ?? String(DEFAULT_PAGE_SIZE))

  const filters: ComplaintFilters = {
    q: params.get('q') || undefined,
    category: readEnumList<Category>(params, 'category', CATEGORIES),
    priority: readEnumList<Priority>(params, 'priority', PRIORITIES),
    status: readEnumList<Status>(params, 'status', STATUSES),
    department_id: params.get('department_id') || undefined,
    assignee_id: params.get('assignee_id') || undefined,
    // Only ever `true` or absent: `mine=false` is the same query as no filter,
    // and sending it would just make two URLs mean one thing.
    mine: params.get('mine') === 'true' ? true : undefined,
    area: params.get('area') || undefined,
    date_from: params.get('date_from') || undefined,
    date_to: params.get('date_to') || undefined,
    sort: isOneOf(SORT_FIELDS, sortParam) ? (sortParam as SortField) : 'created_at',
    order: orderParam === 'asc' ? 'asc' : 'desc',
    page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
    page_size: PAGE_SIZE_OPTIONS.includes(sizeParam) ? sizeParam : DEFAULT_PAGE_SIZE,
  }

  return filters
}

/** Serialises filters back into URL params, dropping everything default/empty. */
export function serialiseInboxFilters(filters: ComplaintFilters): URLSearchParams {
  const params = new URLSearchParams()
  if (filters.q) params.set('q', filters.q)
  for (const value of filters.category ?? []) params.append('category', value)
  for (const value of filters.priority ?? []) params.append('priority', value)
  for (const value of filters.status ?? []) params.append('status', value)
  if (filters.department_id) params.set('department_id', filters.department_id)
  if (filters.assignee_id) params.set('assignee_id', filters.assignee_id)
  if (filters.mine) params.set('mine', 'true')
  if (filters.area) params.set('area', filters.area)
  if (filters.date_from) params.set('date_from', filters.date_from)
  if (filters.date_to) params.set('date_to', filters.date_to)
  if (filters.sort && filters.sort !== 'created_at') params.set('sort', filters.sort)
  if (filters.order && filters.order !== 'desc') params.set('order', filters.order)
  if (filters.page && filters.page > 1) params.set('page', String(filters.page))
  if (filters.page_size && filters.page_size !== DEFAULT_PAGE_SIZE) {
    params.set('page_size', String(filters.page_size))
  }
  return params
}

/** True when anything other than sort/pagination is set. */
export function hasActiveFilters(filters: ComplaintFilters): boolean {
  return Boolean(
    filters.q ||
      filters.category?.length ||
      filters.priority?.length ||
      filters.status?.length ||
      filters.department_id ||
      filters.assignee_id ||
      filters.mine ||
      filters.area ||
      filters.date_from ||
      filters.date_to,
  )
}

export interface UseInboxFiltersResult {
  filters: ComplaintFilters
  /** Merges a patch. Any change other than paging resets to page 1. */
  setFilters: (patch: Partial<ComplaintFilters>) => void
  /** Replaces the whole filter set (used by saved views). */
  replaceFilters: (next: ComplaintFilters) => void
  clearFilters: () => void
  toggleFacet: <K extends 'category' | 'priority' | 'status'>(
    key: K,
    value: NonNullable<ComplaintFilters[K]>[number],
  ) => void
  setSort: (field: SortField) => void
}

export function useInboxFilters(): UseInboxFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(() => parseInboxFilters(searchParams), [searchParams])

  const write = useCallback(
    (next: ComplaintFilters) => {
      setSearchParams(serialiseInboxFilters(next), { replace: true })
    },
    [setSearchParams],
  )

  const setFilters = useCallback(
    (patch: Partial<ComplaintFilters>) => {
      const resetsPage = !('page' in patch)
      write({ ...filters, ...patch, ...(resetsPage ? { page: 1 } : {}) })
    },
    [filters, write],
  )

  const replaceFilters = useCallback(
    (next: ComplaintFilters) => write({ ...next, page: 1 }),
    [write],
  )

  const clearFilters = useCallback(
    () =>
      write({
        sort: filters.sort,
        order: filters.order,
        page: 1,
        page_size: filters.page_size,
      }),
    [filters.sort, filters.order, filters.page_size, write],
  )

  const toggleFacet = useCallback<UseInboxFiltersResult['toggleFacet']>(
    (key, value) => {
      const current = (filters[key] ?? []) as string[]
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
      setFilters({ [key]: next.length ? next : undefined } as Partial<ComplaintFilters>)
    },
    [filters, setFilters],
  )

  const setSort = useCallback(
    (field: SortField) => {
      const sameField = filters.sort === field
      const nextOrder: SortOrder = sameField && filters.order === 'desc' ? 'asc' : 'desc'
      setFilters({ sort: field, order: nextOrder })
    },
    [filters.sort, filters.order, setFilters],
  )

  return { filters, setFilters, replaceFilters, clearFilters, toggleFacet, setSort }
}
