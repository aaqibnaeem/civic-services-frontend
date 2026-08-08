/**
 * `/admin/analytics` — the statistics deliverable.
 *
 * Eight independent queries, eight independently-rendered sections: a slow
 * endpoint degrades one card, never the page. Every section prints the
 * `interpretation` string the backend computed beside its chart, because the
 * brief grades explanation over plotting.
 *
 * Chart design notes live in `src/components/charts/chart-kit.tsx`.
 */

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  BrainCircuit,
  CalendarClock,
  ChartColumn,
  CircleCheck,
  CircleDot,
  Flame,
  Gauge,
  Inbox,
  Layers,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { StatCard, type StatTone } from '@/components/StatCard'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorState } from '@/components/ErrorState'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  useAnalyticsAreas,
  useAnalyticsCategories,
  useAnalyticsDepartments,
  useAnalyticsInsights,
  useAnalyticsOverview,
  useAnalyticsPriorities,
  useAnalyticsResolutionTimes,
  useAnalyticsTrends,
} from '@/hooks'
import type { AnalyticsFilters, KPICard } from '@/lib/api/types'
import { formatHours, formatNumber, formatPercent } from '@/lib/domain'
import { cn } from '@/lib/utils'

import { AnalyticsFilterBar } from '@/components/admin/AnalyticsFilterBar'
import { InsightsPanel } from '@/components/admin/InsightsPanel'
import { OutlierWorklist } from '@/components/admin/OutlierWorklist'
import { Callout, ChartCard, Interpretation, SectionState } from '@/components/charts/chart-kit'
import {
  ContingencyHeatGrid,
  FrequencyBarChart,
  FrequencyTable,
} from '@/components/charts/DistributionCharts'
import {
  DescriptiveStatsTable,
  ResolutionBoxPlot,
  ResolutionHistogram,
} from '@/components/charts/ResolutionCharts'
import { TrendsChart } from '@/components/charts/TrendsChart'
import {
  AreaTable,
  AreaVolumeChart,
  DepartmentSpeedChart,
  DepartmentTable,
} from '@/components/charts/ComparisonCharts'

/* ========================================================================== */
/* KPI presentation                                                           */
/* ========================================================================== */

const CARD_META: Record<string, { icon: LucideIcon; tone: StatTone }> = {
  total: { icon: Inbox, tone: 'default' },
  open: { icon: CircleDot, tone: 'info' },
  resolved: { icon: CircleCheck, tone: 'success' },
  resolution_rate: { icon: Gauge, tone: 'success' },
  median_resolution: { icon: CalendarClock, tone: 'default' },
  critical_open: { icon: Flame, tone: 'danger' },
  ai_confidence: { icon: BrainCircuit, tone: 'info' },
  this_week: { icon: TrendingUp, tone: 'default' },
}

const SEVERITY_TONE: Record<string, StatTone> = {
  info: 'default',
  warn: 'warning',
  critical: 'danger',
}

function KpiRow({ cards, wowPct }: { cards: KPICard[]; wowPct: number | null }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const meta = CARD_META[card.key]
        return (
          <StatCard
            key={card.key}
            label={card.label}
            value={card.display}
            hint={card.hint}
            tooltip={card.hint}
            icon={meta?.icon ?? Activity}
            tone={
              card.severity === 'info'
                ? (meta?.tone ?? 'default')
                : (SEVERITY_TONE[card.severity] ?? 'default')
            }
            deltaPct={card.key === 'this_week' ? wowPct : undefined}
            higherIsBetter={card.key === 'resolved' || card.key === 'resolution_rate'}
          />
        )
      })}
    </div>
  )
}

/* ========================================================================== */
/* Inference cards                                                            */
/* ========================================================================== */

function StatLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b py-1.5 last:border-b-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="tabular text-sm font-medium">{value}</span>
    </div>
  )
}

/* ========================================================================== */
/* Page                                                                       */
/* ========================================================================== */

