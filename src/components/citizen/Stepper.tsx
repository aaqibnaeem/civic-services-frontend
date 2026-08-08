import { Check, type LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface StepDefinition {
  id: string
  label: string
  /** One-line hint under the label on wide screens. */
  hint: string
  icon: LucideIcon
}

export interface StepperProps {
  steps: StepDefinition[]
  /** Zero-based index of the step being shown. */
  current: number
  /** Highest step the citizen has reached — anything beyond it is not clickable. */
  furthest: number
  onSelect: (index: number) => void
  className?: string
}

/**
 * Horizontal progress stepper for the report flow.
 *
 * Accessibility: it is an ordered list of buttons, so it is keyboard reachable
 * with Tab and activated with Enter/Space. Steps ahead of the citizen are
 * genuinely `disabled` (not just styled) so focus never lands somewhere that
 * does nothing. The active step carries `aria-current="step"`.
 */
export function Stepper({ steps, current, furthest, onSelect, className }: StepperProps) {
  return (
    <nav aria-label="Report progress" className={className}>
      <ol className="flex w-full items-stretch gap-1.5 sm:gap-2">
        {steps.map((step, index) => {
          const isDone = index < current
          const isCurrent = index === current
          const reachable = index <= furthest
          const Icon = step.icon

          return (
            <li key={step.id} className="min-w-0 flex-1">
              <button
                type="button"
                disabled={!reachable || isCurrent}
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => onSelect(index)}
                className={cn(
                  'group flex h-full w-full flex-col gap-2 rounded-lg border p-2.5 text-left transition-colors sm:p-3',
                  'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
                  isCurrent && 'border-primary/40 bg-primary/8 dark:bg-primary/12',
                  isDone && 'border-success/30 bg-success/8 hover:bg-success/12 dark:bg-success/10',
                  !isCurrent && !isDone && 'border-border bg-card',
                  reachable && !isCurrent && 'cursor-pointer hover:border-primary/30',
                  !reachable && 'opacity-55',
                )}
              >
                <span className="flex items-center justify-center gap-2 sm:justify-start">
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-md border text-[0.6875rem] font-semibold',
                      isCurrent && 'border-primary/40 bg-primary text-primary-foreground',
                      isDone && 'border-success/40 bg-success text-success-foreground',
                      !isCurrent && !isDone && 'border-border bg-muted text-muted-foreground',
                    )}
                  >
                    {isDone ? (
                      <Check className="size-3.5" aria-hidden strokeWidth={3} />
                    ) : (
                      <Icon className="size-3.5" aria-hidden strokeWidth={2.4} />
                    )}
                  </span>
                  {/* The accessible name is always present; only the printed
                      label is dropped below `sm`, where four labels cannot fit
                      at 360px and the page header already names the step. */}
                  <span className="sr-only">
                    Step {index + 1} of {steps.length}: {step.label}
                    {isDone ? ' (completed)' : ''}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      'hidden truncate text-xs font-medium sm:inline sm:text-sm',
                      isCurrent ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {step.label}
                  </span>
                </span>
                <span className="hidden text-xs leading-snug text-muted-foreground lg:block">
                  {step.hint}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
