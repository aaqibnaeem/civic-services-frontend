/**
 * The resolution-time deep dive — the statistics benchmark.
 *
 * Three coordinated views of the same variable:
 *  1. `ResolutionHistogram` — the Freedman–Diaconis binned shape, one hue.
 *  2. `ResolutionBoxPlot`   — a composed five-number summary with Tukey fences
 *     and named outliers. Recharts has no box plot, so it is built from HTML
 *     primitives positioned on a linear scale, which also keeps the labels
 *     selectable and screen-reader reachable.
 *  3. `DescriptiveStatsTable` — the full numeric table (the accessible twin).
 *
 * The box plot is drawn twice at two domains: the full range (honest — it shows
 * how far the slow tail reaches) and a fence-clipped zoom (readable — the box
 * itself is only 7% of the full range because the distribution is that skewed).
 * Small multiples rather than a log axis: a log axis would flatter the tail.
 */

import { Fragment, useId } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { ChartContainer } from '@/components/ui/chart'
import { CHART_COLORS, formatHours, formatNumber, formatPercent } from '@/lib/domain'
import type { HistogramBin, OutlierPoint, ResolutionTimesResponse } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { AXIS_PROPS, GRID_PROPS, MAX_BAR_SIZE, RADIUS_TOP, ChartTip } from './chart-kit'

/* ========================================================================== */
/* Histogram                                                                  */
/* ========================================================================== */

export interface ResolutionHistogramProps {
  bins: HistogramBin[]
  /** Marked with a labelled reference line if it falls inside the plotted range. */
  median: number | null
  upperFence: number | null
  modalBin?: string | null
  height?: number
  className?: string
}

function binContaining(bins: HistogramBin[], value: number | null): string | undefined {
  if (value === null || value === undefined) return undefined
  const hit = bins.find((b) => value >= b.bin_start && value <= b.bin_end)
  return hit?.label
}

