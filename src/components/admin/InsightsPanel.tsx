/**
 * The plain-English narrative layer — the highest-value thing on the analytics
 * page, so it sits near the top rather than buried under the charts.
 *
 * Every sentence here is produced by the backend's deterministic rules engine
 * (`narratives.py`, 24 rules, no LLM): the number in each title is the same
 * Python float the charts are drawn from, interpolated — never generated. That
 * is the answer to "how do you know the AI didn't make that number up".
 */

import { useMemo, useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'

import { INSIGHT_SEVERITY_META, formatNumber } from '@/lib/domain'
import type { Insight, InsightSeverity } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

const SEVERITY_RANK: Record<InsightSeverity, number> = {
  critical: 0,
  warn: 1,
  info: 2,
}

export interface InsightCardProps {
  insight: Insight
  className?: string
}

export function InsightCard({ insight, className }: InsightCardProps) {
  const meta = INSIGHT_SEVERITY_META[insight.severity]
  const Icon = meta.icon

  return (
    <article
      className={cn(
        'flex gap-3 rounded-xl border p-4 transition-shadow hover:shadow-civic',
        meta.className,
        className,
      )}
    >
      <Icon
        className={cn('mt-0.5 size-4.5 shrink-0', meta.iconClass)}
        aria-hidden
        strokeWidth={2}
      />
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h3 className="text-sm leading-snug font-semibold text-balance text-foreground">
            {insight.title}
          </h3>
          <span
            className={cn(
              'shrink-0 rounded-full border px-1.5 py-px text-[0.625rem] font-medium tracking-wide uppercase',
              meta.iconClass,
            )}
          >
            {meta.label}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
          {insight.detail}
        </p>
        {insight.metric !== null && insight.unit ? (
          <p className="tabular text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {formatNumber(insight.metric, Number.isInteger(insight.metric) ? 0 : 2)}
            </span>{' '}
            {insight.unit}
          </p>
        ) : null}
      </div>
    </article>
  )
}

export interface InsightsPanelProps {
  insights: Insight[]
  /** The headline paragraph the endpoint returns alongside the list. */
  interpretation?: string
  /** Shown collapsed beyond this count. */
  initialCount?: number
  className?: string
}

/** Every `Insight`, ranked by severity, with its colour. */
export function InsightsPanel({
  insights,
  interpretation,
  initialCount = 6,
  className,
}: InsightsPanelProps) {
  const [expanded, setExpanded] = useState(false)

  const sorted = useMemo(
    () =>
      [...insights].sort(
        (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity],
      ),
    [insights],
  )

  const visible = expanded ? sorted : sorted.slice(0, initialCount)
  const counts = sorted.reduce<Record<InsightSeverity, number>>(
    (acc, insight) => {
      acc[insight.severity] += 1
      return acc
    },
    { critical: 0, warn: 0, info: 0 },
  )

  if (sorted.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        No insights for this slice — there is not enough data yet to say anything
        defensible.
      </p>
    )
  }

  return (
    <section className={cn('space-y-4', className)} aria-label="Insights">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden />
          <h2 className="text-base font-semibold">What the statistics mean</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {(['critical', 'warn', 'info'] as const).map((severity) =>
            counts[severity] > 0 ? (
              <span
                key={severity}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-medium',
                  INSIGHT_SEVERITY_META[severity].className,
                  INSIGHT_SEVERITY_META[severity].iconClass,
                )}
              >
                {counts[severity]} {INSIGHT_SEVERITY_META[severity].label}
              </span>
            ) : null,
          )}
        </div>
      </div>

      {interpretation ? (
        <p className="max-w-4xl text-sm leading-relaxed text-pretty text-muted-foreground">
          {interpretation}
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>

      {sorted.length > initialCount ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          <ChevronDown
            className={cn('size-4 transition-transform', expanded && 'rotate-180')}
            aria-hidden
          />
          {expanded
            ? 'Show fewer insights'
            : `Show all ${sorted.length} insights`}
        </Button>
      ) : null}

      <p className="text-xs leading-relaxed text-muted-foreground">
        These sentences are generated by a deterministic rules engine, not a language
        model — every number is the same value the charts are drawn from, interpolated
        into a template. Nothing here can hallucinate a statistic.
      </p>
    </section>
  )
}
