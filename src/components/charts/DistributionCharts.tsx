/**
 * Categorical distribution charts: category frequency, priority frequency, and
 * the category × priority contingency grid.
 *
 * Form choice (dataviz): the categories ARE the subject, so identity colour is
 * correct and each bar wears its own domain token — the same one its badge uses
 * everywhere else in the app. Cumulative percent stays in the adjacent table
 * rather than becoming a second y-axis; a dual-axis Pareto invents a correlation
 * the data does not contain.
 */

import { Bar, BarChart, Cell, LabelList, Tooltip, XAxis, YAxis } from 'recharts'

import { ChartContainer } from '@/components/ui/chart'
import {
  CATEGORY_META,
  CHART_COLORS,
  PRIORITY_META,
  formatNumber,
  formatPercent,
} from '@/lib/domain'
import type {
  Category,
  ContingencyTable,
  FrequencyDistribution,
  Priority,
} from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { AXIS_PROPS, ChartTip, MAX_BAR_SIZE, RADIUS_RIGHT } from './chart-kit'

/* ========================================================================== */
/* Helpers                                                                    */
/* ========================================================================== */

const isCategory = (value: string): value is Category => value in CATEGORY_META
const isPriority = (value: string): value is Priority => value in PRIORITY_META

export function domainColor(variable: string, value: string): string {
  if (variable === 'category' && isCategory(value)) return CATEGORY_META[value].color
  if (variable === 'priority' && isPriority(value)) return PRIORITY_META[value].color
  return CHART_COLORS[0]
}

export function domainShortLabel(variable: string, value: string, fallback: string): string {
  if (variable === 'category' && isCategory(value)) return CATEGORY_META[value].short
  if (variable === 'priority' && isPriority(value)) return PRIORITY_META[value].label
  return fallback
}

interface Row {
  value: string
  label: string
  short: string
  count: number
  percent: number
  cumulative_percent: number
  fill: string
}

function toRows(distribution: FrequencyDistribution): Row[] {
  return distribution.rows.map((row) => ({
    value: row.value,
    label: row.label,
    short: domainShortLabel(distribution.variable, row.value, row.label),
    count: row.count,
    percent: row.percent,
    cumulative_percent: row.cumulative_percent,
    fill: domainColor(distribution.variable, row.value),
  }))
}

/* ========================================================================== */
/* Frequency bar chart (horizontal)                                           */
/* ========================================================================== */

export interface FrequencyBarChartProps {
  distribution: FrequencyDistribution
  /** Height in px. Horizontal bars need room per category. */
  height?: number
  className?: string
}

/**
 * Horizontal bars — category names are long, and a horizontal axis keeps them
 * readable without rotated ticks. Values are labelled at the tip so the chart
 * never depends on colour alone (the light-mode electricity token sits below
 * 3:1 against the card surface).
 */
export function FrequencyBarChart({
  distribution,
  height = 260,
  className,
}: FrequencyBarChartProps) {
  const rows = toRows(distribution)
  const max = Math.max(...rows.map((r) => r.count), 1)

  return (
    <ChartContainer
      config={{ count: { label: 'Complaints' } }}
      className={cn('aspect-auto w-full', className)}
      style={{ height }}
    >
      <BarChart
        data={rows}
        layout="vertical"
        margin={{ top: 4, right: 44, bottom: 4, left: 4 }}
        barCategoryGap="22%"
      >
        <XAxis type="number" hide domain={[0, max * 1.12]} />
        <YAxis
          {...AXIS_PROPS}
          type="category"
          dataKey="short"
          width={92}
          interval={0}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: 'var(--muted)', fillOpacity: 0.5 }}
          content={
            <ChartTip
              heading={(payload) => String(payload[0]?.payload?.label ?? '')}
              format={(value) => formatNumber(value)}
              footer={(payload) => {
                const row = payload[0]?.payload as unknown as Row | undefined
                if (!row) return null
                return `${formatPercent(row.percent, 1)} of all complaints · ${formatPercent(
                  row.cumulative_percent,
                  1,
                )} cumulative`
              }}
            />
          }
        />
        <Bar
          dataKey="count"
          name="Complaints"
          radius={RADIUS_RIGHT}
          maxBarSize={MAX_BAR_SIZE}
          isAnimationActive={false}
        >
          {rows.map((row) => (
            <Cell key={row.value} fill={row.fill} />
          ))}
          <LabelList
            dataKey="count"
            position="right"
            offset={8}
            className="fill-foreground"
            fontSize={11}
            formatter={(value: unknown) => formatNumber(Number(value))}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

/* ========================================================================== */
/* Frequency table — the WCAG-clean twin of every distribution chart          */
/* ========================================================================== */

export interface FrequencyTableProps {
  distribution: FrequencyDistribution
  className?: string
}

/**
 * Absolute frequency, relative frequency, percent and cumulative percent — the
 * full table the statistics brief asks for, and the accessible equivalent of the
 * bar chart beside it.
 */
