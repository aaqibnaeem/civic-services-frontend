/** Department directory — public, rarely changes, cached for the session. */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import type { ApiError } from '@/lib/api/client'
import * as endpoints from '@/lib/api/endpoints'
import { qk } from '@/lib/api/queryKeys'
import type { Department } from '@/lib/api/types'

export function useDepartments() {
  return useQuery<Department[], ApiError>({
    queryKey: qk.departments.list(),
    queryFn: () => endpoints.listDepartments(),
    staleTime: 10 * 60_000,
  })
}

/** `Map<id, Department>` — handy for resolving `department_id` in a table cell. */
export function useDepartmentMap() {
  const query = useDepartments()
  const data = query.data
  const map = useMemo(() => {
    const next = new Map<string, Department>()
    for (const dept of data ?? []) next.set(dept.id, dept)
    return next
  }, [data])
  return { ...query, map }
}