export function ResolutionHistogram({
  bins,
  median,
  upperFence,
  modalBin,
  height = 260,
  className,
}: ResolutionHistogramProps) {
  const medianBin = binContaining(bins, median)
  const fenceBin = binContaining(bins, upperFence)

  return (
    <ChartContainer
      config={{ count: { label: 'Complaints' } }}
      className={cn('aspect-auto w-full', className)}
      style={{ height }}
    >
      <BarChart data={bins} margin={{ top: 20, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid {...GRID_PROPS} vertical={false} />
        <XAxis
          {...AXIS_PROPS}
          dataKey="label"
          interval="preserveStartEnd"
          minTickGap={8}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
        />
        <YAxis {...AXIS_PROPS} width={36} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: 'var(--muted)', fillOpacity: 0.5 }}
          content={
            <ChartTip
              heading={(payload) => {
                const bin = payload[0]?.payload as unknown as HistogramBin | undefined
                return bin ? `${bin.bin_start.toFixed(0)}–${bin.bin_end.toFixed(0)} hours` : ''
              }}
              format={(value) => formatNumber(value)}
              footer={(payload) => {
                const bin = payload[0]?.payload as unknown as HistogramBin | undefined
                if (!bin) return null
                return `${formatPercent(bin.relative_frequency, 1)} of resolved complaints · ${(
                  bin.bin_start / 24
                ).toFixed(1)}–${(bin.bin_end / 24).toFixed(1)} days`
              }}
            />
          }
        />

        {medianBin ? (
          <ReferenceLine
            x={medianBin}
            stroke="var(--primary)"
            strokeWidth={1.5}
            label={{
              value: 'median',
              position: 'top',
              fill: 'var(--primary)',
              fontSize: 10,
            }}
          />
        ) : null}
        {fenceBin && fenceBin !== medianBin ? (
          <ReferenceLine
            x={fenceBin}
            stroke="var(--warning)"
            strokeWidth={1.5}
            label={{
              value: 'Tukey fence',
              position: 'top',
              fill: 'var(--warning)',
              fontSize: 10,
            }}
          />
        ) : null}

        <Bar
          dataKey="count"
          name="Complaints"
          radius={RADIUS_TOP}
          maxBarSize={MAX_BAR_SIZE}
          isAnimationActive={false}
        >
          {bins.map((bin) => (
            <Cell
              key={bin.label}
              fill={CHART_COLORS[0]}
              fillOpacity={modalBin && bin.label === modalBin ? 1 : 0.72}
            />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}

/* ========================================================================== */
/* Box plot                                                                   */
/* ========================================================================== */

export interface BoxPlotStats {
  min: number
  q1: number
  median: number
  q3: number
  max: number
  lowerFence: number | null
  upperFence: number | null
}

interface BoxPlotRowProps {
  stats: BoxPlotStats
  outliers: OutlierPoint[]
  /** Upper bound of the drawn axis. Values beyond it are clipped and counted. */
  domainMax: number
  caption: string
  /** Print the five-number summary under this row. */
  showSummary?: boolean
  onSelectOutlier?: (outlier: OutlierPoint) => void
}

function BoxPlotRow({
  stats,
  outliers,
  domainMax,
  caption,
  showSummary = false,
  onSelectOutlier,
}: BoxPlotRowProps) {
  const id = useId()
  const scale = (value: number) =>
    `${Math.max(0, Math.min(100, (value / domainMax) * 100))}%`

  const upperWhisker = Math.min(
    stats.max,
    stats.upperFence ?? stats.max,
    domainMax,
  )
  const lowerWhisker = Math.max(stats.min, stats.lowerFence ?? stats.min, 0)
  const visibleOutliers = outliers.filter((o) => o.value <= domainMax)
  const clipped = outliers.length - visibleOutliers.length

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * domainMax)

  return (
    <figure className="space-y-2">
      <figcaption className="text-xs font-medium text-muted-foreground">
        {caption}
      </figcaption>

      <div className="relative h-20 w-full" aria-describedby={id}>
        {/* whiskers */}
        <div
          className="absolute top-1/2 h-px -translate-y-1/2 bg-foreground/50"
          style={{
            left: scale(lowerWhisker),
            width: `calc(${scale(upperWhisker)} - ${scale(lowerWhisker)})`,
          }}
          aria-hidden
        />
        {/* whisker caps */}
        {[lowerWhisker, upperWhisker].map((value, i) => (
          <div
            key={i}
            className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-foreground/50"
            style={{ left: scale(value) }}
            aria-hidden
          />
        ))}

        {/* IQR box */}
        <div
          className="absolute top-1/2 h-8 -translate-y-1/2 rounded-[3px] border border-primary/50 bg-primary/15"
          style={{
            left: scale(stats.q1),
            width: `max(3px, calc(${scale(stats.q3)} - ${scale(stats.q1)}))`,
          }}
          title={`IQR: ${formatHours(stats.q1)} → ${formatHours(stats.q3)}`}
        />

        {/* median */}
        <div
          className="absolute top-1/2 h-8 w-0.5 -translate-x-px -translate-y-1/2 rounded-full bg-primary"
          style={{ left: scale(stats.median) }}
          title={`Median: ${formatHours(stats.median)}`}
        />

        {/* Tukey upper fence */}
        {stats.upperFence !== null && stats.upperFence <= domainMax ? (
          <div
            className="absolute top-2 bottom-6 w-px bg-warning"
            style={{ left: scale(stats.upperFence) }}
            title={`Tukey upper fence: ${formatHours(stats.upperFence)}`}
          />
        ) : null}

        {/* outliers */}
        {visibleOutliers.map((outlier) => (
          <button
            key={outlier.reference_code}
            type="button"
            onClick={onSelectOutlier ? () => onSelectOutlier(outlier) : undefined}
            title={`${outlier.reference_code} — ${formatHours(outlier.value)} (${
              outlier.verdict
            })`}
            aria-label={`Outlier ${outlier.reference_code}, ${formatHours(outlier.value)}`}
            className={cn(
              'absolute top-1/2 size-6 -translate-x-1/2 -translate-y-1/2 rounded-full',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              onSelectOutlier ? 'cursor-pointer' : 'cursor-default',
            )}
            style={{ left: scale(outlier.value) }}
          >
            <span
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive ring-2 ring-card"
            />
          </button>
        ))}

        {/* axis rule */}
        <div className="absolute inset-x-0 bottom-0 h-px bg-border" aria-hidden />
      </div>

      {/* Axis ticks live in their own band so they can never collide with the
          caption underneath — see anti-pattern "fixed height excludes the axis". */}
      <div className="relative h-4 w-full" aria-hidden>
        {ticks.map((tick) => (
          <span
            key={tick}
            className="absolute top-0 -translate-x-1/2 text-[0.625rem] tabular whitespace-nowrap text-muted-foreground"
            style={{ left: scale(tick) }}
          >
            {(tick / 24).toFixed(tick > 0 && tick / 24 < 10 ? 1 : 0)}d
          </span>
        ))}
      </div>

      <p id={id} className="text-[0.6875rem] leading-relaxed text-muted-foreground">
        {showSummary ? (
          <>
            Min {formatHours(stats.min)} · Q1 {formatHours(stats.q1)} · median{' '}
            {formatHours(stats.median)} · Q3 {formatHours(stats.q3)} · max{' '}
            {formatHours(stats.max)}
            {stats.upperFence !== null ? ` · fence ${formatHours(stats.upperFence)}` : ''}
          </>
        ) : null}
        {clipped > 0 ? (
          <>
            {showSummary ? ' · ' : ''}
            {clipped} outlier{clipped === 1 ? '' : 's'} sit beyond this scale — see the
            full-range view above
          </>
        ) : null}
      </p>
    </figure>
  )
}

export interface ResolutionBoxPlotProps {
  data: ResolutionTimesResponse
  onSelectOutlier?: (outlier: OutlierPoint) => void
  className?: string
}

/** Five-number summary + Tukey fences + marked outliers, at two scales. */
export function ResolutionBoxPlot({
  data,
  onSelectOutlier,
  className,
}: ResolutionBoxPlotProps) {
  if (
    data.min === null ||
    data.q1 === null ||
    data.q2 === null ||
    data.q3 === null ||
    data.max === null
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        Not enough resolved complaints to compute a five-number summary.
      </p>
    )
  }

  const stats: BoxPlotStats = {
    min: data.min,
    q1: data.q1,
    median: data.q2,
    q3: data.q3,
    max: data.max,
    lowerFence: data.lower_fence,
    upperFence: data.upper_fence,
  }

  const fullDomain = data.max * 1.02
  const zoomDomain = Math.max((data.upper_fence ?? data.q3 * 2) * 1.15, data.q3 * 1.2)

  return (
    <div className={cn('space-y-7', className)}>
      <BoxPlotRow
        stats={stats}
        outliers={data.outliers}
        domainMax={fullDomain}
        caption="Full range — every resolved complaint, including the slow tail"
        showSummary
        onSelectOutlier={onSelectOutlier}
      />
      <BoxPlotRow
        stats={stats}
        outliers={data.outliers}
        domainMax={zoomDomain}
        caption="Zoomed to the Tukey fence — where the middle 50% actually lives"
        onSelectOutlier={onSelectOutlier}
      />

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="h-3 w-5 rounded-[3px] border border-primary/50 bg-primary/15"
          />
          IQR (Q1–Q3)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-0.5 rounded-full bg-primary" />
          Median
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-px bg-warning" />
          Tukey fence (Q3 + 1.5·IQR)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-destructive ring-2 ring-card" />
          Outlier
        </span>
      </div>
    </div>
  )
}

/* ========================================================================== */
/* Descriptive statistics table                                               */
/* ========================================================================== */

export interface DescriptiveStatsTableProps {
  data: ResolutionTimesResponse
  className?: string
}

interface StatRow {
  label: string
  value: string
  note?: string
}

/**
 * Every descriptive statistic on the wire, labelled honestly — including
 * `ddof = 1`, the quartile method, and the multi-modal warning. This is what the
 * statistics benchmark actually reads.
 */
export function DescriptiveStatsTable({ data, className }: DescriptiveStatsTableProps) {
  const hrs = (value: number | null) =>
    value === null || value === undefined ? '—' : `${formatNumber(value, 1)} h`

  const modeLabel = () => {
    if (data.mode_kind === 'none' || data.mode === null) return 'No repeated value'
    if (data.mode_kind === 'multi') {
      return `${formatNumber(data.mode, 1)} h (+${data.modes.length - 1} tied)`
    }
    return `${formatNumber(data.mode, 1)} h`
  }

  const groups: Array<{ heading: string; rows: StatRow[] }> = [
    {
      heading: 'Centre',
      rows: [
        { label: 'n (resolved)', value: formatNumber(data.n), note: 'sample size' },
        { label: 'Mean', value: hrs(data.mean), note: formatHours(data.mean) },
        { label: 'Median (Q2)', value: hrs(data.median), note: formatHours(data.median) },
        {
          label: 'Mode',
          value: modeLabel(),
          note:
            data.mode_kind === 'multi'
              ? 'multi-modal — continuous data rarely has one true mode'
              : data.modal_bin
                ? `modal bin ${data.modal_bin}`
                : undefined,
        },
      ],
    },
    {
      heading: 'Spread',
      rows: [
        { label: 'Minimum', value: hrs(data.min) },
        { label: 'Maximum', value: hrs(data.max) },
        { label: 'Range', value: hrs(data.range), note: 'max − min' },
        {
          label: 'Variance',
          value: data.variance === null ? '—' : `${formatNumber(data.variance, 1)} h²`,
          note: `sample, ddof=${data.ddof}`,
        },
        {
          label: 'Std. deviation',
          value: hrs(data.std_dev),
          note: `sample, ddof=${data.ddof}`,
        },
        {
          label: 'Coefficient of variation',
          value:
            data.coefficient_of_variation === null
              ? '—'
              : formatNumber(data.coefficient_of_variation, 2),
          note: 'σ ÷ mean — >1 means wildly inconsistent',
        },
      ],
    },
    {
      heading: 'Quartiles & fences',
      rows: [
        { label: 'Q1 (25th pct)', value: hrs(data.q1) },
        { label: 'Q3 (75th pct)', value: hrs(data.q3) },
        { label: 'IQR', value: hrs(data.iqr), note: 'Q3 − Q1' },
        { label: 'P90', value: hrs(data.p90) },
        {
          label: 'Lower fence',
          value: hrs(data.lower_fence),
          note: 'Q1 − 1.5·IQR (negative ⇒ no slow-side floor)',
        },
        {
          label: 'Upper fence',
          value: hrs(data.upper_fence),
          note: 'Q3 + 1.5·IQR — anything past this is an outlier',
        },
      ],
    },
    {
      heading: 'Shape & precision',
      rows: [
        {
          label: 'Skewness (G1)',
          value: data.skewness === null ? '—' : formatNumber(data.skewness, 2),
          note: '>0 ⇒ a long right tail',
        },
        {
          label: 'Excess kurtosis (G2)',
          value: data.kurtosis === null ? '—' : formatNumber(data.kurtosis, 2),
          note: '>0 ⇒ heavier tails than normal',
        },
        { label: 'Standard error', value: hrs(data.standard_error) },
        {
          label: '95% CI for the mean',
          value:
            data.mean_ci95_low === null || data.mean_ci95_high === null
              ? '—'
              : `${formatNumber(data.mean_ci95_low, 1)} – ${formatNumber(
                  data.mean_ci95_high,
                  1,
                )} h`,
          note: "Student's t",
        },
      ],
    },
  ]

  return (
    <div className={cn('space-y-3', className)}>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Descriptive statistics for resolution time in {data.unit}
          </caption>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.heading}>
                <tr className="border-b bg-muted/40">
                  <th
                    scope="colgroup"
                    colSpan={2}
                    className="px-3 py-1.5 text-left text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase"
                  >
                    {group.heading}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr key={`${group.heading}-${row.label}`} className="border-b last:border-b-0">
                    <th scope="row" className="px-3 py-2 text-left font-normal">
                      {row.label}
                      {row.note ? (
                        <span className="block text-[0.6875rem] text-muted-foreground">
                          {row.note}
                        </span>
                      ) : null}
                    </th>
                    <td className="px-3 py-2 text-right align-top tabular font-medium whitespace-nowrap">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Quartiles use <span className="font-medium">{data.quartile_method}</span>; the
        histogram uses <span className="font-medium">{data.histogram_method}</span>. Variance
        and standard deviation are <span className="font-medium">sample</span> statistics
        (ddof&nbsp;=&nbsp;{data.ddof}) because these complaints are a sample of an ongoing
        civic process, not a closed population.
      </p>
    </div>
  )
}
