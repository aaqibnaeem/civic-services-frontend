/**
 * One typed function per CONTRACT endpoint. No React, no caching — the hooks in
 * `src/hooks/` wrap these. Keep the signatures boring and the return types exact.
 */

import { api, type QueryValue } from './client'
import type {
  AiEvaluationResponse,
  AiHealthResponse,
  AIAnalysis,
  AnalyticsFilters,
  AnalyzePreviewRequest,
  AreasResponse,
  AssistantChatRequest,
  AssistantChatResponse,
  CategoriesResponse,
  Complaint,
  ComplaintCreate,
  ComplaintCreateResponse,
  ComplaintDetail,
  ComplaintFilters,
  ComplaintUpdate,
  Department,
  DepartmentAnalyticsResponse,
  DuplicatesResponse,
  HealthResponse,
  InsightsResponse,
  LoginRequest,
  MyComplaintFilters,
  OverviewResponse,
  Page,
  PrioritiesResponse,
  PublicSummaryResponse,
  ResolutionTimesResponse,
  StaffMember,
  TokenResponse,
  TrendsResponse,
  User,
} from './types'

/**
 * Filter objects are plain interfaces (no index signature), so they need one
 * cast to satisfy `buildQuery`. Doing it here keeps every endpoint below clean.
 */
function toQuery(filters?: object): Record<string, QueryValue> {
  return (filters ?? {}) as Record<string, QueryValue>
}

/**
 * CONTRACT §5.5 says every list endpoint is paginated, but the v2 staff
 * endpoints are small directories that may reasonably answer with a bare array
 * (`/departments` already does). Accept either shape rather than crashing on
 * whichever one the backend picked.
 */
function unwrapList<T>(payload: T[] | Page<T> | null | undefined): T[] {
  if (Array.isArray(payload)) return payload
  if (payload && Array.isArray((payload as Page<T>).items)) return (payload as Page<T>).items
  return []
}

/** The mirror image of {@link unwrapList} — normalise a list into a `Page`. */
function toPage<T>(payload: T[] | Page<T> | null | undefined, pageSize = 20): Page<T> {
  if (payload && !Array.isArray(payload) && Array.isArray((payload as Page<T>).items)) {
    return payload as Page<T>
  }
  const items = Array.isArray(payload) ? payload : []
  return {
    items,
    total: items.length,
    page: 1,
    page_size: items.length || pageSize,
    pages: 1,
  }
}

/* ========================================================================== */
/* Public — no auth                                                           */
/* ========================================================================== */

/**
 * `POST /complaints` → 201 with `ai_status:"pending"`. Never blocks on the LLM.
 *
 * Since CONTRACT §4b the response also carries an `account` block: the API finds
 * or creates a citizen account for `citizen_email` and returns its default
 * password the first time. Sent without auth even when a citizen is signed in —
 * the endpoint is public and links by email.
 */
export function createComplaint(payload: ComplaintCreate) {
  return api.post<ComplaintCreateResponse>('/complaints', payload, { auth: false })
}

/**
 * `GET /complaints/mine` — the signed-in citizen's own complaints, paginated.
 * Never returns anyone else's, so no filtering happens client-side.
 */
export async function listMyComplaints(filters: MyComplaintFilters = {}) {
  const payload = await api.get<Page<Complaint> | Complaint[]>('/complaints/mine', {
    query: toQuery(filters),
  })
  return toPage(payload, filters.page_size ?? 20)
}

/** `GET /complaints/track/{reference_code}` → 404 if unknown. */
export function trackComplaint(referenceCode: string) {
  return api.get<Complaint>(
    `/complaints/track/${encodeURIComponent(referenceCode.trim().toUpperCase())}`,
    { auth: false },
  )
}

/**
 * `POST /complaints/analyze-preview` — the ONE synchronous AI call. Analyses
 * without saving; hard 25s server timeout, so we allow 30s client-side.
 */
export function analyzePreview(payload: AnalyzePreviewRequest) {
  return api.post<AIAnalysis>('/complaints/analyze-preview', payload, {
    auth: false,
    timeoutMs: 30_000,
  })
}

/** `GET /departments` */
export function listDepartments() {
  return api.get<Department[]>('/departments', { auth: false })
}

/** `GET /health` — lives at the ROOT path, not under `/api/v1`. */
export function getHealth() {
  return api.get<HealthResponse>('/health', { auth: false, root: true, timeoutMs: 8_000 })
}

/* ========================================================================== */
/* Auth                                                                       */
/* ========================================================================== */

/** `POST /auth/login` → `{access_token, token_type:"bearer", user}` */
export function login(payload: LoginRequest) {
  return api.post<TokenResponse>('/auth/login', payload, { auth: false })
}

/** `GET /auth/me` */
export function getMe() {
  return api.get<User>('/auth/me')
}

/* ========================================================================== */
/* Admin / staff — auth required                                              */
/* ========================================================================== */

/** `GET /complaints` — paginated list with filters. */
export function listComplaints(filters: ComplaintFilters = {}) {
  return api.get<Page<Complaint>>('/complaints', { query: toQuery(filters) })
}

