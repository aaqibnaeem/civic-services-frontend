/**
 * Complaint data hooks.
 *
 * Conventions:
 *  - queries return the raw TanStack result; destructure `data`, `isPending`,
 *    `error` in the page.
 *  - every mutation invalidates through `qk.*` factories, never a literal key.
 *  - `useUpdateComplaint` is optimistic with rollback — the triage inbox must
 *    feel instant.
 */

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { toast } from 'sonner'

import { ApiError } from '@/lib/api/client'
import * as endpoints from '@/lib/api/endpoints'
import { qk } from '@/lib/api/queryKeys'
import type {
  Complaint,
  ComplaintCreate,
  ComplaintCreateResponse,
  ComplaintDetail,
  ComplaintFilters,
  ComplaintUpdate,
  DuplicatesResponse,
  MyComplaintFilters,
  Page,
} from '@/lib/api/types'
import { useTrackedStore } from '@/stores/trackedStore'

/* ========================================================================== */
/* Queries                                                                    */
/* ========================================================================== */

/**
 * Admin list. `keepPreviousData` keeps the table populated while paging so rows
 * do not collapse to a skeleton on every page change.
 */
export function useComplaints(filters: ComplaintFilters = {}, enabled = true) {
  return useQuery({
    queryKey: qk.complaints.list(filters),
    queryFn: () => endpoints.listComplaints(filters),
    placeholderData: keepPreviousData,
    enabled,
  })
}

/**
 * `GET /complaints/mine` — the signed-in citizen's own reports (CONTRACT §4b).
 *
 * Never retries a 404: a deployment whose API predates v2 answers 404 here, and
 * /my-reports falls back to the reference codes stored in this browser rather
 * than hammering an endpoint that does not exist.
 */
export function useMyComplaints(filters: MyComplaintFilters = {}, enabled = true) {
  return useQuery<Page<Complaint>, ApiError>({
    queryKey: qk.complaints.mine(filters),
    queryFn: () => endpoints.listMyComplaints(filters),
    placeholderData: keepPreviousData,
    enabled,
    retry: (count, error) => !error.isNotFound && !error.isUnauthorized && count < 1,
  })
}

/** Admin detail, including `timeline`. */
export function useComplaint(
  id: string | undefined,
  options?: Partial<UseQueryOptions<ComplaintDetail, ApiError>>,
) {
  return useQuery<ComplaintDetail, ApiError>({
    queryKey: qk.complaints.detail(id ?? ''),
    queryFn: () => endpoints.getComplaint(id as string),
    enabled: Boolean(id),
    ...options,
  })
}

/**
 * Public tracking by reference code. Never retries a 404 — an unknown code is a
 * legitimate answer, not a transient failure.
 */
export function useTrackComplaint(
  referenceCode: string | undefined,
  options?: Partial<UseQueryOptions<Complaint, ApiError>>,
) {
  const code = referenceCode?.trim().toUpperCase()
  return useQuery<Complaint, ApiError>({
    queryKey: qk.complaints.track(code ?? ''),
    queryFn: () => endpoints.trackComplaint(code as string),
    enabled: Boolean(code),
    retry: (count, error) => !error.isNotFound && count < 1,
    ...options,
  })
}

/** `GET /complaints/{id}/duplicates` — AI-suggested duplicate candidates. */
export function useDuplicates(id: string | undefined, enabled = true) {
  return useQuery<DuplicatesResponse, ApiError>({
    queryKey: qk.complaints.duplicates(id ?? ''),
    queryFn: () => endpoints.getDuplicates(id as string),
    enabled: Boolean(id) && enabled,
    staleTime: 60_000,
  })
}

/* ========================================================================== */
/* usePollUntilAnalyzed — the "AI is analysing…" reveal                        */
/* ========================================================================== */

const POLL_INTERVAL_MS = 2_000
const POLL_TIMEOUT_MS = 90_000

