/**
 * Department and area comparisons.
 *
 * Form choice (dataviz): departments have three different measures — volume,
 * median resolution time, backlog. Those are three different units, so they get
 * three columns of a table plus ONE chart of the measure that carries the story
 * (median time to resolve). The chart uses the **emphasis** form: the slowest
 * department is the accent, everyone else is the de-emphasis grey. A dual-axis
 * chart mixing hours and counts would be the classic misleading dashboard.
 */

import { Bar, BarChart, CartesianGrid, Cell, LabelList, Tooltip, XAxis, YAxis } from 'recharts'

import { ChartContainer } from '@/components/ui/chart'
import { CATEGORY_META, CHART_COLORS, formatHours, formatNumber, formatPercent } from '@/lib/domain'
import type { AreaStat, Category, DepartmentStat } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { AXIS_PROPS, ChartTip, GRID_PROPS, MAX_BAR_SIZE, RADIUS_RIGHT } from './chart-kit'

const ACCENT = CHART_COLORS[4]
const NEUTRAL = CHART_COLORS[7]

/* ========================================================================== */
/* Departments — median resolution time, slowest emphasised                   */
/* ========================================================================== */

export interface DepartmentSpeedChartProps {
  departments: DepartmentStat[]
  /** City-wide median, drawn as a reference so "slow" is relative to something. */
  overallMedianHours: number | null
  slowest?: string | null
  height?: number
  className?: string
}

export function DepartmentSpeedChart({
  departments,
  overallMedianHours,
  slowest,
  height = 240,
  className,
}: DepartmentSpeedChartProps) {
  const rows = departments
    .filter((d) => d.median_resolution_hours !== null)
    .map((d) => ({
      ...d,
      short: d.department.replace(/^Karachi\s+/, '').split(' — ')[0],
      median: d.median_resolution_hours ?? 0,
      isSlowest: d.department === slowest,
    }))
    .sort((a, b) => b.median - a.median)

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No resolved complaints yet.</p>
  }

  const max = Math.max(...rows.map((r) => r.median), overallMedianHours ?? 0, 1)

  return (
    <div className={cn('space-y-3', className)}>
      <ChartContainer
        config={{ median: { label: 'Median resolution time' } }}
        className="aspect-auto w-full"
        style={{ height }}
      >
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 60, bottom: 4, left: 4 }}
          barCategoryGap="24%"
        >
          <CartesianGrid {...GRID_PROPS} horizontal={false} />
          <XAxis type="number" hide domain={[0, max * 1.15]} />
          <YAxis
            {...AXIS_PROPS}
            type="category"
            dataKey="short"
            width={140}
            interval={0}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)', fillOpacity: 0.5 }}
            content={
              <ChartTip
                heading={(payload) =>
                  String(
                    (payload[0]?.payload as unknown as DepartmentStat | undefined)
                      ?.department ?? '',
                  )
                }
                format={(value) => formatHours(value)}
                footer={(payload) => {
                  const row = payload[0]?.payload as unknown as DepartmentStat | undefined
                  if (!row) return null
                  return `${formatNumber(row.n)} complaints · ${formatNumber(
                    row.backlog,
                  )} in backlog · ${formatPercent(row.resolution_rate, 0)} resolved`
                }}
              />
            }
          />
          <Bar
            dataKey="median"
            name="Median resolution time"
            radius={RADIUS_RIGHT}
            maxBarSize={MAX_BAR_SIZE}
            isAnimationActive={false}
          >
            {rows.map((row) => (
              <Cell
                key={row.department}
                fill={row.isSlowest ? ACCENT : NEUTRAL}
                fillOpacity={row.isSlowest ? 1 : 0.55}
              />
            ))}
            <LabelList
              dataKey="median"
              position="right"
              offset={8}
              className="fill-foreground"
              fontSize={11}
              formatter={(value: unknown) => formatHours(Number(value))}
            />
          </Bar>
        </BarChart>
      </ChartContainer>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-[2px]"
            style={{ backgroundColor: ACCENT }}
          />
          Slowest department
        </span>
        {overallMedianHours !== null ? (
          <span>
            City-wide median: <span className="tabular font-medium text-foreground">
              {formatHours(overallMedianHours)}
            </span>
          </span>
        ) : null}
      </div>
    </div>
  )
}

/* ========================================================================== */
/* Department table                                                           */
/* ========================================================================== */

export interface DepartmentTableProps {
  departments: DepartmentStat[]
  slowest?: string | null
  largestBacklog?: string | null
  className?: string
}

