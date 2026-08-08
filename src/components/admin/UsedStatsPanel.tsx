/**
 * "How this answer was computed."
 *
 * The assistant returns the exact numbers it used, so a judge asking "did the AI
 * make that up?" can open this panel and see the query plan, the filters that
 * were applied, the row count that matched and the group-by breakdown the
 * sentence was written from. The raw JSON is one click further down — nothing
 * is hidden.
 */

import { useState } from 'react'
import { Calculator, ChevronDown } from 'lucide-react'

import { formatNumber } from '@/lib/domain'
import { cn } from '@/lib/utils'

interface BreakdownGroup {
  key: string
  label: string
  count: number
  percent: number
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null
}

function readBreakdown(stats: Record<string, unknown>): {
  groupBy: string | null
  groups: BreakdownGroup[]
} {
  const breakdown = asRecord(stats.breakdown)
  if (!breakdown) return { groupBy: null, groups: [] }
  const raw = Array.isArray(breakdown.groups) ? breakdown.groups : []
  const groups = raw
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== null)
    .map((entry) => ({
      key: asString(entry.key) ?? '',
      label: asString(entry.label) ?? asString(entry.key) ?? '',
      count: asNumber(entry.count) ?? 0,
      percent: asNumber(entry.percent) ?? 0,
    }))
  return { groupBy: asString(breakdown.group_by), groups }
}

export interface UsedStatsPanelProps {
  stats: Record<string, unknown>
  /** Which tier answered — `llm`, `ml` or `rules`. */
  source?: string
  className?: string
}

export function UsedStatsPanel({ stats, source, className }: UsedStatsPanelProps) {
  const [open, setOpen] = useState(false)

  const totalMatching = asNumber(stats.total_matching)
  const totalAll = asNumber(stats.total_complaints_in_database)
  const windowDays = asNumber(stats.window_days)
  const intent = asString(stats.intent)
  const latency = asNumber(stats.latency_ms)
  const filters = asRecord(stats.filters_applied)
  const { groupBy, groups } = readBreakdown(stats)

  const filterChips: string[] = []
  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value) && value.length) {
        filterChips.push(`${key}: ${value.join(', ')}`)
      } else if (typeof value === 'string' && value) {
        filterChips.push(`${key}: ${value}`)
      }
    }
  }

  const hasSummary =
    totalMatching !== null || intent !== null || filterChips.length > 0 || groups.length > 0

  return (
    <div className={cn('rounded-lg border bg-muted/30', className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Calculator className="size-3.5 shrink-0 text-primary" aria-hidden />
        How this answer was computed
        {source ? (
          <span className="rounded-full border bg-card px-1.5 py-px text-[0.625rem] font-normal text-muted-foreground">
            {source}
          </span>
        ) : null}
        <ChevronDown
          className={cn('ml-auto size-4 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open ? (
        <div className="space-y-3 border-t px-3 py-3 text-xs">
          {hasSummary ? (
            <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
              {intent ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Question type</dt>
                  <dd className="font-medium">{intent}</dd>
                </div>
              ) : null}
              {windowDays !== null ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Time window</dt>
                  <dd className="tabular font-medium">last {windowDays} days</dd>
                </div>
              ) : null}
              {totalMatching !== null ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Rows matched</dt>
                  <dd className="tabular font-medium">
                    {formatNumber(totalMatching)}
                    {totalAll !== null ? ` of ${formatNumber(totalAll)}` : ''}
                  </dd>
                </div>
              ) : null}
              {latency !== null ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Computed in</dt>
                  <dd className="tabular font-medium">{formatNumber(latency)} ms</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {filterChips.length ? (
            <div className="space-y-1">
              <p className="text-muted-foreground">Filters applied to the database</p>
              <ul className="flex flex-wrap gap-1">
                {filterChips.map((chip) => (
                  <li
                    key={chip}
                    className="rounded-full border bg-card px-2 py-0.5 font-mono text-[0.625rem]"
                  >
                    {chip}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {groups.length ? (
            <div className="space-y-1">
              <p className="text-muted-foreground">
                Grouped by {groupBy ?? 'value'} — the numbers in the answer
              </p>
              <table className="w-full">
                <tbody>
                  {groups.map((group) => (
                    <tr key={group.key} className="border-b last:border-b-0">
                      <td className="py-1">{group.label}</td>
                      <td className="py-1 text-right tabular font-medium">
                        {formatNumber(group.count)}
                      </td>
                      <td className="py-1 text-right tabular text-muted-foreground">
                        {group.percent.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <details>
            <summary className="cursor-pointer text-muted-foreground">
              Raw computed values (JSON)
            </summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md border bg-card p-2 font-mono text-[0.625rem] leading-relaxed">
              {JSON.stringify(stats, null, 2)}
            </pre>
          </details>
        </div>
      ) : null}
    </div>
  )
}