export interface PollUntilAnalyzedResult {
  complaint: Complaint | ComplaintDetail | undefined
  /** True while `ai_status === 'pending'` and we are still polling. */
  isAnalyzing: boolean
  /** `ai_status === 'complete'`. */
  isAnalyzed: boolean
  /** `ai_status === 'failed'`, or we gave up waiting. */
  isFailed: boolean
  /** We stopped polling because it took too long — the record is still safe. */
  timedOut: boolean
  isPending: boolean
  error: ApiError | null
  refetch: () => void
}

/**
 * CONTRACT §5.1: `POST /complaints` returns `ai_status:"pending"` and enriches in
 * a background task. This hook polls until the flag flips, then stops.
 *
 * Pass either a complaint **id** (admin, uses `GET /complaints/{id}`) or a
 * **reference code** like `CIV-8F3K2M` (public, uses `/complaints/track/{code}`).
 * The public route is auto-detected so the citizen submit screen works without
 * a token.
 *
 * Polling stops on: `ai_status !== 'pending'`, an error, or 90s elapsed.
 */
export function usePollUntilAnalyzed(
  idOrReference: string | undefined,
  options?: { enabled?: boolean; intervalMs?: number },
): PollUntilAnalyzedResult {
  const enabled = (options?.enabled ?? true) && Boolean(idOrReference)
  const interval = options?.intervalMs ?? POLL_INTERVAL_MS
  const isReference = Boolean(idOrReference && /^CIV-/i.test(idOrReference.trim()))
  const key = isReference
    ? qk.complaints.track(idOrReference as string)
    : qk.complaints.detail(idOrReference ?? '')

  const query = useQuery<Complaint | ComplaintDetail, ApiError>({
    queryKey: key,
    queryFn: () =>
      isReference
        ? endpoints.trackComplaint(idOrReference as string)
        : endpoints.getComplaint(idOrReference as string),
    enabled,
    staleTime: 0,
    // Stop as soon as the background task has written a terminal ai_status.
    refetchInterval: (query) => {
      // Stop on a failed lookup. Without this an unknown reference code polls a
      // 404 forever: the timeout guard below keys off `dataUpdatedAt`, which stays
      // 0 — and therefore falsy — until a fetch has actually succeeded once.
      if (query.state.status === 'error') return false
      const status = query.state.data?.ai_status
      if (status && status !== 'pending') return false
      if (query.state.dataUpdatedAt && Date.now() - query.state.dataUpdatedAt > POLL_TIMEOUT_MS) {
        return false
      }
      return interval
    },
    refetchIntervalInBackground: false,
    retry: 2,
  })

  const status = query.data?.ai_status
  const startedAt = query.data ? query.dataUpdatedAt : 0
  const timedOut =
    status === 'pending' && startedAt > 0 && Date.now() - startedAt > POLL_TIMEOUT_MS

  return {
    complaint: query.data,
    isAnalyzing: status === 'pending' && !timedOut,
    isAnalyzed: status === 'complete',
    isFailed: status === 'failed' || timedOut,
    timedOut,
    isPending: query.isPending,
    error: query.error ?? null,
    refetch: () => void query.refetch(),
  }
}

/* ========================================================================== */
/* Mutations                                                                  */
/* ========================================================================== */

/**
 * Public submission. On success the reference code is written to `trackedStore`
 * so the complaint is findable from this browser even before the citizen ever
 * signs in — the account (CONTRACT §4b) and the local code list are belt and
 * braces, not alternatives.
 */
export function useCreateComplaint() {
  const queryClient = useQueryClient()
  const addTracked = useTrackedStore((s) => s.addFromComplaint)

  return useMutation<ComplaintCreateResponse, ApiError, ComplaintCreate>({
    mutationFn: (payload) => endpoints.createComplaint(payload),
    onSuccess: (complaint) => {
      addTracked(complaint)
      // Seed the cache so the confirmation screen renders with zero latency and
      // the poller has a starting value.
      queryClient.setQueryData(qk.complaints.track(complaint.reference_code), complaint)
      queryClient.invalidateQueries({ queryKey: qk.complaints.lists() })
      queryClient.invalidateQueries({ queryKey: qk.complaints.mineAll() })
      queryClient.invalidateQueries({ queryKey: qk.analytics.all() })
    },
  })
}

