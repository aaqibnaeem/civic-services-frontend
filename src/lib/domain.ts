/**
 * Domain metadata — the single source of truth for how every enum value is
 * LABELLED, COLOURED and ICONED across the whole app.
 *
 * Pages must never hard-code "Roads & Potholes" or an amber class. Import from
 * here (or better: use the badge components in `@/components/`) so a category
 * looks identical on the landing page, the triage inbox and the charts.
 *
 * The Tailwind class strings below are written out in full on purpose — Tailwind
 * v4 scans source text for candidates, so a class assembled at runtime
 * (`bg-cat-${x}`) would never be generated.
 */

import {
  Ban,
  BrainCircuit,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleEllipsis,
  Construction,
  Cpu,
  Droplets,
  Flame,
  Info,
  Regex,
  ShieldAlert,
  SignalHigh,
  SignalLow,
  SignalMedium,
  Trash2,
  TriangleAlert,
  UserCheck,
  Waypoints,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'

import type {
  AISource,
  AIStatus,
  Category,
  InsightSeverity,
  Priority,
  Role,
  Sentiment,
  Status,
} from '@/lib/api/types'

export interface EnumMeta {
  /** Full display label — CONTRACT §1 for categories. */
  label: string
  /** Compact label for table cells and chart axes. */
  short: string
  icon: LucideIcon
  /** Badge surface: border + tinted background + accessible foreground. */
  badgeClass: string
  /** Solid swatch for dots, legends and left-borders. */
  dotClass: string
  /** Foreground-only, for inline text and icons. */
  textClass: string
  /** Raw CSS colour for Recharts `fill` / `stroke`. */
  color: string
  /** One-line explanation, used in tooltips and empty states. */
  description: string
}

/* ========================================================================== */
/* Category                                                                   */
/* ========================================================================== */

export const CATEGORY_META: Record<Category, EnumMeta> = {
  road: {
    label: 'Roads & Potholes',
    short: 'Roads',
    icon: Construction,
    badgeClass: 'border-cat-road/30 bg-cat-road/12 text-cat-road-fg dark:bg-cat-road/18',
    dotClass: 'bg-cat-road',
    textClass: 'text-cat-road-fg',
    color: 'var(--color-cat-road)',
    description: 'Potholes, broken surfaces, damaged footpaths and road signage.',
  },
  water: {
    label: 'Water Supply & Leakage',
    short: 'Water',
    icon: Droplets,
    badgeClass: 'border-cat-water/30 bg-cat-water/12 text-cat-water-fg dark:bg-cat-water/18',
    dotClass: 'bg-cat-water',
    textClass: 'text-cat-water-fg',
    color: 'var(--color-cat-water)',
    description: 'Supply interruptions, burst mains, leaking pipes and contamination.',
  },
  waste: {
    label: 'Waste & Sanitation',
    short: 'Waste',
    icon: Trash2,
    badgeClass: 'border-cat-waste/30 bg-cat-waste/12 text-cat-waste-fg dark:bg-cat-waste/18',
    dotClass: 'bg-cat-waste',
    textClass: 'text-cat-waste-fg',
    color: 'var(--color-cat-waste)',
    description: 'Uncollected refuse, overflowing bins and illegal dumping.',
  },
  electricity: {
    label: 'Electricity & Streetlights',
    short: 'Electricity',
    icon: Zap,
    badgeClass:
      'border-cat-electricity/30 bg-cat-electricity/12 text-cat-electricity-fg dark:bg-cat-electricity/18',
    dotClass: 'bg-cat-electricity',
    textClass: 'text-cat-electricity-fg',
    color: 'var(--color-cat-electricity)',
    description:
      'Outages, exposed cabling and dead streetlights. Streetlight reports map here.',
  },
  drainage: {
    label: 'Drainage & Sewerage',
    short: 'Drainage',
    icon: Waypoints,
    badgeClass:
      'border-cat-drainage/30 bg-cat-drainage/12 text-cat-drainage-fg dark:bg-cat-drainage/18',
    dotClass: 'bg-cat-drainage',
    textClass: 'text-cat-drainage-fg',
    color: 'var(--color-cat-drainage)',
    description: 'Blocked drains, sewage overflow and standing water after rain.',
  },
  safety: {
    label: 'Public Safety',
    short: 'Safety',
    icon: ShieldAlert,
    badgeClass:
      'border-cat-safety/30 bg-cat-safety/12 text-cat-safety-fg dark:bg-cat-safety/18',
    dotClass: 'bg-cat-safety',
    textClass: 'text-cat-safety-fg',
    color: 'var(--color-cat-safety)',
    description: 'Hazards to the public: unsafe structures, open manholes, obstructions.',
  },
  other: {
    label: 'Other',
    short: 'Other',
    icon: Wrench,
    badgeClass: 'border-cat-other/30 bg-cat-other/12 text-cat-other-fg dark:bg-cat-other/18',
    dotClass: 'bg-cat-other',
    textClass: 'text-cat-other-fg',
    color: 'var(--color-cat-other)',
    description: 'Anything that does not fit the six primary civic categories.',
  },
}

/* ========================================================================== */
/* Priority — an escalating scale, low → critical                             */
/* ========================================================================== */

export interface PriorityMeta extends EnumMeta {
  /** 1..4. Use for sorting; never sort priorities alphabetically. */
  rank: number
  /** Informal service-level hint shown next to the badge. */
  slaHint: string
}

export const PRIORITY_META: Record<Priority, PriorityMeta> = {
  low: {
    label: 'Low',
    short: 'Low',
    rank: 1,
    icon: SignalLow,
    badgeClass:
      'border-prio-low/30 bg-prio-low/12 text-prio-low-fg dark:bg-prio-low/18',
    dotClass: 'bg-prio-low',
    textClass: 'text-prio-low-fg',
    color: 'var(--color-prio-low)',
    description: 'Minor inconvenience. No safety risk; schedule with routine work.',
    slaHint: 'Routine',
  },
  medium: {
    label: 'Medium',
    short: 'Med',
    rank: 2,
    icon: SignalMedium,
    badgeClass:
      'border-prio-medium/30 bg-prio-medium/12 text-prio-medium-fg dark:bg-prio-medium/18',
    dotClass: 'bg-prio-medium',
    textClass: 'text-prio-medium-fg',
    color: 'var(--color-prio-medium)',
    description: 'Affects daily life for a street or block. Should be planned in.',
    slaHint: 'Within a week',
  },
  high: {
    label: 'High',
    short: 'High',
    rank: 3,
    icon: SignalHigh,
    badgeClass:
      'border-prio-high/30 bg-prio-high/12 text-prio-high-fg dark:bg-prio-high/18',
    dotClass: 'bg-prio-high',
    textClass: 'text-prio-high-fg',
    color: 'var(--color-prio-high)',
    description: 'Widespread disruption or a developing hazard. Escalate today.',
    slaHint: 'Within 48 hours',
  },
  critical: {
    label: 'Critical',
    short: 'Crit',
    rank: 4,
    icon: Flame,
    badgeClass:
      'border-prio-critical/40 bg-prio-critical/14 text-prio-critical-fg dark:bg-prio-critical/22',
    dotClass: 'bg-prio-critical',
    textClass: 'text-prio-critical-fg',
    color: 'var(--color-prio-critical)',
    description: 'Immediate danger to life or property. Dispatch now.',
    slaHint: 'Immediate',
  },
}

/** Sort helper: `complaints.sort(byPriorityDesc)` puts critical first. */
export const byPriorityDesc = (
  a: { priority: Priority },
  b: { priority: Priority },
) => PRIORITY_META[b.priority].rank - PRIORITY_META[a.priority].rank

/* ========================================================================== */
/* Status                                                                     */
/* ========================================================================== */

export interface StatusMeta extends EnumMeta {
  /** Position in the lifecycle, for timelines and progress bars. */
  step: number
  /** No further transitions expected. */
  terminal: boolean
  /** Verb shown on the action that moves a complaint INTO this status. */
  action: string
}

export const STATUS_META: Record<Status, StatusMeta> = {
  open: {
    label: 'Open',
    short: 'Open',
    step: 1,
    terminal: false,
    action: 'Reopen',
    icon: CircleDot,
    badgeClass:
      'border-status-open/30 bg-status-open/12 text-status-open-fg dark:bg-status-open/18',
    dotClass: 'bg-status-open',
    textClass: 'text-status-open-fg',
    color: 'var(--color-status-open)',
    description: 'Received and triaged, not yet assigned to a department.',
  },
  assigned: {
    label: 'Assigned',
    short: 'Assigned',
    step: 2,
    terminal: false,
    action: 'Assign',
    icon: UserCheck,
    badgeClass:
      'border-status-assigned/30 bg-status-assigned/12 text-status-assigned-fg dark:bg-status-assigned/18',
    dotClass: 'bg-status-assigned',
    textClass: 'text-status-assigned-fg',
    color: 'var(--color-status-assigned)',
    description: 'Routed to the owning department and waiting to be picked up.',
  },
  in_progress: {
    label: 'In Progress',
    short: 'In prog.',
    step: 3,
    terminal: false,
    action: 'Start work',
    icon: CircleEllipsis,
    badgeClass:
      'border-status-in-progress/30 bg-status-in-progress/12 text-status-in-progress-fg dark:bg-status-in-progress/18',
    dotClass: 'bg-status-in-progress',
    textClass: 'text-status-in-progress-fg',
    color: 'var(--color-status-in-progress)',
    description: 'A crew is actively working on it.',
  },
  resolved: {
    label: 'Resolved',
    short: 'Resolved',
    step: 4,
    terminal: true,
    action: 'Mark resolved',
    icon: CircleCheck,
    badgeClass:
      'border-status-resolved/30 bg-status-resolved/12 text-status-resolved-fg dark:bg-status-resolved/18',
    dotClass: 'bg-status-resolved',
    textClass: 'text-status-resolved-fg',
    color: 'var(--color-status-resolved)',
    description: 'Work completed. Resolution time is measured to this moment.',
  },
  rejected: {
    label: 'Rejected',
    short: 'Rejected',
    step: 4,
    terminal: true,
    action: 'Reject',
    icon: Ban,
    badgeClass:
      'border-status-rejected/30 bg-status-rejected/12 text-status-rejected-fg dark:bg-status-rejected/18',
    dotClass: 'bg-status-rejected',
    textClass: 'text-status-rejected-fg',
    color: 'var(--color-status-rejected)',
    description: 'Out of scope, a duplicate, or not actionable. A note explains why.',
  },
}

/** Lifecycle order used by the status timeline component. */
export const STATUS_FLOW: Status[] = ['open', 'assigned', 'in_progress', 'resolved']

/* ========================================================================== */
/* AI analyzer tier                                                           */
/* ========================================================================== */

export interface AiSourceMeta extends EnumMeta {
  /** 1 = best. Used to render "fell back to tier N". */
  tier: number
  /** Plain-English tooltip body — CONTRACT §5.3 forbids implying a better tier. */
  tooltip: string
}

export const AI_SOURCE_META: Record<AISource, AiSourceMeta> = {
  llm: {
    label: 'LLM',
    short: 'LLM',
    tier: 1,
    icon: BrainCircuit,
    badgeClass: 'border-ai-llm/30 bg-ai-llm/12 text-ai-llm-fg dark:bg-ai-llm/18',
    dotClass: 'bg-ai-llm',
    textClass: 'text-ai-llm-fg',
    color: 'var(--color-ai-llm)',
    description: 'Large language model — the primary analyzer.',
    tooltip:
      'Tier 1 — a large language model read the full complaint and produced the category, priority and summary. Highest quality, but depends on the provider being reachable.',
  },
  ml: {
    label: 'ML model',
    short: 'ML',
    tier: 2,
    icon: Cpu,
    badgeClass: 'border-ai-ml/30 bg-ai-ml/12 text-ai-ml-fg dark:bg-ai-ml/18',
    dotClass: 'bg-ai-ml',
    textClass: 'text-ai-ml-fg',
    color: 'var(--color-ai-ml)',
    description: 'Locally trained classifier — the fallback analyzer.',
    tooltip:
      'Tier 2 — a locally trained classifier (TF-IDF + linear SVC) handled this because the language model was unavailable. Accuracy is measured and published under AI evaluation.',
  },
  rules: {
    label: 'Rules',
    short: 'Rules',
    tier: 3,
    icon: Regex,
    badgeClass: 'border-ai-rules/30 bg-ai-rules/12 text-ai-rules-fg dark:bg-ai-rules/18',
    dotClass: 'bg-ai-rules',
    textClass: 'text-ai-rules-fg',
    color: 'var(--color-ai-rules)',
    description: 'Deterministic keyword rules — the last-resort analyzer.',
    tooltip:
      'Tier 3 — deterministic keyword rules. Both AI tiers were unavailable, so this result is a safe guess, not a model prediction. Treat it as a starting point and re-check the category.',
  },
}

/* ========================================================================== */
/* AI status (pipeline state on a complaint)                                  */
/* ========================================================================== */

export const AI_STATUS_META: Record<AIStatus, EnumMeta> = {
  pending: {
    label: 'Analysing',
    short: 'Analysing',
    icon: CircleDashed,
    badgeClass: 'border-info/30 bg-info/10 text-info dark:bg-info/18',
    dotClass: 'bg-info',
    textClass: 'text-info',
    color: 'var(--color-info)',
    description: 'The AI is reading this complaint. The page updates automatically.',
  },
  complete: {
    label: 'Analysed',
    short: 'Analysed',
    icon: CircleCheck,
    badgeClass: 'border-success/30 bg-success/10 text-success dark:bg-success/18',
    dotClass: 'bg-success',
    textClass: 'text-success',
    color: 'var(--color-success)',
    description: 'AI analysis finished and is attached to this complaint.',
  },
  failed: {
    label: 'Not analysed',
    short: 'Failed',
    icon: TriangleAlert,
    badgeClass: 'border-warning/40 bg-warning/12 text-warning-foreground dark:bg-warning/20',
    dotClass: 'bg-warning',
    textClass: 'text-warning',
    color: 'var(--color-warning)',
    description:
      'Every analyzer tier failed. The complaint is safely stored — re-run the analysis from the detail page.',
  },
}

/* ========================================================================== */
/* Sentiment, insight severity, role                                          */
/* ========================================================================== */

export const SENTIMENT_META: Record<Sentiment, { label: string; description: string }> = {
  calm: { label: 'Calm', description: 'Neutral, factual tone.' },
  concerned: { label: 'Concerned', description: 'Worried; expects a timely response.' },
  angry: { label: 'Angry', description: 'Frustrated tone — often a repeat report.' },
}

export const INSIGHT_SEVERITY_META: Record<
  InsightSeverity,
  { label: string; icon: LucideIcon; className: string; iconClass: string }
> = {
  info: {
    label: 'Insight',
    icon: Info,
    className: 'border-info/25 bg-info/8 dark:bg-info/12',
    iconClass: 'text-info',
  },
  warn: {
    label: 'Watch',
    icon: CircleAlert,
    className: 'border-warning/35 bg-warning/10 dark:bg-warning/14',
    iconClass: 'text-warning',
  },
  critical: {
    label: 'Act now',
    icon: TriangleAlert,
    className: 'border-destructive/35 bg-destructive/10 dark:bg-destructive/14',
    iconClass: 'text-destructive',
  },
}

export const ROLE_META: Record<Role, { label: string; description: string }> = {
  citizen: { label: 'Citizen', description: 'Can submit and track complaints.' },
  staff: { label: 'Staff', description: 'Can triage, assign and update complaints.' },
  admin: { label: 'Administrator', description: 'Full access, including deletion.' },
}

/* ========================================================================== */
/* Option lists for selects / filter bars                                     */
/* ========================================================================== */

export interface Option<T extends string> {
  value: T
  label: string
  icon: LucideIcon
}

function optionsFrom<T extends string>(
  meta: Record<T, { label: string; icon: LucideIcon }>,
  order: readonly T[],
): Option<T>[] {
  return order.map((value) => ({
    value,
    label: meta[value].label,
    icon: meta[value].icon,
  }))
}

export const CATEGORY_OPTIONS = optionsFrom(CATEGORY_META, [
  'road',
  'water',
  'waste',
  'electricity',
  'drainage',
  'safety',
  'other',
] as const)

export const PRIORITY_OPTIONS = optionsFrom(PRIORITY_META, [
  'critical',
  'high',
  'medium',
  'low',
] as const)

export const STATUS_OPTIONS = optionsFrom(STATUS_META, [
  'open',
  'assigned',
  'in_progress',
  'resolved',
  'rejected',
] as const)

/** Ordered colour list for a 7-slice category chart, matching the badges. */
export const CATEGORY_CHART_COLORS = CATEGORY_OPTIONS.map(
  (o) => CATEGORY_META[o.value].color,
)

/** Ordered colour list for a 4-step priority chart. */
export const PRIORITY_CHART_COLORS = PRIORITY_OPTIONS.map(
  (o) => PRIORITY_META[o.value].color,
)

/** Ordered colour list for a 5-step status chart. */
export const STATUS_CHART_COLORS = STATUS_OPTIONS.map(
  (o) => STATUS_META[o.value].color,
)

/**
 * Generic 8-slot series palette for charts with no domain meaning (trends,
 * histograms). These reference the raw `--chart-N` custom properties, which are
 * always emitted regardless of which Tailwind utilities the app happens to use.
 */
export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
] as const

