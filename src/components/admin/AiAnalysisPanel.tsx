/**
 * The AI analysis panel — the centrepiece of the complaint detail page.
 *
 * CONTRACT §5.3: the analyzer tier is always recorded and always surfaced. A
 * rules-based guess must never be dressed up as a language-model result, so the
 * tier badge is prominent, carries its own explanation, and the panel says in
 * words what that tier means for how much to trust the classification.
 */

import { LoaderCircle, RefreshCw, Sparkles, TriangleAlert } from 'lucide-react'

import { AiSourceBadge } from '@/components/AiSourceBadge'
import { CategoryBadge } from '@/components/CategoryBadge'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
import { PriorityBadge } from '@/components/PriorityBadge'
import {
  AI_SOURCE_META,
  AI_STATUS_META,
  SENTIMENT_META,
  formatNumber,
} from '@/lib/domain'
import type { AIAnalysis, AIStatus } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export interface AiAnalysisPanelProps {
  ai: AIAnalysis | null
  aiStatus: AIStatus
  onReanalyze?: () => void
  reanalyzing?: boolean
  className?: string
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  )
}

export function AiAnalysisPanel({
  ai,
  aiStatus,
  onReanalyze,
  reanalyzing = false,
  className,
}: AiAnalysisPanelProps) {
  const statusMeta = AI_STATUS_META[aiStatus]

  const reanalyzeButton = onReanalyze ? (
    <Button variant="outline" size="sm" onClick={onReanalyze} disabled={reanalyzing}>
      {reanalyzing ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
      ) : (
        <RefreshCw className="size-4" aria-hidden />
      )}
      Re-analyse
    </Button>
  ) : null

  if (!ai) {
    return (
      <Card className={className}>
        <CardHeader className="gap-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="size-4 text-primary" aria-hidden />
              AI analysis
            </h2>
            {reanalyzeButton}
          </div>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'flex gap-3 rounded-lg border p-3',
              statusMeta.badgeClass.replace(/text-\S+/g, ''),
            )}
          >
            <statusMeta.icon
              className={cn(
                'mt-0.5 size-4 shrink-0',
                statusMeta.textClass,
                aiStatus === 'pending' && 'animate-spin',
              )}
              aria-hidden
            />
            <div className="space-y-1">
              <p className="text-sm font-medium">{statusMeta.label}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {statusMeta.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const tier = AI_SOURCE_META[ai.source]

  return (
    <Card className={className}>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Sparkles className="size-4 text-primary" aria-hidden />
            AI analysis
          </h2>
          {reanalyzeButton}
        </div>

        {/* The honesty strip — which tier, and what that means. */}
        <div
          className={cn(
            'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border p-3',
            tier.badgeClass.replace(/text-\S+/g, ''),
          )}
        >
          <AiSourceBadge
            source={ai.source}
            size="lg"
            modelName={ai.model_name}
            latencyMs={ai.latency_ms}
            withTooltip={false}
          />
          <p className="min-w-56 flex-1 text-xs leading-relaxed text-muted-foreground">
            {tier.tooltip}
          </p>
          <p className="tabular w-full font-mono text-[0.6875rem] text-muted-foreground">
            {ai.model_name} · {formatNumber(ai.latency_ms)} ms
            {ai.prompt_tokens != null
              ? ` · ${formatNumber(ai.prompt_tokens)} prompt tokens`
              : ''}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {ai.is_emergency ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/35 bg-destructive/10 p-3 dark:bg-destructive/14">
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0 text-destructive"
              aria-hidden
            />
            <p className="text-sm leading-relaxed">
              <span className="font-semibold text-destructive">
                Flagged as an emergency.
              </span>{' '}
              The analyzer believes this describes an immediate danger to life or property
              and should be dispatched now.
            </p>
          </div>
        ) : null}

        <Field label="Summary">
          <p className="leading-relaxed text-pretty">{ai.summary}</p>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <CategoryBadge category={ai.category} withTooltip />
          </Field>
          <Field label="Priority">
            <PriorityBadge priority={ai.priority} withTooltip />
          </Field>
          <Field label="Suggested department">
            <span className="text-muted-foreground">
              {ai.department_suggestion ?? 'No suggestion'}
            </span>
          </Field>
          <Field label="Sentiment">
            {ai.sentiment ? (
              <span title={SENTIMENT_META[ai.sentiment].description}>
                {SENTIMENT_META[ai.sentiment].label}
              </span>
            ) : (
              <span className="text-muted-foreground">Not detected</span>
            )}
          </Field>
        </div>

        <Separator />

        <Field label="Confidence">
          <ConfidenceMeter value={ai.confidence} />
        </Field>

        {ai.keywords.length > 0 ? (
          <Field label="Extracted signals">
            <ul className="flex flex-wrap gap-1.5">
              {ai.keywords.map((keyword) => (
                <li
                  key={keyword}
                  className="rounded-full border bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {keyword}
                </li>
              ))}
            </ul>
          </Field>
        ) : null}

        {ai.reasoning ? (
          <Field label="Why the model said this">
            <p className="leading-relaxed text-pretty text-muted-foreground">
              {ai.reasoning}
            </p>
          </Field>
        ) : null}
      </CardContent>
    </Card>
  )
}