interface UpdateVariables {
  id: string
  patch: ComplaintUpdate
  /**
   * Fields to paint optimistically that cannot be derived from the patch — the
   * assignment panel knows the staff member behind an `assignee_id`, this hook
   * does not. Rolled back with everything else if the request fails.
   */
  optimistic?: Partial<Complaint>
}

interface UpdateContext {
  previousDetail: ComplaintDetail | undefined
  previousLists: Array<[readonly unknown[], Page<Complaint> | undefined]>
}

/**
 * Fold a bare `Complaint` into the cached `ComplaintDetail`, keeping fields the
 * mutation response does not carry — `timeline` above all. Writes nothing when
 * the detail was never cached, so a stray partial cannot masquerade as a detail.
 */
function mergeIntoDetail(queryClient: QueryClient, complaint: Complaint): void {
  queryClient.setQueryData<ComplaintDetail>(qk.complaints.detail(complaint.id), (previous) =>
    previous ? { ...previous, ...complaint } : undefined,
  )
}

/**
 * Admin PATCH with an optimistic update. The detail cache and every cached list
 * page are patched immediately, then rolled back if the request fails.
 */
export function useUpdateComplaint() {
  const queryClient = useQueryClient()

  return useMutation<Complaint, ApiError, UpdateVariables, UpdateContext>({
    mutationFn: ({ id, patch }) => endpoints.updateComplaint(id, patch),

    onMutate: async ({ id, patch, optimistic }) => {
      // Stop in-flight refetches so they cannot clobber the optimistic value.
      await queryClient.cancelQueries({ queryKey: qk.complaints.detail(id) })
      await queryClient.cancelQueries({ queryKey: qk.complaints.lists() })

      const previousDetail = queryClient.getQueryData<ComplaintDetail>(
        qk.complaints.detail(id),
      )
      const previousLists = queryClient.getQueriesData<Page<Complaint>>({
        queryKey: qk.complaints.lists(),
      })

      const applied: Partial<Complaint> = {
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.priority !== undefined && { priority: patch.priority }),
        ...(patch.category !== undefined && { category: patch.category }),
        // Unassigning has exactly one possible outcome, so paint it immediately.
        ...(patch.assignee_id === null && { assignee: null, assigned_at: null }),
        ...optimistic,
      }

      if (previousDetail) {
        queryClient.setQueryData<ComplaintDetail>(qk.complaints.detail(id), {
          ...previousDetail,
          ...applied,
          updated_at: new Date().toISOString(),
        })
      }

      for (const [key, page] of previousLists) {
        if (!page?.items) continue
        queryClient.setQueryData<Page<Complaint>>(key, {
          ...page,
          items: page.items.map((item) =>
            item.id === id
              ? { ...item, ...applied, updated_at: new Date().toISOString() }
              : item,
          ),
        })
      }

      return { previousDetail, previousLists }
    },

    onError: (error, { id }, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(qk.complaints.detail(id), context.previousDetail)
      }
      for (const [key, page] of context?.previousLists ?? []) {
        queryClient.setQueryData(key, page)
      }
      toast.error('Update failed', { description: error.toUserMessage() })
    },

    onSuccess: (complaint, { patch }) => {
      // Trust the server response over the optimistic guess — but merge, never
      // replace: PATCH returns a bare Complaint with no `timeline`, so assigning
      // it would strip the timeline out of a cached detail and break any consumer
      // reading it before the refetch below lands.
      mergeIntoDetail(queryClient, complaint)
      queryClient.setQueryData(qk.complaints.track(complaint.reference_code), complaint)

      const assignmentOnly =
        'assignee_id' in patch && patch.status === undefined && patch.category === undefined
      toast.success('Complaint updated', {
        description: assignmentOnly
          ? complaint.assignee
            ? `${complaint.reference_code} is assigned to ${complaint.assignee.full_name}.`
            : `${complaint.reference_code} is now unassigned.`
          : `${complaint.reference_code} is now ${complaint.status.replace('_', ' ')}.`,
      })
    },

    onSettled: (_data, _error, { id, patch }) => {
      // Server is the authority for derived fields (resolution_hours, timeline).
      queryClient.invalidateQueries({ queryKey: qk.complaints.detail(id) })
      queryClient.invalidateQueries({ queryKey: qk.complaints.lists() })
      queryClient.invalidateQueries({ queryKey: qk.analytics.all() })
      // Reassignment moves a case between staff workloads, so the "3 active"
      // counters beside every name are stale the moment this lands.
      if ('assignee_id' in patch || patch.status !== undefined) {
        queryClient.invalidateQueries({ queryKey: qk.staff.all() })
        queryClient.invalidateQueries({ queryKey: qk.departments.all() })
      }
    },
  })
}