export function FrequencyTable({ distribution, className }: FrequencyTableProps) {
  const rows = toRows(distribution)

  return (
    <div className={cn('overflow-x-auto rounded-lg border', className)}>
      <table className="w-full text-sm">
        <caption className="sr-only">
          Frequency distribution of {distribution.variable}
        </caption>
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th scope="col" className="px-3 py-2 font-medium">
              {distribution.variable === 'priority' ? 'Priority' : 'Category'}
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              f
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Rel. f
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              %
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Cum. %
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isMode = distribution.modes.includes(row.value)
            return (
              <tr key={row.value} className="border-b last:border-b-0">
                <th
                  scope="row"
                  className="px-3 py-2 text-left font-normal whitespace-nowrap"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: row.fill }}
                    />
                    <span className={cn(isMode && 'font-semibold text-foreground')}>
                      {row.label}
                    </span>
                    {isMode ? (
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 text-[0.625rem] font-medium text-primary">
                        mode
                      </span>
                    ) : null}
                  </span>
                </th>
                <td className="px-3 py-2 text-right tabular">{formatNumber(row.count)}</td>
                <td className="px-3 py-2 text-right tabular text-muted-foreground">
                  {(row.percent / 100).toFixed(4)}
                </td>
                <td className="px-3 py-2 text-right tabular">
                  {formatPercent(row.percent, 1)}
                </td>
                <td className="px-3 py-2 text-right tabular text-muted-foreground">
                  {formatPercent(row.cumulative_percent, 1)}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-muted/40 font-medium">
            <th scope="row" className="px-3 py-2 text-left">
              Total
            </th>
            <td className="px-3 py-2 text-right tabular">{formatNumber(distribution.n)}</td>
            <td className="px-3 py-2 text-right tabular text-muted-foreground">1.0000</td>
            <td className="px-3 py-2 text-right tabular">100.0%</td>
            <td className="px-3 py-2 text-right tabular text-muted-foreground">—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

/* ========================================================================== */
/* Contingency heat grid                                                      */
/* ========================================================================== */

export interface ContingencyHeatGridProps {
  table: ContingencyTable
  className?: string
}

/**
 * Category × priority as a readable heat grid.
 *
 * The tint is a SEQUENTIAL single-hue ramp driven by the ROW percentage, not the
 * raw count — otherwise a big category would look "hot" everywhere simply
 * because it is big. The number stays printed in every cell, so the colour is a
 * scanning aid, never the only channel.
 */
export function ContingencyHeatGrid({ table, className }: ContingencyHeatGridProps) {
  const rowPercents = table.row_percent_cells ?? []

  return (
    <div className={cn('space-y-3', className)}>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <caption className="sr-only">
            {table.row_variable} by {table.col_variable} contingency table with row
            percentages
          </caption>
          <thead>
            <tr className="border-b bg-muted/40">
              <th scope="col" className="px-3 py-2 text-left font-medium">
                {table.row_variable === 'category' ? 'Category' : table.row_variable}
              </th>
              {table.col_labels.map((col) => (
                <th key={col} scope="col" className="px-3 py-2 text-right font-medium">
                  {domainShortLabel(table.col_variable, col, col)}
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={row.value} className="border-b last:border-b-0">
                <th
                  scope="row"
                  className="px-3 py-2 text-left font-normal whitespace-nowrap"
                >
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{
                        backgroundColor: domainColor(table.row_variable, row.value),
                      }}
                    />
                    {row.label}
                  </span>
                </th>
                {table.col_labels.map((col) => {
                  const count = row.cells[col] ?? 0
                  const pct = rowPercents[rowIndex]?.[col] ?? 0
                  // 0..1 → 0..0.30 alpha on a single hue. Legible in both themes.
                  const alpha = Math.min(pct / 100, 1) * 0.3
                  return (
                    <td
                      key={col}
                      className="px-3 py-2 text-right tabular"
                      style={{
                        backgroundColor: `color-mix(in oklch, var(--primary) ${(
                          alpha * 100
                        ).toFixed(1)}%, transparent)`,
                      }}
                      title={`${row.label} · ${col}: ${count} (${pct.toFixed(1)}% of the row)`}
                    >
                      <span className="font-medium">{formatNumber(count)}</span>
                      <span className="ml-1.5 text-[0.6875rem] text-muted-foreground">
                        {pct.toFixed(0)}%
                      </span>
                    </td>
                  )
                })}
                <td className="px-3 py-2 text-right tabular font-medium">
                  {formatNumber(row.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/40 font-medium">
              <th scope="row" className="px-3 py-2 text-left">
                Total
              </th>
              {table.col_labels.map((col) => (
                <td key={col} className="px-3 py-2 text-right tabular">
                  {formatNumber(table.col_totals[col] ?? 0)}
                </td>
              ))}
              <td className="px-3 py-2 text-right tabular">
                {formatNumber(table.grand_total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>Share within each row</span>
        <span aria-hidden className="flex h-2.5 flex-1 max-w-40 overflow-hidden rounded-full">
          {[0, 0.25, 0.5, 0.75, 1].map((step) => (
            <span
              key={step}
              className="flex-1"
              style={{
                backgroundColor: `color-mix(in oklch, var(--primary) ${(
                  step * 30
                ).toFixed(1)}%, transparent)`,
              }}
            />
          ))}
        </span>
        <span className="tabular">0% → 100%</span>
      </div>
    </div>
  )
}
