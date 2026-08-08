import { Building2, Quote, TriangleAlert } from 'lucide-react'

import { AiSourceBadge } from '@/components/AiSourceBadge'
import { CategoryBadge } from '@/components/CategoryBadge'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
import { PriorityBadge } from '@/components/PriorityBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CATEGORY_META, CATEGORY_OPTIONS, PRIORITY_META } from '@/lib/domain'
import type { AIAnalysis, Category } from '@/lib/api/types'
import { cn } from '@/lib/utils'

export interface AiAnalysisCardProps {
  analysis: AIAnalysis
  /** Heading above the card body. */
  title?: string
  /** Enables the citizen category override block. */
  override?: {
    /** The citizen's chosen category, or null while they agree with the AI. */
    value: Category | null
    onChange: (category: Category | null) => void
  }
  /** Optional slot under the meter, e.g. a "run it again" button. */
  footer?: React.ReactNode
  className?: string
}

/**
 * Renders one `AIAnalysis` honestly: what it decided, how sure it was, and
 * which tier produced it (CONTRACT §5.3 — a rules result must never be dressed
 * up as the language model).
 *
 * Used on the report flow's review step (with the override enabled) and on the
 * public tracking page (read-only).
 */
export function AiAnalysisCard({
  analysis,
  title = 'What the AI understood',
  override,
  footer,
  className,
}: AiAnalysisCardProps) {
  const effectiveCategory = override?.value ?? analysis.category
  const overridden = Boolean(override?.value && override.value !== analysis.category)

  return (
    <Card className={cn('border-primary/25', className)}>
      <CardContent className="@container space-y-6 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">
              Produced automatically. A person in the department can change any of it.
            </p>
          </div>
          <AiSourceBadge
            source={analysis.source}
            size="md"
            modelName={analysis.model_name}
            latencyMs={analysis.latency_ms}
          />
        </div>

        {analysis.summary ? (
          <figure className="rounded-lg border bg-muted/40 p-4">
            <Quote className="mb-1.5 size-4 text-muted-foreground" aria-hidden />
            <blockquote className="text-sm leading-relaxed text-foreground">
              {analysis.summary}
            </blockquote>
            <figcaption className="mt-2 text-xs text-muted-foreground">
              The one-line summary a case worker sees in the triage queue.
            </figcaption>
          </figure>
        ) : null}

        <dl className="grid gap-4 @md:grid-cols-3">
          <div className="space-y-1.5">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Category
            </dt>
            <dd className="flex flex-wrap items-center gap-2">
              <CategoryBadge category={effectiveCategory} withTooltip />
              {overridden ? (
                <span className="text-[0.6875rem] text-muted-foreground">
                  (AI said {CATEGORY_META[analysis.category].short})
                </span>
              ) : null}
            </dd>
          </div>

          <div className="space-y-1.5">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Priority
            </dt>
            <dd className="space-y-1">
              <PriorityBadge priority={analysis.priority} withTooltip />
              <p className="text-[0.6875rem] text-muted-foreground">
                {PRIORITY_META[analysis.priority].slaHint}
              </p>
            </dd>
          </div>

          <div className="space-y-1.5">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Department
            </dt>
            <dd className="flex items-start gap-2 text-sm">
              <Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 wrap-break-word">
                {analysis.department_suggestion ?? 'To be assigned by triage'}
              </span>
            </dd>
          </div>
        </dl>

        <div className="grid gap-4 @md:grid-cols-2">
          <ConfidenceMeter value={analysis.confidence} />

          {analysis.keywords.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Signals it picked up</p>
              <ul className="flex flex-wrap gap-1.5">
                {analysis.keywords.slice(0, 8).map((keyword) => (
                  <li
                    key={keyword}
                    className="rounded-full border bg-muted/60 px-2 py-0.5 text-[0.6875rem] text-muted-foreground"
                  >
                    {keyword}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {analysis.is_emergency ? (
          <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/8 p-3 text-sm text-foreground dark:bg-destructive/12">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <span>
              <span className="font-medium">Flagged as an emergency.</span> It will be pushed to the
              top of the department's queue. If anyone is in immediate danger, call the emergency
              services as well — this is a reporting tool, not a dispatch line.
            </span>
          </p>
        ) : null}

        {analysis.reasoning ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Why: </span>
            {analysis.reasoning}
          </p>
        ) : null}

        {override ? (
          <div className="space-y-2.5 rounded-lg border border-dashed p-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Did it get the category right?</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                The AI is wrong sometimes. Pick the correct category and we will send your choice
                with the report; the department can also re-classify it at any point.
              </p>
            </div>

            <ul className="flex flex-wrap gap-1.5">
              {CATEGORY_OPTIONS.map((option) => {
                const selected = effectiveCategory === option.value
                const meta = CATEGORY_META[option.value]
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        override.onChange(
                          option.value === analysis.category ? null : option.value,
                        )
                      }
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                        'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                        selected
                          ? meta.badgeClass
                          : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground',
                      )}
                    >
                      <meta.icon className="size-3.5" aria-hidden strokeWidth={2.25} />
                      {meta.short}
                    </button>
                  </li>
                )
              })}
            </ul>

            {overridden ? (
              <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  You changed this to{' '}
                  <span className="font-medium text-foreground">
                    {CATEGORY_META[effectiveCategory].label}
                  </span>
                  .
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => override.onChange(null)}
                >
                  Use the AI's answer
                </Button>
              </p>
            ) : null}
          </div>
        ) : null}

        {footer}
      </CardContent>
    </Card>
  )
}
