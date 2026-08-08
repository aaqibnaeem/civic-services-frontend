/**
 * Wire types — hand-mirrored from `docs/CONTRACT.md` (FROZEN) and cross-checked
 * against the backend Pydantic schemas in `civic-backend/app/schemas/`.
 *
 * Rules for anyone editing this file:
 *  - The string values ARE the wire format. Never rename an enum member's value.
 *  - Fields the contract marks nullable are `| null`, NOT optional (`?`). The API
 *    always sends the key; it may send `null`. Optional (`?`) is reserved for
 *    fields the backend genuinely omits (additive/rigour fields).
 *  - If the backend adds a field, add it here as optional so old builds keep working.
 *
 * A generated counterpart can be produced with `npm run gen:types` once the
 * backend is running (writes `src/lib/api/schema.gen.ts`). This hand-written file
 * stays the source of truth for application code.
 */

/* ========================================================================== */
/* 1. Enums (exact wire strings)                                              */
/* ========================================================================== */

export const CATEGORIES = [
  'road',
  'water',
  'waste',
  'electricity',
  'drainage',
  'safety',
  'other',
] as const
export type Category = (typeof CATEGORIES)[number]

export const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const
export type Priority = (typeof PRIORITIES)[number]

export const STATUSES = [
  'open',
  'assigned',
  'in_progress',
  'resolved',
  'rejected',
] as const
export type Status = (typeof STATUSES)[number]

export const ROLES = ['citizen', 'staff', 'admin'] as const
export type Role = (typeof ROLES)[number]

/** Which analyzer tier produced the result. Never fake this in the UI. */
export const AI_SOURCES = ['llm', 'ml', 'rules'] as const
export type AISource = (typeof AI_SOURCES)[number]

export const AI_STATUSES = ['pending', 'complete', 'failed'] as const
export type AIStatus = (typeof AI_STATUSES)[number]

export const SENTIMENTS = ['calm', 'concerned', 'angry'] as const
export type Sentiment = (typeof SENTIMENTS)[number]

export const INSIGHT_SEVERITIES = ['info', 'warn', 'critical'] as const
export type InsightSeverity = (typeof INSIGHT_SEVERITIES)[number]

export const SORT_FIELDS = [
  'created_at',
  'priority',
  'status',
  'resolution_hours',
] as const
export type SortField = (typeof SORT_FIELDS)[number]

export type SortOrder = 'asc' | 'desc'

export type ModeKind = 'unique' | 'multi' | 'none'
export type Direction = 'up' | 'down' | 'flat'

/** ISO-8601 UTC string, e.g. `2026-08-08T10:00:00Z`. */
export type ISODateTime = string
/** `YYYY-MM-DD`. */
export type ISODate = string
export type UUID = string

/* ========================================================================== */
/* 2. Core objects                                                            */
/* ========================================================================== */

export interface DepartmentRef {
  id: UUID
  name: string
  slug: string
}

export interface Department {
  id: UUID
  name: string
  slug: string
  categories: string[]
  contact_email: string | null
  open_complaints: number
}

export interface AIAnalysis {
  category: Category
  priority: Priority
  summary: string
  department_suggestion: string | null
  /** 0..1 */
  confidence: number
  source: AISource
  model_name: string
  reasoning: string | null
  keywords: string[]
  sentiment: Sentiment | null
  is_emergency: boolean
  latency_ms: number
  created_at: ISODateTime
  /** Telemetry — only the LLM tier reports token usage. */
  prompt_tokens?: number | null
  completion_tokens?: number | null
  cache_hit_tokens?: number | null
  /** Present on analyze-preview responses only. */
  title?: string | null
}

export interface StatusEvent {
  id: UUID
  from_status: Status | null
  to_status: Status
  note: string | null
  actor: string
  created_at: ISODateTime
}

/**
 * The staff member a complaint is assigned to — CONTRACT §4b.
 *
 * Nullable and OPTIONAL on purpose: roughly 800 seeded complaints predate
 * assignment and will carry `assignee: null` forever, and a deployment running
 * the pre-v2 API omits the key entirely. Never read it without a fallback.
 */
export interface AssigneeRef {
  id: UUID
  full_name: string
  email: string
  department_id: UUID | null
}

