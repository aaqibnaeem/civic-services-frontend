/**
 * Citizen-facing building blocks. Import from `@/components/citizen`:
 *
 *   import { PageShell, Stepper, AiAnalysisCard } from '@/components/citizen'
 *
 * These are owned by the public-site pages. Shared, domain-aware components
 * (badges, meters, empty/error states) still come from `@/components`.
 */

export { PageShell, Band, type ShellWidth } from './PageShell'
export { Stepper, type StepDefinition } from './Stepper'
export { AnalyzingPanel } from './AnalyzingPanel'
export { AiAnalysisCard } from './AiAnalysisCard'
export { StatusTimeline } from './StatusTimeline'
export { SubmitSuccess } from './SubmitSuccess'
export { TrackedReportCard } from './TrackedReportCard'
export { ComplaintSummaryCard } from './ComplaintSummaryCard'
export { LiveStats } from './LiveStats'
export { CategoryStrip } from './CategoryStrip'
export { HowItWorks } from './HowItWorks'
export { AiExplainer } from './AiExplainer'
export {
  AI_INPUTS,
  AI_NEVER_SENT,
  AI_OUTPUTS,
  AI_TIERS,
  EXAMPLE_DESCRIPTION,
  HOW_IT_WORKS,
  KARACHI_AREAS,
  type KarachiArea,
} from './constants'
export { useTrackedRefs } from './useTrackedRefs'
export { absoluteTime, formatDays, parseApiDate, relativeTime, shortDate } from './utils'
