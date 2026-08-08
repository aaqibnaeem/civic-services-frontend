/**
 * Staff directories with workload — CONTRACT §4b.
 *
 * Two endpoints, two audiences:
 *  - `GET /staff` is admin-only, so a `staff` session gets a 403 here. Callers
 *    must treat an error as "no directory available" and hide the affordance
 *    rather than showing a broken filter.
 *  - `GET /departments/{id}/staff` is the one every triage screen needs: the
 *    people who may legally take a complaint in that department, each with the
 *    `active_assignments` count that makes a reassignment an informed choice.
 *
 * Both degrade to an empty list rather than throwing on an unexpected shape
 * (see `unwrapList` in `endpoints.ts`), and neither is required for the page
 * around it to render.
 */

import { useQuery } from '@tanstack/react-query'

import type { ApiError } from '@/lib/api/client'
import * as endpoints from '@/lib/api/endpoints'
import { qk } from '@/lib/api/queryKeys'
import type { StaffMember } from '@/lib/api/types'

/** Workload changes as complaints move, but not second by second. */
const STAFF_STALE_MS = 60_000

export interface UseStaffOptions {
  enabled?: boolean
  departmentId?: string
}

/** `GET /staff` — admin only. Errors (403/404) mean "hide the directory UI". */
export function useStaff(options: UseStaffOptions = {}) {
  const { enabled = true, departmentId } = options
  const params = departmentId ? { department_id: departmentId } : undefined

  return useQuery<StaffMember[], ApiError>({
    queryKey: qk.staff.list(params),
    queryFn: () => endpoints.listStaff(params),
    enabled,
    staleTime: STAFF_STALE_MS,
  })
}

/** `GET /departments/{id}/staff` — who can take a complaint in this department. */
export function useDepartmentStaff(departmentId: string | null | undefined, enabled = true) {
  return useQuery<StaffMember[], ApiError>({
    queryKey: qk.departments.staff(departmentId ?? ''),
    queryFn: () => endpoints.listDepartmentStaff(departmentId as string),
    enabled: Boolean(departmentId) && enabled,
    staleTime: STAFF_STALE_MS,
  })
}

/**
 * Lightest load first, then name — the same order the auto-assign rule reasons
 * in, so the human picker and the machine agree on who is the obvious choice.
 * Unavailable staff sink to the bottom: they are shown (a name missing from the
 * list is more confusing than a greyed-out one) but never proposed first.
 */
export function sortByWorkload(staff: StaffMember[]): StaffMember[] {
  return [...staff].sort((a, b) => {
    const availability = Number(b.is_available ?? true) - Number(a.is_available ?? true)
    if (availability !== 0) return availability
    const load = (a.active_assignments ?? 0) - (b.active_assignments ?? 0)
    if (load !== 0) return load
    return (a.full_name || a.email).localeCompare(b.full_name || b.email)
  })
}