export interface Complaint {
  id: UUID
  /** Public tracking handle, e.g. `CIV-8F3K2M`. Unique, human-typeable. */
  reference_code: string
  title: string
  description: string
  category: Category
  priority: Priority
  status: Status
  location_text: string
  area: string | null
  latitude: number | null
  longitude: number | null
  citizen_name: string | null
  citizen_phone: string | null
  citizen_email: string | null
  image_url: string | null
  department: DepartmentRef | null
  duplicate_of_id: UUID | null
  ai_status: AIStatus
  /** null until `ai_status === 'complete'`. */
  ai: AIAnalysis | null
  created_at: ISODateTime
  updated_at: ISODateTime
  resolved_at: ISODateTime | null
  resolution_hours: number | null

  /* ---- v2 (CONTRACT §4b). Optional: seeded rows and pre-v2 APIs omit them. -- */

  /** The citizen account this complaint belongs to. `null` on seeded rows. */
  citizen_id?: UUID | null
  /** Staff member currently responsible. `null` when nobody is available. */
  assignee?: AssigneeRef | null
  assigned_at?: ISODateTime | null
}

/** `GET /complaints/{id}` — adds the status timeline. */
export interface ComplaintDetail extends Complaint {
  timeline: StatusEvent[]
}

/**
 * The account block returned by `POST /complaints` — CONTRACT §4b.
 *
 * The citizen never fills in a signup form: the API finds or creates a `citizen`
 * user for the email they gave. `default_password` is present ONLY when
 * `is_new` is true; it is `null` for a returning email.
 */
export interface AccountInfo {
  email: string
  is_new: boolean
  default_password: string | null
}

/**
 * `POST /complaints` — a `Complaint` plus the account block. Optional so a
 * pre-v2 API (which returns a bare `Complaint`) still submits successfully.
 */
export interface ComplaintCreateResponse extends Complaint {
  account?: AccountInfo | null
}

export interface User {
  id: UUID
  email: string
  full_name: string
  role: Role

  /* ---- v2 (CONTRACT §4b) — meaningful for `staff`, optional everywhere. ---- */

  department_id?: UUID | null
  is_available?: boolean
  department?: DepartmentRef | null
  /** open + assigned + in_progress complaints held by this staff member. */
  active_assignments?: number | null
  /** Sum of priority weights across their active complaints, when the API sends it. */
  workload_score?: number | null
}

/** `GET /staff` and `GET /departments/{id}/staff` — a user plus workload. */
export type StaffMember = User

/* ========================================================================== */
/* 3. Request bodies                                                          */
/* ========================================================================== */

export interface ComplaintCreate {
  /** 15..5000 chars. */
  description: string
  /** 3..300 chars. */
  location_text: string
  area?: string | null
  latitude?: number | null
  longitude?: number | null
  citizen_name?: string | null
  citizen_phone?: string | null
  /**
   * REQUIRED since CONTRACT §4b — it is the key the API finds or creates the
   * citizen's account with, so the complaint can be listed under it later.
   */
  citizen_email: string
  image_url?: string | null
  /** Optional citizen hint; the AI still runs and may override it. */
  category?: Category | null
  consent: boolean
}

export interface ComplaintUpdate {
  status?: Status
  priority?: Priority
  category?: Category
  department_id?: UUID
  /** CONTRACT §4b: a staff uuid, or `null` to unassign. */
  assignee_id?: UUID | null
  /** Max 1000 chars. Recorded on the appended StatusEvent. */
  note?: string
}

export interface AnalyzePreviewRequest {
  description: string
  location_text?: string | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: 'bearer'
  user: User
}

/* ========================================================================== */
/* 4. List / pagination / errors                                              */
/* ========================================================================== */

/** Every list endpoint is paginated — CONTRACT §5.5. */
export interface Page<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  pages: number
}

export interface ComplaintFilters {
  q?: string
  category?: Category[]
  priority?: Priority[]
  status?: Status[]
  department_id?: UUID
  area?: string
  date_from?: string
  date_to?: string
  sort?: SortField
  order?: SortOrder
  /** 1-based. */
  page?: number
  /** Default 20, max 100. */
  page_size?: number
  /** CONTRACT §4b — complaints assigned to one staff member. */
  assignee_id?: UUID
  /** CONTRACT §4b — complaints assigned to the caller. */
  mine?: boolean
}

