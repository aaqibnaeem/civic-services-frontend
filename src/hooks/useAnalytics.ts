/**
 * One hook per analytics endpoint. Every one accepts the same optional
 * `AnalyticsFilters` ({date_from, date_to, category, area}) so the analytics page
 * can hold a single filter object in state and pass it to all of them.
 *
 * Analytics are recomputed server-side on each call, so they get a longer
 * staleTime than complaint data.
 */

import { useQuery } from '@tanstack/react-query'

import type { ApiError } from '@/lib/api/client'
import * as endpoints from '@/lib/api/endpoints'
import { qk } from '@/lib/api/queryKeys'
import type {
  AnalyticsFilters,
  AreasResponse,
  CategoriesResponse,
  DepartmentAnalyticsResponse,
  InsightsResponse,
  OverviewResponse,
  PrioritiesResponse,
  PublicSummaryResponse,
  ResolutionTimesResponse,
  TrendsResponse,
} from '@/lib/api/types'

const ANALYTICS_STALE_TIME = 60_000

/** KPI cards + headline insights. */
export function useAnalyticsOverview(filters?: AnalyticsFilters) {
  return useQuery<OverviewResponse, ApiError>({
    queryKey: qk.analytics.overview(filters),
    queryFn: () => endpoints.getAnalyticsOverview(filters),
    staleTime: ANALYTICS_STALE_TIME,
  })
}

/** Frequency distribution + mode, plus resolution time per category. */
export function useAnalyticsCategories(filters?: AnalyticsFilters) {
  return useQuery<CategoriesResponse, ApiError>({
    queryKey: qk.analytics.categories(filters),
    queryFn: () => endpoints.getAnalyticsCategories(filters),
    staleTime: ANALYTICS_STALE_TIME,
  })
}

/** Priority distribution + category cross-tab + chi-square. */
export function useAnalyticsPriorities(filters?: AnalyticsFilters) {
  return useQuery<PrioritiesResponse, ApiError>({
    queryKey: qk.analytics.priorities(filters),
    queryFn: () => endpoints.getAnalyticsPriorities(filters),
    staleTime: ANALYTICS_STALE_TIME,
  })
}

/** The statistics benchmark: descriptive stats, quartiles, Tukey fences, outliers. */
export function useAnalyticsResolutionTimes(filters?: AnalyticsFilters) {
  return useQuery<ResolutionTimesResponse, ApiError>({
    queryKey: qk.analytics.resolutionTimes(filters),
    queryFn: () => endpoints.getAnalyticsResolutionTimes(filters),
    staleTime: ANALYTICS_STALE_TIME,
  })
}

/** Daily series + 7-day moving average. `days` defaults to 90. */
export function useAnalyticsTrends(params?: AnalyticsFilters & { days?: number }) {
  return useQuery<TrendsResponse, ApiError>({
    queryKey: qk.analytics.trends(params),
    queryFn: () => endpoints.getAnalyticsTrends(params),
    staleTime: ANALYTICS_STALE_TIME,
  })
}

/** Per-department volume, median resolution and backlog. */
export function useAnalyticsDepartments(filters?: AnalyticsFilters) {
  return useQuery<DepartmentAnalyticsResponse, ApiError>({
    queryKey: qk.analytics.departments(filters),
    queryFn: () => endpoints.getAnalyticsDepartments(filters),
    staleTime: ANALYTICS_STALE_TIME,
  })
}

/** Per-area volume, top category, hotspot flag. */
export function useAnalyticsAreas(filters?: AnalyticsFilters) {
  return useQuery<AreasResponse, ApiError>({
    queryKey: qk.analytics.areas(filters),
    queryFn: () => endpoints.getAnalyticsAreas(filters),
    staleTime: ANALYTICS_STALE_TIME,
  })
}

/** The plain-English narrative layer — `Insight[]`. */
export function useAnalyticsInsights(filters?: AnalyticsFilters) {
  return useQuery<InsightsResponse, ApiError>({
    queryKey: qk.analytics.insights(filters),
    queryFn: () => endpoints.getAnalyticsInsights(filters),
    staleTime: ANALYTICS_STALE_TIME,
  })
}

/** Public, unauthenticated subset for the landing page. */
export function usePublicSummary() {
  return useQuery<PublicSummaryResponse, ApiError>({
    queryKey: qk.analytics.publicSummary(),
    queryFn: () => endpoints.getPublicSummary(),
    staleTime: 5 * 60_000,
    retry: 0,
  })
}
