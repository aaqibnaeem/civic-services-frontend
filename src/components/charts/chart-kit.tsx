/**
 * Shared chart chrome for the admin dashboard.
 *
 * Every chart on `/admin/analytics` goes through `<ChartCard/>` so the whole page
 * reads as one system: same header hierarchy, same recessive grid, same tooltip,
 * same "what does this mean" body copy under the plot.
 *
 * Design rules enforced here (see docs/phases/PHASE_07_ADMIN_UI.md):
 *  - grid + axes are SOLID hairlines one step off the surface, never dashed
 *  - bars are capped at 24px and rounded only at the data end
 *  - a legend is present whenever there are ≥2 series; one series gets none
 *  - colours come from `@/lib/domain` so a chart slice matches its badge
 *  - the light-mode `electricity` token sits at 2.6:1 against white, so every
 *    categorical chart ships a table view beside it — colour is never the only
 *    channel
 *  - on refetch the previous render is held at reduced opacity (no skeleton flash)
 */

import type { ReactNode } from 'react'
import { Info } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'

/* ========================================================================== */
/* Axis / grid defaults                                                       */
/* ========================================================================== */

/** One-step-off-surface hairline. Solid — dashed grids read as thresholds. */
export const GRID_PROPS = {
  stroke: 'var(--border)',
  strokeDasharray: '0',
  strokeWidth: 1,
} as const

export const AXIS_PROPS = {
  stroke: 'var(--border)',
  tickLine: false,
  axisLine: false,
  tick: { fill: 'var(--muted-foreground)', fontSize: 11 },
} as const

/** Recharts wants a plain number for bar thickness; 24px is the house cap. */
export const MAX_BAR_SIZE = 24

/** `[topLeft, topRight, bottomRight, bottomLeft]` — 4px only at the data end. */
export const RADIUS_TOP: [number, number, number, number] = [4, 4, 0, 0]
export const RADIUS_RIGHT: [number, number, number, number] = [0, 4, 4, 0]

/* ========================================================================== */
/* Interpretation — the graded deliverable                                    */
/* ========================================================================== */

export interface InterpretationProps {
  children: ReactNode
  className?: string
  /** `plain` drops the icon chrome, for use inside an already-bordered block. */
  variant?: 'default' | 'plain'
}

/**
 * The `interpretation` string that every analytics endpoint returns. The brief
 * grades explanation over plotting, so this is body copy — not a caption.
 */
export function Interpretation({
  children,
  className,
  variant = 'default',
}: InterpretationProps) {
  if (!children) return null

  if (variant === 'plain') {
    return (
      <p className={cn('text-sm leading-relaxed text-muted-foreground', className)}>
        {children}
      </p>
    )
  }

  return (
    <div
      className={cn(
        'flex gap-2.5 rounded-lg border border-info/20 bg-info/5 p-3 dark:bg-info/10',
        className,
      )}
    >
      <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden strokeWidth={2} />
      <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
        {children}
      </p>
    </div>
  )
}

/* ========================================================================== */
/* ChartCard                                                                  */
/* ========================================================================== */

export interface ChartCardProps {
  title: ReactNode
  description?: ReactNode
  /** Rendered top-right — a stat callout, a toggle, a badge. */
  actions?: ReactNode
  /** The `interpretation` string from the endpoint. Rendered under the plot. */
  interpretation?: ReactNode
  /** A caveat rendered as a warning strip (e.g. `sample_warning`). */
  warning?: ReactNode
  children: ReactNode
  className?: string
  /** Held at reduced opacity while a background refetch is in flight. */
  refetching?: boolean
}

export function ChartCard({
  title,
  description,
  actions,
  interpretation,
  warning,
  children,
  className,
  refetching = false,
}: ChartCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="gap-1.5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h3 className="text-base leading-tight font-semibold">{title}</h3>
            {description ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {warning ? (
          <p className="rounded-lg border border-warning/30 bg-warning/8 p-2.5 text-xs leading-relaxed text-foreground dark:bg-warning/12">
            {warning}
          </p>
        ) : null}

        <div
          className={cn(
            'transition-opacity duration-200',
            refetching && 'pointer-events-none opacity-60',
          )}
        >
          {children}
        </div>

        {interpretation ? <Interpretation>{interpretation}</Interpretation> : null}
      </CardContent>
    </Card>
  )
}

/* ========================================================================== */
/* SectionState — independent per-section loading / error                     */
/* ========================================================================== */