/** `GET /complaints/mine` — the signed-in citizen's own reports. */
export interface MyComplaintFilters {
  status?: Status[]
  /** 1-based. */
  page?: number
  page_size?: number
}

export type ApiErrorCode =
  | 'validation_error'
  | 'not_found'
  | 'unauthorized'
  | 'forbidden'
  | 'conflict'
  | 'rate_limited'
  | 'ai_unavailable'
  | 'internal_error'

export interface ApiErrorDetail {
  field: string | null
  issue: string
}

export interface ApiErrorBody {
  code: ApiErrorCode | (string & {})
  message: string
  details: ApiErrorDetail[]
  request_id: string
}

/** The exact non-2xx body shape — CONTRACT §4. */
export interface ApiErrorEnvelope {
  error: ApiErrorBody
}

export interface HealthResponse {
  status: string
  database: string
  ai_provider: string
  version: string
  environment?: string | null
  details?: Record<string, unknown>
}

/* ========================================================================== */
/* 5. AI                                                                      */
/* ========================================================================== */

export interface AiHealthResponse {
  llm_available: boolean
  ml_model_loaded: boolean
  rules_available: boolean
  model_name: string
  last_error: string | null
}

export interface DuplicateCandidate {
  complaint: Complaint
  /** 0..1 */
  similarity: number
  reason: string
}

export interface DuplicatesResponse {
  candidates: DuplicateCandidate[]
}

export interface AssistantCitation {
  reference_code: string
  id: UUID
}

export interface AssistantMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AssistantChatRequest {
  message: string
  history?: AssistantMessage[]
}

export interface AssistantChatResponse {
  answer: string
  citations: AssistantCitation[]
  used_stats: Record<string, unknown>
  source: AISource | (string & {})
}

export interface PerClassMetrics {
  precision: number
  recall: number
  'f1-score': number
  support: number
}

/** `GET /ai/evaluation` — the stored model-evaluation report. */
export interface AiEvaluationTarget {
  target: string
  labels: string[]
  accuracy: number
  macro_f1: number
  per_class: Record<string, PerClassMetrics>
  confusion_matrix: number[][]
  support?: number
  cv_macro_f1_mean?: number | null
  cv_macro_f1_std?: number | null
  top_confusions?: Array<{ actual: string; predicted: string; count: number }>
  calibration?: Array<{
    bucket: string
    n: number
    accuracy: number | null
  }>
}

export interface AiEvaluationResponse {
  generated_at: ISODateTime
  model_name?: string
  dataset_size?: number
  train_size?: number
  test_size?: number
  targets: AiEvaluationTarget[]
  limitations?: string[]
  notes?: string[]
}

/* ========================================================================== */
/* 6. Analytics                                                               */
/* ========================================================================== */

/** The "explain the statistics" deliverable — CONTRACT §3. */
export interface Insight {
  id: string
  severity: InsightSeverity
  title: string
  detail: string
  metric: number | null
  unit: string | null
}

export interface InsightsResponse {
  generated_at: ISODateTime
  n: number
  insights: Insight[]
  interpretation: string
}

/** Optional filter set accepted by EVERY analytics endpoint. */
export interface AnalyticsFilters {
  date_from?: ISODate | null
  date_to?: ISODate | null
  category?: Category | string | null
  area?: string | null
}

export interface HistogramBin {
  bin_start: number
  bin_end: number
  count: number
  relative_frequency: number
  label: string
}

export interface DescriptiveStats {
  n: number
  unit: string
  mean: number | null
  median: number | null
  mode: number | null
  modes: number[]
  mode_kind: ModeKind
  modal_bin: string | null
  min: number | null
  max: number | null
  range: number | null
  variance: number | null
  std_dev: number | null
  /** Bessel-corrected sample statistics. */
  ddof: number
  standard_error: number | null
  mean_ci95_low: number | null
  mean_ci95_high: number | null
  ci_method: string | null
  q1: number | null
  q2: number | null
  q3: number | null
  iqr: number | null
  p90: number | null
  lower_fence: number | null
  upper_fence: number | null
  quartile_method: string
  skewness: number | null
  kurtosis: number | null
  kurtosis_type: string
  coefficient_of_variation: number | null
  sample_warning: string | null
  notes: string[]
}