/**
 * `POST /complaints/{id}/auto-assign` — re-runs the workload-balancing rule
 * (CONTRACT §4b).
 *
 * Owns its error toast so the 409 the API returns when no assignment is possible
 * is shown verbatim rather than as a generic "Action failed".
 */
export function useAutoAssignComplaint() {
  const queryClient = useQueryClient()

  return useMutation<Complaint, ApiError, string>({
    mutationFn: (id) => endpoints.autoAssignComplaint(id),
    onSuccess: (complaint) => {
      mergeIntoDetail(queryClient, complaint)
      queryClient.setQueryData(qk.complaints.track(complaint.reference_code), complaint)
      queryClient.invalidateQueries({ queryKey: qk.complaints.detail(complaint.id) })
      queryClient.invalidateQueries({ queryKey: qk.complaints.lists() })
      queryClient.invalidateQueries({ queryKey: qk.staff.all() })
      queryClient.invalidateQueries({ queryKey: qk.departments.all() })

      if (complaint.assignee) {
        toast.success('Auto-assigned', {
          description: `${complaint.reference_code} went to ${complaint.assignee.full_name} — the available person in that department with the lightest load.`,
        })
      } else {
        // CONTRACT §4b: an unassignable complaint stays put; it is never dropped.
        toast.warning('Nobody available to take this', {
          description:
            'No available staff in that department, so the complaint is still unassigned. It has not been changed otherwise.',
        })
      }
    },
    onError: (error) => {
      toast.error('Auto-assign failed', { description: error.toUserMessage() })
    },
  })
}

/** `POST /complaints/{id}/reanalyze` — re-runs the AI pipeline. */
export function useReanalyzeComplaint() {
  const queryClient = useQueryClient()

  return useMutation<Complaint, ApiError, string>({
    mutationFn: (id) => endpoints.reanalyzeComplaint(id),
    onSuccess: (complaint) => {
      mergeIntoDetail(queryClient, complaint)
      queryClient.invalidateQueries({ queryKey: qk.complaints.duplicates(complaint.id) })
      queryClient.invalidateQueries({ queryKey: qk.complaints.lists() })
      toast.success('Re-analysis started', {
        description: 'The result appears as soon as the pipeline finishes.',
      })
    },
  })
}

/** `DELETE /complaints/{id}` — admin only, soft delete. */
export function useDeleteComplaint() {
  const queryClient = useQueryClient()

  return useMutation<void, ApiError, string>({
    mutationFn: (id) => endpoints.deleteComplaint(id),
    onSuccess: (_void, id) => {
      queryClient.removeQueries({ queryKey: qk.complaints.detail(id) })
      queryClient.invalidateQueries({ queryKey: qk.complaints.lists() })
      queryClient.invalidateQueries({ queryKey: qk.analytics.all() })
      toast.success('Complaint deleted')
    },
  })
}
