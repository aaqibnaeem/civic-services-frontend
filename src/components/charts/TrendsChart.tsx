/**
 * Daily complaint volume with the 7-day moving average overlaid.
 *
 * Both series are counts-per-day, so they share ONE y-axis — a second scale
 * would invent a relationship the data does not contain. The raw count is a
 * 10%-opacity wash (context); the moving average is the 2px line the reader is
 * meant to follow. The backend returns `rolling_mean_7 === null` for the first
 * six points by design, so the line legitimately starts on day 7.
 */

import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { ChartContainer } from '@/components/ui/chart'
import { CHART_COLORS, formatNumber } from '@/lib/domain'
import type { TrendPoint } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { AXIS_PROPS, ChartTip, GRID_PROPS, LegendKey } from './chart-kit'

const RAW_COLOR = CHART_COLORS[7]
const MA_COLOR = CHART_COLORS[0]

export interface TrendsChartProps {
  series: TrendPoint[]
  rollingWindow: number
  /** Highlighted with a labelled marker if present in the series. */
  busiestDate?: string | null
  height?: number
  className?: string
}

function safeFormat(date: string, pattern: string): string {
  try {
    return format(parseISO(date), pattern)
  } catch {
    return date
  }
}

export function TrendsChart({
  series,
  rollingWindow,
  busiestDate,
  height = 300,
  className,
}: TrendsChartProps) {
  const data = useMemo(
    () =>
      series.map((point) => ({
        ...point,
        tick: safeFormat(point.date, 'd MMM'),
      })),
    [series],
  )

  const busiestTick = busiestDate
    ? data.find((point) => point.date === busiestDate)?.tick
    : undefined

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-4">
        <LegendKey color={RAW_COLOR} label="Complaints filed that day" shape="rect" />
        <LegendKey
          color={MA_COLOR}
          label={`${rollingWindow}-day moving average`}
          shape="line"
        />
      </div>

      <ChartContainer
        config={{
          count: { label: 'Complaints filed' },
          rolling_mean_7: { label: `${rollingWindow}-day moving average` },
        }}
        className="aspect-auto w-full"
        style={{ height }}
      >
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid {...GRID_PROPS} vertical={false} />
          <XAxis
            {...AXIS_PROPS}
            dataKey="tick"
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis {...AXIS_PROPS} width={32} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
            content={
              <ChartTip
                heading={(payload) => {
                  const point = payload[0]?.payload as unknown as TrendPoint | undefined
                  return point ? safeFormat(point.date, 'EEEE d MMM yyyy') : ''
                }}
                format={(value, item) =>
                  item.dataKey === 'rolling_mean_7'
                    ? formatNumber(value, 1)
                    : formatNumber(value)
                }
              />
            }
          />

          {busiestTick ? (
            <ReferenceLine
              x={busiestTick}
              stroke="var(--warning)"
              strokeWidth={1}
              label={{
                value: 'busiest day',
                position: 'insideTopRight',
                fill: 'var(--warning)',
                fontSize: 10,
              }}
            />
          ) : null}

          <Area
            type="monotone"
            dataKey="count"
            name="Complaints filed"
            stroke={RAW_COLOR}
            strokeWidth={1}
            strokeOpacity={0.5}
            fill={RAW_COLOR}
            fillOpacity={0.1}
            isAnimationActive={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
          />
          <Line
            type="monotone"
            dataKey="rolling_mean_7"
            name={`${rollingWindow}-day moving average`}
            stroke={MA_COLOR}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--card)' }}
          />
        </ComposedChart>
      </ChartContainer>

      <p className="text-xs leading-relaxed text-muted-foreground">
        The moving average deliberately starts on day&nbsp;{rollingWindow} — a
        &ldquo;{rollingWindow}-day average&rdquo; computed over fewer than {rollingWindow}{' '}
        days would be a false label, so the backend returns null and the line simply does
        not begin.
      </p>
    </div>
  )
}