export interface OutlierPoint {
  reference_code: string
  value: number
  id: UUID | null
  category: Category | null
  priority: Priority | null
  status: Status | null
  area: string | null
  department: string | null
  value_days: number | null
  fence: number | null
  exceeds_fence_by: number | null
  side: 'upper' | 'lower'
  verdict: string
  created_at: ISODateTime | null
}

export interface GroupOutlierReport {
  group: string
  n: number
  median: number | null
  q1: number | null
  q3: number | null
  iqr: number | null
  lower_fence: number | null
  upper_fence: number | null
  outlier_count: number
  outlier_rate: number
  outliers: OutlierPoint[]
  sample_warning: string | null
  interpretation: string
}

export interface OutlierReport {
  method: string
  scope: string
  n: number
  lower_fence: number | null
  upper_fence: number | null
  outlier_count: number
  outlier_rate: number
  upper_count: number
  lower_count: number
  outliers: OutlierPoint[]
  by_group: GroupOutlierReport[]
  interpretation: string
}

export interface CategoryQuartiles {
  category: Category | string
  n: number
  median: number | null
  q1: number | null
  q3: number | null
  iqr: number | null
  mean: number | null
  upper_fence: number | null
  outlier_count: number
  sample_warning: string | null
}

/** `GET /analytics/resolution-times` — the statistics benchmark. */
export interface ResolutionTimesResponse {
  n: number
  unit: string
  mean: number | null
  median: number | null
  mode: number | null
  modes: number[]
  mode_kind: ModeKind
  modal_bin: string | null
  min: number | null
  max: number | null
  range: number | null
  variance: number | null
  std_dev: number | null
  ddof: number
  standard_error: number | null
  mean_ci95_low: number | null
  mean_ci95_high: number | null
  q1: number | null
  q2: number | null
  q3: number | null
  iqr: number | null
  p90: number | null
  lower_fence: number | null
  upper_fence: number | null
  quartile_method: string
  skewness: number | null
  kurtosis: number | null
  coefficient_of_variation: number | null
  outliers: OutlierPoint[]
  outlier_report: OutlierReport | null
  histogram: HistogramBin[]
  histogram_method: string
  by_category: CategoryQuartiles[]
  resolved_count: number
  unresolved_count: number
  censoring_note: string | null
  interpretation: string
  insights: Insight[]
  sample_warning: string | null
  filters: AnalyticsFilters | null
}

export interface FrequencyRow {
  value: string
  label: string
  count: number
  relative_frequency: number
  percent: number
  cumulative_count: number
  cumulative_percent: number
}

export interface FrequencyDistribution {
  variable: string
  n: number
  distinct: number
  rows: FrequencyRow[]
  mode: string | null
  mode_label: string | null
  modes: string[]
  mode_kind: ModeKind
  mode_count: number
  mode_share: number
  missing: number
  interpretation: string
}

export interface ContingencyRow {
  label: string
  value: string
  cells: Record<string, number>
  total: number
}

export interface ContingencyTable {
  row_variable: string
  col_variable: string
  col_labels: string[]
  rows: ContingencyRow[]
  col_totals: Record<string, number>
  grand_total: number
  row_percentages: ContingencyRow[] | null
  row_percent_cells: Array<Record<string, number>>
  interpretation: string
}

export interface ChiSquareResult {
  test: string
  row_variable: string
  col_variable: string
  n: number
  statistic: number | null
  dof: number | null
  p_value: number | null
  alpha: number
  significant: boolean | null
  cramers_v: number | null
  effect_size: string | null
  expected_min: number | null
  cells_below_5: number
  total_cells: number
  pct_cells_below_5: number
  assumption_met: boolean
  reliable: boolean
  correction_applied: boolean
  h0: string
  h1: string
  interpretation: string
  caveat: string | null
}

export interface SpearmanResult {
  test: string
  x_variable: string
  y_variable: string
  n: number
  rho: number | null
  p_value: number | null
  alpha: number
  significant: boolean | null
  strength: string | null
  direction: string | null
  reliable: boolean
  interpretation: string
  caveat: string | null
}

export interface TrendPoint {
  date: ISODate
  count: number
  rolling_mean_7: number | null
}

export interface CategorySeries {
  category: Category | string
  label: string
  total: number
  points: TrendPoint[]
  week_over_week_pct: number | null
}

export interface WeekOverWeek {
  current_week: number
  previous_week: number
  change: number
  change_pct: number | null
  direction: Direction
  window_days: number
  interpretation: string
}