export function DepartmentTable({
  departments,
  slowest,
  largestBacklog,
  className,
}: DepartmentTableProps) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border', className)}>
      <table className="w-full text-sm">
        <caption className="sr-only">Department workload and speed comparison</caption>
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th scope="col" className="px-3 py-2 font-medium">
              Department
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Volume
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Backlog
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Resolved
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Median
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              P90
            </th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => (
            <tr key={dept.department} className="border-b last:border-b-0">
              <th scope="row" className="px-3 py-2 text-left font-normal">
                <span className="flex flex-wrap items-center gap-1.5">
                  {dept.department}
                  {dept.department === slowest ? (
                    <span className="rounded-full border border-destructive/30 bg-destructive/10 px-1.5 text-[0.625rem] font-medium text-destructive">
                      slowest
                    </span>
                  ) : null}
                  {dept.department === largestBacklog ? (
                    <span className="rounded-full border border-warning/40 bg-warning/12 px-1.5 text-[0.625rem] font-medium text-warning">
                      biggest backlog
                    </span>
                  ) : null}
                </span>
                {dept.sample_warning ? (
                  <span className="block text-[0.6875rem] text-muted-foreground">
                    {dept.sample_warning}
                  </span>
                ) : null}
              </th>
              <td className="px-3 py-2 text-right tabular">{formatNumber(dept.n)}</td>
              <td
                className={cn(
                  'px-3 py-2 text-right tabular',
                  dept.department === largestBacklog && 'font-semibold text-warning',
                )}
              >
                {formatNumber(dept.backlog)}
              </td>
              <td className="px-3 py-2 text-right tabular text-muted-foreground">
                {formatPercent(dept.resolution_rate, 0)}
              </td>
              <td
                className={cn(
                  'px-3 py-2 text-right tabular',
                  dept.department === slowest && 'font-semibold text-destructive',
                )}
              >
                {formatHours(dept.median_resolution_hours)}
              </td>
              <td className="px-3 py-2 text-right tabular text-muted-foreground">
                {formatHours(dept.p90_resolution_hours)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ========================================================================== */
/* Areas — volume with hotspots flagged                                       */
/* ========================================================================== */

export interface AreaVolumeChartProps {
  areas: AreaStat[]
  height?: number
  className?: string
}

export function AreaVolumeChart({ areas, height = 320, className }: AreaVolumeChartProps) {
  const rows = [...areas].sort((a, b) => b.n - a.n)
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">No areas recorded.</p>
  }
  const max = Math.max(...rows.map((r) => r.n), 1)

  return (
    <div className={cn('space-y-3', className)}>
      <ChartContainer
        config={{ n: { label: 'Complaints' } }}
        className="aspect-auto w-full"
        style={{ height }}
      >
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 48, bottom: 4, left: 4 }}
          barCategoryGap="22%"
        >
          <CartesianGrid {...GRID_PROPS} horizontal={false} />
          <XAxis type="number" hide domain={[0, max * 1.12]} />
          <YAxis
            {...AXIS_PROPS}
            type="category"
            dataKey="area"
            width={124}
            interval={0}
            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)', fillOpacity: 0.5 }}
            content={
              <ChartTip
                heading={(payload) =>
                  String((payload[0]?.payload as unknown as AreaStat | undefined)?.area ?? '')
                }
                format={(value) => formatNumber(value)}
                footer={(payload) => {
                  const row = payload[0]?.payload as unknown as AreaStat | undefined
                  if (!row) return null
                  return `${formatPercent(row.share_pct, 1)} of the city · mostly ${
                    row.top_category_label ?? '—'
                  } · median ${formatHours(row.median_resolution_hours)}`
                }}
              />
            }
          />
          <Bar
            dataKey="n"
            name="Complaints"
            radius={RADIUS_RIGHT}
            maxBarSize={MAX_BAR_SIZE}
            isAnimationActive={false}
          >
            {rows.map((row) => (
              <Cell
                key={row.area}
                fill={row.hotspot ? ACCENT : NEUTRAL}
                fillOpacity={row.hotspot ? 1 : 0.55}
              />
            ))}
            <LabelList
              dataKey="n"
              position="right"
              offset={8}
              className="fill-foreground"
              fontSize={11}
              formatter={(value: unknown) => formatNumber(Number(value))}
            />
          </Bar>
        </BarChart>
      </ChartContainer>

      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          aria-hidden
          className="size-2.5 rounded-[2px]"
          style={{ backgroundColor: ACCENT }}
        />
        Hotspot — at least 1.5× an even share of the city&rsquo;s complaints
      </span>
    </div>
  )
}

/* ========================================================================== */
/* Area table                                                                 */
/* ========================================================================== */

export interface AreaTableProps {
  areas: AreaStat[]
  className?: string
}

export function AreaTable({ areas, className }: AreaTableProps) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border', className)}>
      <table className="w-full text-sm">
        <caption className="sr-only">Complaint volume and mix by area</caption>
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th scope="col" className="px-3 py-2 font-medium">
              Area
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Volume
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Share
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Open
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Critical
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Top category
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Median
            </th>
          </tr>
        </thead>
        <tbody>
          {areas.map((area) => (
            <tr key={area.area} className="border-b last:border-b-0">
              <th scope="row" className="px-3 py-2 text-left font-normal">
                <span className="flex flex-wrap items-center gap-1.5">
                  {area.area}
                  {area.hotspot ? (
                    <span
                      className="rounded-full border border-warning/40 bg-warning/12 px-1.5 text-[0.625rem] font-medium text-warning"
                      title={area.hotspot_reason ?? undefined}
                    >
                      hotspot
                    </span>
                  ) : null}
                </span>
              </th>
              <td className="px-3 py-2 text-right tabular">{formatNumber(area.n)}</td>
              <td className="px-3 py-2 text-right tabular text-muted-foreground">
                {formatPercent(area.share_pct, 1)}
              </td>
              <td className="px-3 py-2 text-right tabular">{formatNumber(area.open)}</td>
              <td
                className={cn(
                  'px-3 py-2 text-right tabular',
                  area.critical_count > 0 && 'text-destructive',
                )}
              >
                {formatNumber(area.critical_count)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="flex items-center gap-2">
                  {area.top_category ? (
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-[2px]"
                      style={{
                        backgroundColor:
                          CATEGORY_META[area.top_category as Category]?.color ?? NEUTRAL,
                      }}
                    />
                  ) : null}
                  <span className="text-muted-foreground">
                    {area.top_category_label ?? '—'}
                  </span>
                </span>
              </td>
              <td className="px-3 py-2 text-right tabular text-muted-foreground">
                {formatHours(area.median_resolution_hours)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
