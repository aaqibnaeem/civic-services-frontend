import { ArrowRight, Check, ShieldCheck } from 'lucide-react'

import { AiSourceBadge } from '@/components/AiSourceBadge'
import { AI_SOURCE_META } from '@/lib/domain'
import type { AISource } from '@/lib/api/types'
import { cn } from '@/lib/utils'

import { AI_INPUTS, AI_NEVER_SENT, AI_OUTPUTS, AI_TIERS } from './constants'

export interface AiExplainerProps {
  /** The tier currently answering, from `/ai/health`. Null while unknown. */
  activeSource?: AISource | null
  className?: string
}

/**
 * The honest version of the AI story: three tiers, what goes in, what comes
 * out, and the promise that the UI always says which tier answered.
 *
 * A judge who reads only the landing page should be able to describe the
 * architecture from this section alone.
 */
export function AiExplainer({ activeSource = null, className }: AiExplainerProps) {
  return (
    <div className={cn('space-y-6', className)}>
      <div className="grid gap-4 lg:grid-cols-3">
        {AI_TIERS.map((tier) => {
          const meta = AI_SOURCE_META[tier.source]
          const isActive = activeSource === tier.source

          return (
            <article
              key={tier.source}
              className={cn(
                'relative flex flex-col gap-3 rounded-xl border bg-card p-5',
                isActive && 'border-primary/40 shadow-civic',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Tier {meta.tier}
                </span>
                <AiSourceBadge source={tier.source} size="sm" withTooltip={false} />
              </div>

              <h3 className="text-sm font-semibold">{tier.headline}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{tier.detail}</p>

              <p className="mt-auto pt-2 font-mono text-[0.6875rem] text-muted-foreground/80">
                {tier.model}
              </p>

              {isActive ? (
                <p className="flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary/8 px-2 py-1 text-[0.6875rem] font-medium text-primary dark:bg-primary/12">
                  <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                  Answering right now
                </p>
              ) : null}
            </article>
          )
        })}
      </div>

      <div className="grid gap-4 rounded-xl border bg-muted/30 p-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            What the analyzer receives
          </p>
          <ul className="space-y-1.5">
            {AI_INPUTS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {AI_NEVER_SENT}
          </p>
        </div>

        <ArrowRight
          className="mx-auto hidden size-5 text-muted-foreground sm:block"
          aria-hidden
        />

        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            What it returns
          </p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {AI_OUTPUTS.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        Submitting never waits on the AI. Your report is saved first and analysed a moment later, so
        a provider outage can delay the analysis but can never lose a complaint. Whichever tier
        answers, its badge is shown on the report — a keyword-rules result is never presented as a
        language-model one.
      </p>
    </div>
  )
}