export interface ForecastPoint {
  date: ISODate
  forecast: number
  low: number | null
  high: number | null
}

export interface Forecast {
  method: string
  horizon_days: number
  assumptions: string[]
  points: ForecastPoint[]
  expected_total: number | null
  interpretation: string
}

export interface TrendsResponse {
  days: number
  date_from: ISODate | null
  date_to: ISODate | null
  total: number
  series: TrendPoint[]
  rolling_window: number
  by_category: CategorySeries[]
  week_over_week: WeekOverWeek
  busiest_day: TrendPoint | null
  quietest_day: TrendPoint | null
  daily_stats: DescriptiveStats | null
  weekday_effect: Record<string, number>
  forecast: Forecast | null
  gaps_filled: number
  interpretation: string
  insights: Insight[]
  filters: AnalyticsFilters | null
}

export interface DepartmentStat {
  department: string
  n: number
  open: number
  in_progress: number
  resolved: number
  backlog: number
  resolution_rate: number | null
  median_resolution_hours: number | null
  median_resolution_days: number | null
  mean_resolution_hours: number | null
  p90_resolution_hours: number | null
  resolved_sample: number
  share_pct: number
  sample_warning: string | null
}

export interface DepartmentAnalyticsResponse {
  n: number
  total_complaints: number
  departments: DepartmentStat[]
  overall_median_hours: number | null
  slowest: DepartmentStat | null
  fastest: DepartmentStat | null
  largest_backlog: DepartmentStat | null
  interpretation: string
  insights: Insight[]
  filters: AnalyticsFilters | null
}

export interface AreaStat {
  area: string
  n: number
  share_pct: number
  open: number
  resolved: number
  critical_count: number
  top_category: Category | null
  top_category_label: string | null
  top_category_count: number
  top_category_share: number
  median_resolution_hours: number | null
  hotspot: boolean
  hotspot_reason: string | null
}

export interface AreasResponse {
  n: number
  total_complaints: number
  areas: AreaStat[]
  hotspots: AreaStat[]
  hotspot_rule: string
  concentration_top3_pct: number
  interpretation: string
  insights: Insight[]
  filters: AnalyticsFilters | null
}

export interface CategoryResolutionRow {
  category: Category | string
  label: string
  n: number
  median_resolution_hours: number | null
  median_resolution_days: number | null
  open: number
  resolved: number
}

export interface CategoriesResponse {
  distribution: FrequencyDistribution
  resolution_by_category: CategoryResolutionRow[]
  by_status: ContingencyTable | null
  interpretation: string
  insights: Insight[]
  filters: AnalyticsFilters | null
}

export interface PrioritiesResponse {
  distribution: FrequencyDistribution
  crosstab: ContingencyTable
  chi_square: ChiSquareResult
  spearman_priority_vs_speed: SpearmanResult | null
  escalation_share_pct: number
  interpretation: string
  insights: Insight[]
  filters: AnalyticsFilters | null
}

export interface OverviewKPIs {
  total: number
  open: number
  assigned: number
  in_progress: number
  resolved: number
  rejected: number
  resolution_rate: number
  median_resolution_hours: number | null
  median_resolution_days: number | null
  mean_resolution_hours: number | null
  critical_open: number
  avg_ai_confidence: number | null
  complaints_this_week: number
  complaints_last_week: number
  wow_change_pct: number | null
  wow_direction: Direction
  backlog: number
  oldest_open_days: number | null
}

export interface KPICard {
  key: string
  label: string
  value: number | null
  display: string
  unit: string | null
  hint: string
  severity: InsightSeverity
}

export interface OverviewResponse {
  generated_at: ISODateTime
  kpis: OverviewKPIs
  cards: KPICard[]
  insights: Insight[]
  interpretation: string
  filters: AnalyticsFilters | null
}

/** Deliberately small and non-identifying — served without authentication. */
export interface PublicSummaryResponse {
  generated_at: ISODateTime
  total_complaints: number
  resolved: number
  resolution_rate: number
  median_resolution_days: number | null
  complaints_this_week: number
  active_areas: number
  top_category: Category | null
  top_category_label: string | null
  top_category_share_pct: number
  categories: FrequencyRow[]
  highlights: Insight[]
  interpretation: string
}
