import { cn } from '@/lib/utils'

import { HOW_IT_WORKS } from './constants'

/** Report → AI understands it → Routed → Tracked. Four steps, no jargon. */
export function HowItWorks({ className }: { className?: string }) {
  return (
    <ol className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {HOW_IT_WORKS.map((step, index) => (
        <li
          key={step.title}
          className="relative flex flex-col gap-3 rounded-xl border bg-card p-5"
        >
          <span
            className="absolute top-4 right-4 tabular text-3xl leading-none font-semibold text-muted-foreground/15"
            aria-hidden
          >
            {index + 1}
          </span>

          <span className="flex size-10 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <step.icon className="size-5" aria-hidden strokeWidth={2} />
          </span>

          <div className="space-y-1.5">
            <h3 className="text-sm font-semibold">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
