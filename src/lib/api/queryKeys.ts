/**
 * Query key factory — the single place cache keys are constructed.
 *
 * Convention: keys are hierarchical so a broad prefix invalidates everything
 * beneath it.
 *
 *   qk.complaints.all()            -> ['complaints']
 *   qk.complaints.lists()          -> ['complaints','list']
 *   qk.complaints.list(filters)    -> ['complaints','list',{...}]
 *   qk.complaints.detail(id)       -> ['complaints','detail',id]
 *
 * NEVER inline a literal array in a component. Add a factory here instead.
 */

import type { AnalyticsFilters, ComplaintFilters, MyComplaintFilters } from './types'

/** Strips undefined/null/empty so `{page:1}` and `{page:1,q:undefined}` share a key. */
function stable(input?: object): Record<string, unknown> {
  if (!input) return {}
  const source = input as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(source).sort()) {
    const value = source[key]
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) {
      if (value.length === 0) continue
      out[key] = [...value].sort()
      continue
    }
    out[key] = value
  }
  return out
}

export const qk = {
  health: () => ['health'] as const,

  auth: {
    all: () => ['auth'] as const,
    me: () => ['auth', 'me'] as const,
  },

  complaints: {
    all: () => ['complaints'] as const,
    lists: () => ['complaints', 'list'] as const,
    list: (filters?: ComplaintFilters) =>
      ['complaints', 'list', stable(filters)] as const,
    details: () => ['complaints', 'detail'] as const,
    detail: (id: string) => ['complaints', 'detail', id] as const,
    duplicates: (id: string) => ['complaints', 'detail', id, 'duplicates'] as const,
    track: (referenceCode: string) =>
      ['complaints', 'track', referenceCode.trim().toUpperCase()] as const,
    /** Batch tracking used by /my-reports (one query per stored reference code). */
    tracked: () => ['complaints', 'track'] as const,
    /** `GET /complaints/mine` — the signed-in citizen's own reports. */
    mineAll: () => ['complaints', 'mine'] as const,
    mine: (filters?: MyComplaintFilters) =>
      ['complaints', 'mine', stable(filters)] as const,
  },

  departments: {
    all: () => ['departments'] as const,
    list: () => ['departments', 'list'] as const,
    /** `GET /departments/{id}/staff` — staff and workload for one department. */
    staff: (departmentId: string) => ['departments', 'staff', departmentId] as const,
  },

  staff: {
    all: () => ['staff'] as const,
    /** `GET /staff` — admin-only directory with workload. */
    list: (params?: { department_id?: string }) =>
      ['staff', 'list', stable(params)] as const,
  },

  analytics: {
    all: () => ['analytics'] as const,
    overview: (filters?: AnalyticsFilters) =>
      ['analytics', 'overview', stable(filters)] as const,
    categories: (filters?: AnalyticsFilters) =>
      ['analytics', 'categories', stable(filters)] as const,
    priorities: (filters?: AnalyticsFilters) =>
      ['analytics', 'priorities', stable(filters)] as const,
    resolutionTimes: (filters?: AnalyticsFilters) =>
      ['analytics', 'resolution-times', stable(filters)] as const,
    trends: (params?: AnalyticsFilters & { days?: number }) =>
      ['analytics', 'trends', stable(params)] as const,
    departments: (filters?: AnalyticsFilters) =>
      ['analytics', 'departments', stable(filters)] as const,
    areas: (filters?: AnalyticsFilters) =>
      ['analytics', 'areas', stable(filters)] as const,
    insights: (filters?: AnalyticsFilters) =>
      ['analytics', 'insights', stable(filters)] as const,
    publicSummary: () => ['analytics', 'public-summary'] as const,
  },

  ai: {
    all: () => ['ai'] as const,
    health: () => ['ai', 'health'] as const,
    evaluation: () => ['ai', 'evaluation'] as const,
    preview: (description: string) => ['ai', 'preview', description] as const,
  },
} as const

export type QueryKeys = typeof qk
