import { useEffect, useState } from 'react'
import {
  BrainCircuit,
  Check,
  Gauge,
  Layers,
  LoaderCircle,
  Route,
  ScrollText,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'

interface Stage {
  icon: LucideIcon
  label: string
  detail: string
}

/** The four things the analyzer actually does, in the order it does them. */
const STAGES: Stage[] = [
  {
    icon: ScrollText,
    label: 'Reading your complaint',
    detail: 'Tokenising the text and pulling out the civic signals in it.',
  },
  {
    icon: Layers,
    label: 'Classifying the problem',
    detail: 'Scoring it against all seven categories and taking the strongest.',
  },
  {
    icon: Gauge,
    label: 'Judging how urgent it is',
    detail: 'Weighing danger, how many people it affects and how long it has run.',
  },
  {
    icon: Route,
    label: 'Choosing the department',
    detail: 'Mapping the category onto the team that owns this kind of work.',
  },
]

export interface AnalyzingPanelProps {
  /** Bump this to restart the narration for a new analysis run. */
  runId: number
  /** Milliseconds each stage is highlighted before the next one starts. */
  stageMs?: number
  className?: string
}

/**
 * The "AI is working" state on the report flow's review step.
 *
 * It narrates the real pipeline rather than spinning a generic loader: each
 * stage below is a step the analyzer genuinely performs. The caller holds the
 * panel on screen for a short minimum so the narration is readable even when
 * the local model answers in single-digit milliseconds — the true latency is
 * then shown on the result, so nothing is overstated.
 */
export function AnalyzingPanel({ runId, stageMs = 620, className }: AnalyzingPanelProps) {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    setStage(0)
    const timer = window.setInterval(() => {
      setStage((current) => (current >= STAGES.length - 1 ? current : current + 1))
    }, stageMs)
    return () => window.clearInterval(timer)
  }, [runId, stageMs])

  const progress = ((stage + 1) / STAGES.length) * 100

  return (
    <Card className={cn('overflow-hidden border-primary/25', className)}>
      <CardContent className="space-y-6 p-6 sm:p-7">
        <div className="flex items-center gap-4">
          <span className="relative flex size-12 shrink-0 items-center justify-center">
            <span
              className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/15"
              aria-hidden
            />
            <span className="relative flex size-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary">
              <BrainCircuit className="size-6" aria-hidden strokeWidth={2} />
            </span>
          </span>

          <div className="min-w-0 space-y-1">
            <p className="text-base font-semibold">Analysing your report…</p>
            <p className="text-sm text-muted-foreground">
              Nothing is saved yet. This is a preview of what the department will see.
            </p>
          </div>
        </div>

        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          aria-label="Analysis progress"
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-primary/70 to-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol className="space-y-2.5" role="status" aria-live="polite">
          {STAGES.map((item, index) => {
            const done = index < stage
            const active = index === stage
            const Icon = item.icon

            return (
              <li
                key={item.label}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 transition-all duration-300',
                  active && 'border-primary/30 bg-primary/6 dark:bg-primary/10',
                  done && 'border-transparent bg-muted/40',
                  !active && !done && 'border-transparent opacity-55',
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border',
                    active && 'border-primary/40 bg-primary/12 text-primary',
                    done && 'border-success/30 bg-success/12 text-success',
                    !active && !done && 'border-border bg-muted text-muted-foreground',
                  )}
                >
                  {done ? (
                    <Check className="size-3.5" aria-hidden strokeWidth={3} />
                  ) : active ? (
                    <LoaderCircle className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Icon className="size-3.5" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 space-y-0.5">
                  <span
                    className={cn(
                      'block text-sm font-medium',
                      active ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {item.label}
                    {active ? <span className="sr-only"> — in progress</span> : null}
                  </span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
