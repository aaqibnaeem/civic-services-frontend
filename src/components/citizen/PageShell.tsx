import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type ShellWidth = 'narrow' | 'form' | 'default' | 'wide'

const WIDTH: Record<ShellWidth, string> = {
  narrow: 'max-w-2xl',
  form: 'max-w-3xl',
  default: 'max-w-5xl',
  wide: 'max-w-6xl',
}

export interface PageShellProps {
  children: ReactNode
  width?: ShellWidth
  className?: string
}

/**
 * The standard citizen page container.
 *
 * `PublicLayout` deliberately leaves `<main>` full-bleed so the landing page can
 * run edge-to-edge hero bands; every other page opts back into a measured
 * column through this component.
 */
export function PageShell({ children, width = 'default', className }: PageShellProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-8 sm:px-6 sm:py-10 lg:py-12',
        WIDTH[width],
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Full-bleed band used by the landing page. Handles its own inner container. */
export function Band({
  children,
  className,
  innerClassName,
  id,
}: {
  children: ReactNode
  className?: string
  innerClassName?: string
  id?: string
}) {
  return (
    <section id={id} className={cn('w-full', className)}>
      <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6', innerClassName)}>
        {children}
      </div>
    </section>
  )
}