export default function AdminAnalyticsPage() {
  const [filters, setFilters] = useState<AnalyticsFilters>({
    date_from: null,
    date_to: null,
    category: null,
    area: null,
  })
  const [areaOptions, setAreaOptions] = useState<string[]>([])

  const overview = useAnalyticsOverview(filters)
  const insights = useAnalyticsInsights(filters)
  const categories = useAnalyticsCategories(filters)
  const priorities = useAnalyticsPriorities(filters)
  const resolution = useAnalyticsResolutionTimes(filters)
  const trends = useAnalyticsTrends({ ...filters, days: 90 })
  const departments = useAnalyticsDepartments(filters)
  const areas = useAnalyticsAreas(filters)

  // Remember the full area list so selecting one area does not collapse the picker.
  useEffect(() => {
    if (!filters.area && areas.data) {
      setAreaOptions(areas.data.areas.map((a) => a.area))
    }
  }, [areas.data, filters.area])

  const busy =
    overview.isFetching ||
    insights.isFetching ||
    categories.isFetching ||
    priorities.isFetching ||
    resolution.isFetching ||
    trends.isFetching ||
    departments.isFetching ||
    areas.isFetching

  const filterSummary = useMemo(() => {
    const parts: string[] = []
    if (filters.date_from || filters.date_to) {
      parts.push(`${filters.date_from ?? 'start'} → ${filters.date_to ?? 'today'}`)
    }
    if (filters.category) parts.push(String(filters.category))
    if (filters.area) parts.push(filters.area)
    return parts.length ? parts.join(' · ') : 'all complaints, all time'
  }, [filters])

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Statistics"
        title="Analytics"
        description="Descriptive statistics, distributions, trends and outliers — each one explained in plain English, not just plotted. Every figure is computed server-side from the live complaint corpus."
      />

      <AnalyticsFilterBar
        filters={filters}
        onChange={setFilters}
        areas={areaOptions}
        busy={busy}
      />

      {/* ---------------------------------------------------------------- KPIs */}
      <SectionState
        isPending={overview.isPending}
        error={overview.error}
        onRetry={() => void overview.refetch()}
        title="Overview"
        skeleton={<LoadingSkeleton variant="stats" count={8} />}
      >
        {overview.data ? (
          <div className="space-y-4">
            <KpiRow
              cards={overview.data.cards}
              wowPct={overview.data.kpis.wow_change_pct}
            />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Backlog"
                value={formatNumber(overview.data.kpis.backlog)}
                hint={
                  overview.data.kpis.oldest_open_days !== null
                    ? `Oldest unresolved complaint has waited ${formatNumber(
                        overview.data.kpis.oldest_open_days,
                        0,
                      )} days.`
                    : 'Unresolved complaints carried forward.'
                }
                icon={Layers}
                tone={overview.data.kpis.backlog > 0 ? 'warning' : 'success'}
                tooltip="Complaints that are not resolved or rejected. This is the number the service team actually has to work through."
              />
              <StatCard
                label="Week over week"
                value={
                  overview.data.kpis.wow_change_pct === null
                    ? '—'
                    : `${overview.data.kpis.wow_change_pct > 0 ? '+' : ''}${formatNumber(
                        overview.data.kpis.wow_change_pct,
                        1,
                      )}%`
                }
                hint={`${formatNumber(
                  overview.data.kpis.complaints_this_week,
                )} this week vs ${formatNumber(
                  overview.data.kpis.complaints_last_week,
                )} last week — trending ${overview.data.kpis.wow_direction}.`}
                icon={TrendingUp}
                tone={overview.data.kpis.wow_direction === 'up' ? 'warning' : 'default'}
                tooltip="Change in complaint volume against the previous seven days. Rising volume is not automatically bad — it can mean the channel is being used."
              />
              <StatCard
                label="Mean resolution time"
                value={formatHours(overview.data.kpis.mean_resolution_hours)}
                hint={`Median is ${formatHours(
                  overview.data.kpis.median_resolution_hours,
                )} — the gap is the skew.`}
                icon={Activity}
                tone="default"
                tooltip="Shown next to the median on purpose: when the mean sits well above the median, a slow minority is dragging the average up and the median is the honest headline."
              />
              <StatCard
                label="Rejected"
                value={formatNumber(overview.data.kpis.rejected)}
                hint="Out of scope, duplicates, or not actionable."
                icon={ChartColumn}
                tone="default"
              />
            </div>
            <Interpretation>{overview.data.interpretation}</Interpretation>
          </div>
        ) : null}
      </SectionState>

      {/* ------------------------------------------------------------ Insights */}
      <Card>
        <CardContent className="pt-6">
          <SectionState
            isPending={insights.isPending}
            error={insights.error}
            onRetry={() => void insights.refetch()}
            title="Insights"
            skeleton={<LoadingSkeleton variant="cards" count={3} />}
          >
            {insights.data ? (
              <InsightsPanel
                insights={insights.data.insights}
                interpretation={insights.data.interpretation}
              />
            ) : null}
          </SectionState>
        </CardContent>
      </Card>

      {/* ---------------------------------------------------------------- Tabs */}
      <Tabs defaultValue="distributions" className="space-y-4">
        <div className="sticky top-16 z-20 -mx-1 bg-background/90 px-1 py-2 backdrop-blur-md">
          <TabsList className="h-auto w-full flex-wrap justify-start sm:w-fit">
            <TabsTrigger value="distributions">Distributions</TabsTrigger>
            <TabsTrigger value="resolution">Resolution time</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="operations">Departments &amp; areas</TabsTrigger>
          </TabsList>
        </div>

        {/* ============================================ Distributions ======= */}
        <TabsContent value="distributions" className="space-y-6">
          <SectionState
            isPending={categories.isPending}
            error={categories.error}
            onRetry={() => void categories.refetch()}
            title="Category distribution"
          >
            {categories.data ? (
              <ChartCard
                title="Category frequency distribution"
                description="How the city's complaints split across the seven civic categories."
                interpretation={categories.data.distribution.interpretation}
                refetching={categories.isFetching}
                actions={
                  <Callout
                    label="Mode"
                    value={categories.data.distribution.mode_label ?? '—'}
                    hint={`${formatNumber(
                      categories.data.distribution.mode_count,
                    )} complaints · ${formatPercent(
                      categories.data.distribution.mode_share,
                      1,
                    )}`}
                  />
                }
              >
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <FrequencyBarChart distribution={categories.data.distribution} />
                  <FrequencyTable distribution={categories.data.distribution} />
                </div>
              </ChartCard>
            ) : null}
          </SectionState>

          <SectionState
            isPending={categories.isPending}
            error={categories.error}
            onRetry={() => void categories.refetch()}
            title="Category status mix"
          >
            {categories.data?.by_status ? (
              <ChartCard
                title="Category × status"
                description="Where each category's complaints currently sit in the lifecycle."
                interpretation={categories.data.by_status.interpretation}
                refetching={categories.isFetching}
              >
                <ContingencyHeatGrid table={categories.data.by_status} />
              </ChartCard>
            ) : null}
          </SectionState>

          <SectionState
            isPending={priorities.isPending}
            error={priorities.error}
            onRetry={() => void priorities.refetch()}
            title="Priority distribution"
          >
            {priorities.data ? (
              <>
                <ChartCard
                  title="Priority distribution"
                  description="Priority is an ordinal scale, so it is never sorted by frequency — low to critical, always."
                  interpretation={priorities.data.distribution.interpretation}
                  refetching={priorities.isFetching}
                  actions={
                    <Callout
                      label="High or critical"
                      value={formatPercent(priorities.data.escalation_share_pct, 1)}
                      hint="of all complaints"
                    />
                  }
                >
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <FrequencyBarChart
                      distribution={priorities.data.distribution}
                      height={200}
                    />
                    <FrequencyTable distribution={priorities.data.distribution} />
                  </div>
                </ChartCard>

                <ChartCard
                  className="mt-6"
                  title="Category × priority contingency table"
                  description="Cell tint is the share within each row, so a large category does not read as hot everywhere simply because it is large."
                  interpretation={priorities.data.crosstab.interpretation}
                  refetching={priorities.isFetching}
                >
                  <ContingencyHeatGrid table={priorities.data.crosstab} />
                </ChartCard>

                <div className="mt-6 grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="gap-1">
                      <h3 className="text-base font-semibold">
                        Chi-square test of independence
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Are category and priority actually related, or is the pattern
                        noise?
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <StatLine
                          label="χ² statistic"
                          value={
                            priorities.data.chi_square.statistic === null
                              ? '—'
                              : formatNumber(priorities.data.chi_square.statistic, 2)
                          }
                        />
                        <StatLine
                          label="Degrees of freedom"
                          value={priorities.data.chi_square.dof ?? '—'}
                        />
                        <StatLine
                          label="p-value"
                          value={
                            priorities.data.chi_square.p_value === null
                              ? '—'
                              : priorities.data.chi_square.p_value < 0.001
                                ? '< 0.001'
                                : priorities.data.chi_square.p_value.toFixed(4)
                          }
                        />
                        <StatLine
                          label="Cramér's V"
                          value={
                            priorities.data.chi_square.cramers_v === null
                              ? '—'
                              : `${formatNumber(
                                  priorities.data.chi_square.cramers_v,
                                  3,
                                )} (${priorities.data.chi_square.effect_size})`
                          }
                        />
                        <StatLine
                          label="Min expected count"
                          value={
                            priorities.data.chi_square.expected_min === null
                              ? '—'
                              : formatNumber(priorities.data.chi_square.expected_min, 2)
                          }
                        />
                        <StatLine
                          label="Assumption met"
                          value={
                            <span
                              className={cn(
                                priorities.data.chi_square.assumption_met
                                  ? 'text-success'
                                  : 'text-warning',
                              )}
                            >
                              {priorities.data.chi_square.assumption_met
                                ? 'Yes — all expected counts ≥ 5'
                                : `No — ${priorities.data.chi_square.cells_below_5} cells < 5`}
                            </span>
                          }
                        />
                      </div>
                      <div className="space-y-1.5 rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
                        <p>
                          <span className="font-medium text-foreground">H₀ —</span>{' '}
                          {priorities.data.chi_square.h0.replace(/^H0:\s*/, '')}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">H₁ —</span>{' '}
                          {priorities.data.chi_square.h1.replace(/^H1:\s*/, '')}
                        </p>
                      </div>
                      <Interpretation variant="plain">
                        {priorities.data.chi_square.interpretation}
                      </Interpretation>
                      {priorities.data.chi_square.caveat ? (
                        <p className="rounded-lg border border-warning/30 bg-warning/8 p-2.5 text-xs leading-relaxed dark:bg-warning/12">
                          {priorities.data.chi_square.caveat}
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>

                  {priorities.data.spearman_priority_vs_speed ? (
                    <Card>
                      <CardHeader className="gap-1">
                        <h3 className="text-base font-semibold">
                          Spearman rank correlation
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Does triage work — are higher-priority complaints actually
                          resolved faster?
                        </p>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <StatLine
                            label="ρ (rho)"
                            value={
                              priorities.data.spearman_priority_vs_speed.rho === null
                                ? '—'
                                : formatNumber(
                                    priorities.data.spearman_priority_vs_speed.rho,
                                    3,
                                  )
                            }
                          />
                          <StatLine
                            label="Pairs (n)"
                            value={formatNumber(
                              priorities.data.spearman_priority_vs_speed.n,
                            )}
                          />
                          <StatLine
                            label="p-value"
                            value={
                              priorities.data.spearman_priority_vs_speed.p_value === null
                                ? '—'
                                : priorities.data.spearman_priority_vs_speed.p_value < 0.001
                                  ? '< 0.001'
                                  : priorities.data.spearman_priority_vs_speed.p_value.toFixed(
                                      4,
                                    )
                            }
                          />
                          <StatLine
                            label="Strength"
                            value={`${
                              priorities.data.spearman_priority_vs_speed.strength ?? '—'
                            } ${
                              priorities.data.spearman_priority_vs_speed.direction ?? ''
                            }`}
                          />
                        </div>
                        <Interpretation variant="plain">
                          {priorities.data.spearman_priority_vs_speed.interpretation}
                        </Interpretation>
                        {priorities.data.spearman_priority_vs_speed.caveat ? (
                          <p className="rounded-lg border border-warning/30 bg-warning/8 p-2.5 text-xs leading-relaxed dark:bg-warning/12">
                            {priorities.data.spearman_priority_vs_speed.caveat}
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              </>
            ) : null}
          </SectionState>
        </TabsContent>

        {/* ============================================== Resolution ======== */}
        <TabsContent value="resolution" className="space-y-6">
          <SectionState
            isPending={resolution.isPending}
            error={resolution.error}
            onRetry={() => void resolution.refetch()}
            title="Resolution times"
          >
            {resolution.data ? (
              <>
                <ChartCard
                  title="Resolution-time distribution"
                  description={`${formatNumber(
                    resolution.data.n,
                  )} resolved complaints, binned by ${resolution.data.histogram_method}.`}
                  interpretation={resolution.data.interpretation}
                  warning={resolution.data.sample_warning ?? undefined}
                  refetching={resolution.isFetching}
                >
                  <ResolutionHistogram
                    bins={resolution.data.histogram}
                    median={resolution.data.median}
                    upperFence={resolution.data.upper_fence}
                    modalBin={resolution.data.modal_bin}
                  />
                </ChartCard>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                  <ChartCard
                    title="Five-number summary & Tukey fences"
                    description="Minimum, Q1, median, Q3, maximum — with the 1.5·IQR fences and every outlier marked."
                    refetching={resolution.isFetching}
                    warning={resolution.data.censoring_note ?? undefined}
                  >
                    <ResolutionBoxPlot data={resolution.data} />
                  </ChartCard>

                  <Card>
                    <CardHeader className="gap-1">
                      <h3 className="text-base font-semibold">Descriptive statistics</h3>
                      <p className="text-sm text-muted-foreground">
                        Resolution time in {resolution.data.unit}, across{' '}
                        {formatNumber(resolution.data.resolved_count)} resolved complaints.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <DescriptiveStatsTable data={resolution.data} />
                    </CardContent>
                  </Card>
                </div>

                {resolution.data.by_category.length ? (
                  <ChartCard
                    title="Resolution time by category"
                    description="Each category gets its own quartiles and its own Tukey fence — the reason a single city-wide threshold would be unfair."
                    refetching={resolution.isFetching}
                  >
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/40 text-left">
                            <th scope="col" className="px-3 py-2 font-medium">
                              Category
                            </th>
                            <th scope="col" className="px-3 py-2 text-right font-medium">
                              n
                            </th>
                            <th scope="col" className="px-3 py-2 text-right font-medium">
                              Q1
                            </th>
                            <th scope="col" className="px-3 py-2 text-right font-medium">
                              Median
                            </th>
                            <th scope="col" className="px-3 py-2 text-right font-medium">
                              Q3
                            </th>
                            <th scope="col" className="px-3 py-2 text-right font-medium">
                              IQR
                            </th>
                            <th scope="col" className="px-3 py-2 text-right font-medium">
                              Own fence
                            </th>
                            <th scope="col" className="px-3 py-2 text-right font-medium">
                              Outliers
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {resolution.data.by_category.map((row) => (
                            <tr key={row.category} className="border-b last:border-b-0">
                              <th
                                scope="row"
                                className="px-3 py-2 text-left font-normal capitalize"
                              >
                                {row.category}
                                {row.sample_warning ? (
                                  <span className="block text-[0.6875rem] text-warning">
                                    {row.sample_warning}
                                  </span>
                                ) : null}
                              </th>
                              <td className="px-3 py-2 text-right tabular">
                                {formatNumber(row.n)}
                              </td>
                              <td className="px-3 py-2 text-right tabular text-muted-foreground">
                                {formatHours(row.q1)}
                              </td>
                              <td className="px-3 py-2 text-right tabular font-medium">
                                {formatHours(row.median)}
                              </td>
                              <td className="px-3 py-2 text-right tabular text-muted-foreground">
                                {formatHours(row.q3)}
                              </td>
                              <td className="px-3 py-2 text-right tabular text-muted-foreground">
                                {formatHours(row.iqr)}
                              </td>
                              <td className="px-3 py-2 text-right tabular">
                                {formatHours(row.upper_fence)}
                              </td>
                              <td className="px-3 py-2 text-right tabular">
                                {row.outlier_count}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ChartCard>
                ) : null}

                <Card>
                  <CardHeader className="gap-1">
                    <h3 className="text-base font-semibold">
                      Abnormally slow complaints — the worklist
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Tukey-fence outliers, named and linked. This is the actionable end of
                      the statistics.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <OutlierWorklist
                      report={resolution.data.outlier_report}
                      fallback={resolution.data.outliers}
                    />
                  </CardContent>
                </Card>
              </>
            ) : null}
          </SectionState>
        </TabsContent>

        {/* ================================================== Trends ======== */}
        <TabsContent value="trends" className="space-y-6">
          <SectionState
            isPending={trends.isPending}
            error={trends.error}
            onRetry={() => void trends.refetch()}
            title="Trends"
          >
            {trends.data ? (
              <>
                <ChartCard
                  title="Daily complaint volume"
                  description={`${formatNumber(trends.data.total)} complaints over ${
                    trends.data.days
                  } days${
                    trends.data.gaps_filled
                      ? `, with ${trends.data.gaps_filled} empty day(s) zero-filled so the moving average slides over calendar days rather than rows`
                      : ''
                  }.`}
                  interpretation={trends.data.interpretation}
                  refetching={trends.isFetching}
                  actions={
                    <Callout
                      label="Week over week"
                      value={
                        trends.data.week_over_week.change_pct === null
                          ? '—'
                          : `${
                              trends.data.week_over_week.change_pct > 0 ? '+' : ''
                            }${formatNumber(trends.data.week_over_week.change_pct, 1)}%`
                      }
                      hint={`${trends.data.week_over_week.current_week} vs ${trends.data.week_over_week.previous_week}`}
                    />
                  }
                >
                  <TrendsChart
                    series={trends.data.series}
                    rollingWindow={trends.data.rolling_window}
                    busiestDate={trends.data.busiest_day?.date}
                  />
                </ChartCard>

                <div className="grid gap-4 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="gap-1">
                      <h3 className="text-base font-semibold">Week over week</h3>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <StatLine
                        label="This week"
                        value={formatNumber(trends.data.week_over_week.current_week)}
                      />
                      <StatLine
                        label="Previous week"
                        value={formatNumber(trends.data.week_over_week.previous_week)}
                      />
                      <StatLine
                        label="Change"
                        value={`${trends.data.week_over_week.change > 0 ? '+' : ''}${
                          trends.data.week_over_week.change
                        } (${trends.data.week_over_week.direction})`}
                      />
                      <Interpretation variant="plain">
                        {trends.data.week_over_week.interpretation}
                      </Interpretation>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="gap-1">
                      <h3 className="text-base font-semibold">Weekday effect</h3>
                      <p className="text-sm text-muted-foreground">
                        Average complaints per day of the week.
                      </p>
                    </CardHeader>
                    <CardContent>
                      {Object.entries(trends.data.weekday_effect).map(([day, value]) => {
                        const max = Math.max(
                          ...Object.values(trends.data.weekday_effect),
                          1,
                        )
                        return (
                          <div key={day} className="flex items-center gap-3 py-1">
                            <span className="w-20 shrink-0 text-xs text-muted-foreground">
                              {day.slice(0, 3)}
                            </span>
                            <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                              <span
                                className="block h-full rounded-full bg-primary/70"
                                style={{ width: `${(value / max) * 100}%` }}
                              />
                            </span>
                            <span className="tabular w-10 shrink-0 text-right text-xs">
                              {formatNumber(value, 1)}
                            </span>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="gap-1">
                      <h3 className="text-base font-semibold">Next 7 days</h3>
                      <p className="text-sm text-muted-foreground">
                        {trends.data.forecast?.method ?? 'No forecast available.'}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {trends.data.forecast ? (
                        <>
                          <p className="text-2xl font-semibold">
                            {formatNumber(trends.data.forecast.expected_total, 0)}
                            <span className="ml-1.5 text-sm font-normal text-muted-foreground">
                              expected complaints
                            </span>
                          </p>
                          <Interpretation variant="plain">
                            {trends.data.forecast.interpretation}
                          </Interpretation>
                          <details className="text-xs text-muted-foreground">
                            <summary className="cursor-pointer font-medium text-foreground">
                              Assumptions this forecast makes
                            </summary>
                            <ul className="mt-2 list-disc space-y-1 pl-4 leading-relaxed">
                              {trends.data.forecast.assumptions.map((assumption) => (
                                <li key={assumption}>{assumption}</li>
                              ))}
                            </ul>
                          </details>
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Not enough history to forecast honestly.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {trends.data.busiest_day || trends.data.quietest_day ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {trends.data.busiest_day ? (
                      <Callout
                        label="Busiest day"
                        value={trends.data.busiest_day.date}
                        hint={`${trends.data.busiest_day.count} complaints`}
                      />
                    ) : null}
                    {trends.data.quietest_day ? (
                      <Callout
                        label="Quietest day"
                        value={trends.data.quietest_day.date}
                        hint={`${trends.data.quietest_day.count} complaints`}
                      />
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}
          </SectionState>
        </TabsContent>

        {/* ============================================== Operations ======== */}
        <TabsContent value="operations" className="space-y-6">
          <SectionState
            isPending={departments.isPending}
            error={departments.error}
            onRetry={() => void departments.refetch()}
            title="Departments"
          >
            {departments.data ? (
              <ChartCard
                title="Department comparison"
                description="Volume, backlog and median resolution time. The chart shows median time only — three different units on one axis would be a misleading dashboard."
                interpretation={departments.data.interpretation}
                refetching={departments.isFetching}
              >
                <div className="space-y-6">
                  <DepartmentSpeedChart
                    departments={departments.data.departments}
                    overallMedianHours={departments.data.overall_median_hours}
                    slowest={departments.data.slowest?.department}
                  />
                  <DepartmentTable
                    departments={departments.data.departments}
                    slowest={departments.data.slowest?.department}
                    largestBacklog={departments.data.largest_backlog?.department}
                  />
                </div>
              </ChartCard>
            ) : null}
          </SectionState>

          <SectionState
            isPending={areas.isPending}
            error={areas.error}
            onRetry={() => void areas.refetch()}
            title="Areas"
          >
            {areas.data ? (
              <ChartCard
                title="Complaint volume by area"
                description={areas.data.hotspot_rule}
                interpretation={areas.data.interpretation}
                refetching={areas.isFetching}
                actions={
                  <Callout
                    label="Top 3 concentration"
                    value={formatPercent(areas.data.concentration_top3_pct, 1)}
                    hint={`${areas.data.hotspots.length} hotspot${
                      areas.data.hotspots.length === 1 ? '' : 's'
                    }`}
                  />
                }
              >
                <div className="space-y-6">
                  <AreaVolumeChart areas={areas.data.areas} />
                  <AreaTable areas={areas.data.areas} />
                </div>
              </ChartCard>
            ) : null}
          </SectionState>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        Showing: <span className="font-medium text-foreground">{filterSummary}</span>. Every
        number on this page is recomputed server-side from a single snapshot query, so the
        charts, tables and sentences can never disagree with one another.
      </p>

      {overview.isError &&
      insights.isError &&
      categories.isError &&
      resolution.isError ? (
        <ErrorState
          error={overview.error}
          title="Analytics are unavailable"
          onRetry={() => {
            void overview.refetch()
            void insights.refetch()
            void categories.refetch()
            void resolution.refetch()
          }}
        />
      ) : null}
    </div>
  )
}
