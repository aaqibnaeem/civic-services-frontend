/**
 * Barrel for every data hook. Import from `@/hooks` in pages:
 *
 *   import { useComplaints, useUpdateComplaint } from '@/hooks'
 */

export {
  useComplaints,
  useComplaint,
  useMyComplaints,
  useTrackComplaint,
  useDuplicates,
  usePollUntilAnalyzed,
  useCreateComplaint,
  useUpdateComplaint,
  useAutoAssignComplaint,
  useReanalyzeComplaint,
  useDeleteComplaint,
  type PollUntilAnalyzedResult,
} from './useComplaints'

export { useDepartments, useDepartmentMap } from './useDepartments'

export { useStaff, useDepartmentStaff, sortByWorkload } from './useStaff'

export {
  useAnalyzePreview,
  useAiHealth,
  useAiEvaluation,
  useHealth,
  useAssistantChat,
} from './useAi'

export { useLogin, useMe, useLogout } from './useAuth'

export {
  useAnalyticsOverview,
  useAnalyticsCategories,
  useAnalyticsPriorities,
  useAnalyticsResolutionTimes,
  useAnalyticsTrends,
  useAnalyticsDepartments,
  useAnalyticsAreas,
  useAnalyticsInsights,
  usePublicSummary,
} from './useAnalytics'

export { useIsMobile } from './use-mobile'
export { useCopyToClipboard } from './useCopyToClipboard'
export { useDebouncedValue } from './useDebouncedValue'