/* ========================================================================== */
/* Formatting helpers                                                         */
/* ========================================================================== */

export const categoryLabel = (c: Category | null | undefined) =>
  c ? CATEGORY_META[c].label : '—'
export const priorityLabel = (p: Priority | null | undefined) =>
  p ? PRIORITY_META[p].label : '—'
export const statusLabel = (s: Status | null | undefined) =>
  s ? STATUS_META[s].label : '—'
export const aiSourceLabel = (s: AISource | null | undefined) =>
  s ? AI_SOURCE_META[s].label : '—'

/** `CIV-8F3K2M` — always uppercase, always trimmed. */
export const formatReferenceCode = (code: string) => code.trim().toUpperCase()

/** Loose validation for the /track input. The server is the real authority. */
export const REFERENCE_CODE_PATTERN = /^CIV-[A-Z0-9]{4,10}$/
export const isReferenceCode = (code: string) =>
  REFERENCE_CODE_PATTERN.test(formatReferenceCode(code))

/** Hours → "3.2 days" / "18 hours" / "45 minutes". Nulls render as an em dash. */
export function formatHours(hours: number | null | undefined): string {
  if (hours === null || hours === undefined || Number.isNaN(hours)) return '—'
  if (hours < 1) {
    const minutes = Math.max(1, Math.round(hours * 60))
    return `${minutes} min`
  }
  if (hours < 48) {
    const rounded = hours < 10 ? Math.round(hours * 10) / 10 : Math.round(hours)
    return `${rounded} hr${rounded === 1 ? '' : 's'}`
  }
  const days = Math.round((hours / 24) * 10) / 10
  return `${days} day${days === 1 ? '' : 's'}`
}

/** 0.91 → "91%". */
export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  // Accept both 0..1 confidences and 0..100 percentages.
  const pct = value <= 1 && value >= -1 ? value * 100 : value
  return `${pct.toFixed(digits)}%`
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—'
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export type ConfidenceBand = 'high' | 'medium' | 'low'

/** Bands the raw 0..1 confidence so the UI never implies false precision. */
export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.8) return 'high'
  if (confidence >= 0.55) return 'medium'
  return 'low'
}

export const CONFIDENCE_BAND_META: Record<
  ConfidenceBand,
  { label: string; barClass: string; textClass: string; hint: string }
> = {
  high: {
    label: 'High confidence',
    barClass: 'bg-success',
    textClass: 'text-success',
    hint: 'The analyzer was confident. Spot-check only.',
  },
  medium: {
    label: 'Moderate confidence',
    barClass: 'bg-warning',
    textClass: 'text-warning',
    hint: 'Worth a quick human review before acting.',
  },
  low: {
    label: 'Low confidence',
    barClass: 'bg-destructive',
    textClass: 'text-destructive',
    hint: 'Treat the category and priority as a suggestion only.',
  },
}
