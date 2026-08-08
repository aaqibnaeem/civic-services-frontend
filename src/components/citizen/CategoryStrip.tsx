import { CATEGORY_META, CATEGORY_OPTIONS, formatNumber, formatPercent } from '@/lib/domain'
import type { Category, FrequencyRow } from '@/lib/api/types'
import { cn } from '@/lib/utils'

export interface CategoryStripProps {
  /** `categories` from `/analytics/public-summary`. Missing rows render as zero. */
  rows: FrequencyRow[]
  /** Optional extra tile, rendered last so the 7-item grid does not end ragged. */
  trailing?: React.ReactNode
  className?: string
}

/**
 * The seven civic categories, with their real share of the live database.
 *
 * Colours and icons come from `CATEGORY_META` so a category looks identical
 * here, on a badge and in the admin charts.
 */
export function CategoryStrip({ rows, trailing, className }: CategoryStripProps) {
  const byValue = new Map(rows.map((row) => [row.value, row]))
  const max = rows.reduce((acc, row) => Math.max(acc, row.percent), 0) || 100

  return (
    <ul className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {CATEGORY_OPTIONS.map((option) => {
        const meta = CATEGORY_META[option.value as Category]
        const row = byValue.get(option.value)
        const percent = row?.percent ?? 0
        const count = row?.count ?? 0

        return (
          <li
            key={option.value}
            className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-civic"
          >
            <div className="flex items-start gap-3">
              <span
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg border',
                  meta.badgeClass,
                )}
              >
                <meta.icon className="size-4.5" aria-hidden strokeWidth={2.1} />
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm leading-snug font-medium">{meta.label}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {meta.description}
                </p>
              </div>
            </div>

            <div className="mt-auto space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="tabular text-sm font-semibold">{formatNumber(count)}</span>
                <span className="tabular text-xs text-muted-foreground">
                  {formatPercent(percent, 1)} of reports
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', meta.dotClass)}
                  style={{ width: `${Math.max(2, (percent / max) * 100)}%` }}
                />
              </div>
            </div>
          </li>
        )
      })}
      {trailing ? <li className="flex">{trailing}</li> : null}
    </ul>
  )
}