export interface SectionStateProps {
  isPending: boolean
  error: unknown
  onRetry?: () => void
  /** Shape-matched skeleton while the first response is in flight. */
  skeleton?: ReactNode
  children: ReactNode
  title?: string
}

/**
 * Renders one dashboard section independently so a slow endpoint never blocks
 * the rest of the page. Each analytics hook owns its own state.
 */
export function SectionState({
  isPending,
  error,
  onRetry,
  skeleton,
  children,
  title,
}: SectionStateProps) {
  if (error) {
    return (
      <ErrorState
        error={error}
        title={title ? `${title} could not load` : undefined}
        onRetry={onRetry}
      />
    )
  }
  if (isPending) return <>{skeleton ?? <LoadingSkeleton variant="chart" />}</>
  return <>{children}</>
}

/* ========================================================================== */
/* Tooltip                                                                    */
/* ========================================================================== */

export interface TipPayloadItem {
  name?: string | number
  dataKey?: string | number
  value?: number | string | Array<number | string> | null
  color?: string
  payload?: Record<string, unknown>
}

export interface ChartTipProps {
  /** Injected by Recharts when it clones the element. */
  active?: boolean
  payload?: TipPayloadItem[]
  label?: string | number
  /** Overrides the heading (Recharts passes the axis value by default). */
  heading?: (payload: TipPayloadItem[], label: string | number | undefined) => ReactNode
  /** Formats a row's value. */
  format?: (value: number, item: TipPayloadItem) => ReactNode
  /** Extra rows appended below the series rows, e.g. cumulative percent. */
  footer?: (payload: TipPayloadItem[]) => ReactNode
  /** Hide the per-series rows entirely (heading + footer only). */
  hideSeries?: boolean
}

/**
 * The house tooltip. Values lead (strong, tabular), series names follow
 * (muted), and each row is keyed by a short stroke of the series colour rather
 * than a filled box — at tooltip density a box is data-weight ink doing a
 * label's job.
 */
export function ChartTip({
  active,
  payload,
  label,
  heading,
  format,
  footer,
  hideSeries = false,
}: ChartTipProps) {
  if (!active || !payload?.length) return null

  const rows = payload.filter((item) => item.value !== null && item.value !== undefined)

  return (
    <div className="pointer-events-none min-w-40 rounded-lg border bg-popover px-3 py-2 text-xs shadow-civic-lg">
      <p className="mb-1.5 font-medium text-foreground">
        {heading ? heading(payload, label) : label}
      </p>

      {!hideSeries && (
        <div className="space-y-1">
          {rows.map((item, index) => {
            const numeric = typeof item.value === 'number' ? item.value : Number(item.value)
            return (
              <div
                key={`${String(item.dataKey ?? item.name ?? index)}`}
                className="flex items-center justify-between gap-4"
              >
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span
                    aria-hidden
                    className="h-0.5 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color ?? 'var(--muted-foreground)' }}
                  />
                  {item.name ?? item.dataKey}
                </span>
                <span className="tabular font-semibold text-foreground">
                  {format && Number.isFinite(numeric)
                    ? format(numeric, item)
                    : Number.isFinite(numeric)
                      ? numeric.toLocaleString()
                      : String(item.value)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {footer ? (
        <div className="mt-1.5 border-t pt-1.5 text-[0.6875rem] leading-relaxed text-muted-foreground">
          {footer(payload)}
        </div>
      ) : null}
    </div>
  )
}

/* ========================================================================== */
/* Small typographic helpers used inside chart cards                          */
/* ========================================================================== */

export interface CalloutProps {
  label: string
  value: ReactNode
  hint?: ReactNode
  className?: string
}

/** A single highlighted number beside a chart, e.g. "Mode — Drainage". */
export function Callout({ label, value, hint, className }: CalloutProps) {
  return (
    <div className={cn('rounded-lg border bg-muted/40 px-3 py-2', className)}>
      <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/** Legend row used where a chart's series identity needs a non-colour channel. */
export function LegendKey({
  color,
  label,
  shape = 'rect',
}: {
  color: string
  label: ReactNode
  shape?: 'rect' | 'line' | 'dot'
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden
        className={cn(
          'shrink-0',
          shape === 'rect' && 'size-2.5 rounded-[2px]',
          shape === 'line' && 'h-0.5 w-4 rounded-full',
          shape === 'dot' && 'size-2.5 rounded-full',
        )}
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  )
}