/** `GET /complaints/{id}` — full complaint incl. `timeline`. */
export function getComplaint(id: string) {
  return api.get<ComplaintDetail>(`/complaints/${encodeURIComponent(id)}`)
}

/** `PATCH /complaints/{id}` — appends a StatusEvent server-side.
 *
 * Returns a bare `Complaint`, not a `ComplaintDetail`: per CONTRACT §3 only
 * `GET /complaints/{id}` carries `timeline`. Callers must merge rather than
 * replace a cached detail, or they will strip the timeline off it.
 */
export function updateComplaint(id: string, payload: ComplaintUpdate) {
  return api.patch<Complaint>(`/complaints/${encodeURIComponent(id)}`, payload)
}

/** `POST /complaints/{id}/reanalyze` — re-runs the AI pipeline. Returns a bare
 * `Complaint`; see the note on {@link updateComplaint}. */
export function reanalyzeComplaint(id: string) {
  return api.post<Complaint>(`/complaints/${encodeURIComponent(id)}/reanalyze`)
}

/**
 * `POST /complaints/{id}/auto-assign` — re-runs the workload-balancing rule
 * (CONTRACT §4b). Returns a bare `Complaint`; see the note on
 * {@link updateComplaint}. Answers `409` when no assignment is possible.
 */
export function autoAssignComplaint(id: string) {
  return api.post<Complaint>(`/complaints/${encodeURIComponent(id)}/auto-assign`)
}

/** `GET /staff` — admin only: every staff member with department and workload. */
export async function listStaff(params?: { department_id?: string }) {
  const payload = await api.get<StaffMember[] | Page<StaffMember>>('/staff', {
    query: toQuery(params),
  })
  return unwrapList(payload)
}

/** `GET /departments/{id}/staff` — staff in one department, with workload. */
export async function listDepartmentStaff(departmentId: string) {
  const payload = await api.get<StaffMember[] | Page<StaffMember>>(
    `/departments/${encodeURIComponent(departmentId)}/staff`,
  )
  return unwrapList(payload)
}

/** `GET /complaints/{id}/duplicates` */
export function getDuplicates(id: string) {
  return api.get<DuplicatesResponse>(`/complaints/${encodeURIComponent(id)}/duplicates`)
}

/** `DELETE /complaints/{id}` — admin only, soft delete. */
export function deleteComplaint(id: string) {
  return api.delete<void>(`/complaints/${encodeURIComponent(id)}`)
}

/* ========================================================================== */
/* Analytics                                                                  */
/* ========================================================================== */

export function getAnalyticsOverview(filters?: AnalyticsFilters) {
  return api.get<OverviewResponse>('/analytics/overview', { query: toQuery(filters) })
}

export function getAnalyticsCategories(filters?: AnalyticsFilters) {
  return api.get<CategoriesResponse>('/analytics/categories', { query: toQuery(filters) })
}

export function getAnalyticsPriorities(filters?: AnalyticsFilters) {
  return api.get<PrioritiesResponse>('/analytics/priorities', { query: toQuery(filters) })
}

export function getAnalyticsResolutionTimes(filters?: AnalyticsFilters) {
  return api.get<ResolutionTimesResponse>('/analytics/resolution-times', {
    query: toQuery(filters),
  })
}

export function getAnalyticsTrends(
  params?: AnalyticsFilters & { days?: number },
) {
  return api.get<TrendsResponse>('/analytics/trends', {
    query: toQuery({ days: 90, ...params }),
  })
}

export function getAnalyticsDepartments(filters?: AnalyticsFilters) {
  return api.get<DepartmentAnalyticsResponse>('/analytics/departments', {
    query: toQuery(filters),
  })
}

export function getAnalyticsAreas(filters?: AnalyticsFilters) {
  return api.get<AreasResponse>('/analytics/areas', { query: toQuery(filters) })
}

export function getAnalyticsInsights(filters?: AnalyticsFilters) {
  return api.get<InsightsResponse>('/analytics/insights', { query: toQuery(filters) })
}

/** Public — the only analytics endpoint that does not require auth. */
export function getPublicSummary() {
  return api.get<PublicSummaryResponse>('/analytics/public-summary', { auth: false })
}

/* ========================================================================== */
/* AI                                                                         */
/* ========================================================================== */

/** `POST /assistant/chat` — the natural-language analytics assistant. */
export function assistantChat(payload: AssistantChatRequest) {
  return api.post<AssistantChatResponse>('/assistant/chat', payload, {
    timeoutMs: 45_000,
  })
}

/** `GET /ai/health` — drives the "AI tier availability" strip. */
export function getAiHealth() {
  return api.get<AiHealthResponse>('/ai/health', { auth: false, timeoutMs: 8_000 })
}

/** `GET /ai/evaluation` — stored model-evaluation report. */
export function getAiEvaluation() {
  return api.get<AiEvaluationResponse>('/ai/evaluation', { auth: false })
}
