import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

export interface Crumb {
  label: string
  to?: string
}

export interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  /** Small uppercase label above the title, e.g. "Triage". */
  eyebrow?: ReactNode
  breadcrumbs?: Crumb[]
  /** Buttons, filters — right-aligned on desktop, wrapped below on mobile. */
  actions?: ReactNode
  /** Badges rendered beside the title. */
  meta?: ReactNode
  /** Draws a rule under the header block. */
  separator?: boolean
  className?: string
}

/** Consistent page heading. Every route body should start with one of these. */
export function PageHeader({
  title,
  description,
  eyebrow,
  breadcrumbs,
  actions,
  meta,
  separator = true,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('space-y-4', className)}>
      {breadcrumbs?.length ? (
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="size-3 opacity-60" aria-hidden />}
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="rounded-sm transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          {eyebrow ? (
            <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">
              {eyebrow}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-2xl leading-tight font-semibold sm:text-3xl">{title}</h1>
            {meta}
          </div>
          {description ? (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>

      {separator ? <Separator /> : null}
    </header>
  )
}
