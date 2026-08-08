/**
 * The actionable end of the outlier analysis: named complaints that took
 * abnormally long, each one a link into triage.
 *
 * Two scopes are offered because they answer different questions. The global
 * fence asks "is this slow for the city?"; the per-category fence asks "is this
 * slow for its own kind of work?" — a 3-day drainage repair and a 3-day pothole
 * repair are not comparable events, and on the real data the waste fence and the
 * drainage fence differ by more than 2×.
 */

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, TriangleAlert } from 'lucide-react'

import { CategoryBadge } from '@/components/CategoryBadge'
import { PriorityBadge } from '@/components/PriorityBadge'
import { ReferenceCode } from '@/components/ReferenceCode'
import { EmptyState } from '@/components/EmptyState'
import { CATEGORY_META, formatHours, formatNumber, formatPercent } from '@/lib/domain'
import type { Category, GroupOutlierReport, OutlierPoint, OutlierReport } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function OutlierTable({ outliers }: { outliers: OutlierPoint[] }) {
  if (outliers.length === 0) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="No abnormally slow complaints"
        description="Nothing in this slice crosses the Tukey fence — resolution times are behaving."
        size="sm"
      />
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <caption className="sr-only">Complaints beyond the Tukey upper fence</caption>
        <thead>
          <tr className="border-b bg-muted/40 text-left">
            <th scope="col" className="px-3 py-2 font-medium">
              Reference
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Category
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Priority
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              Area
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Took
            </th>
            <th scope="col" className="px-3 py-2 text-right font-medium">
              Past fence
            </th>
            <th scope="col" className="w-8 px-3 py-2">
              <span className="sr-only">Open</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {outliers.map((outlier) => (
            <tr key={outlier.reference_code} className="border-b last:border-b-0">
              <th scope="row" className="px-3 py-2 text-left font-normal">
                {outlier.id ? (
                  <Link
                    to={`/admin/complaints/${outlier.id}`}
                    className="rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <ReferenceCode code={outlier.reference_code} size="sm" />
                  </Link>
                ) : (
                  <ReferenceCode code={outlier.reference_code} size="sm" />
                )}
              </th>
              <td className="px-3 py-2">
                {outlier.category ? (
                  <CategoryBadge category={outlier.category} size="sm" short />
                ) : (
                  '—'
                )}
              </td>
              <td className="px-3 py-2">
                {outlier.priority ? (
                  <PriorityBadge priority={outlier.priority} size="sm" showIcon={false} />
                ) : (
                  '—'
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{outlier.area ?? '—'}</td>
              <td className="px-3 py-2 text-right tabular font-medium">
                {formatHours(outlier.value)}
              </td>
              <td className="px-3 py-2 text-right tabular text-destructive">
                +{formatHours(outlier.exceeds_fence_by)}
              </td>
              <td className="px-3 py-2 text-right">
                {outlier.id ? (
                  <Link
                    to={`/admin/complaints/${outlier.id}`}
                    aria-label={`Open ${outlier.reference_code}`}
                    className="inline-flex rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <ArrowUpRight className="size-4" aria-hidden />
                  </Link>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GroupSummary({ group }: { group: GroupOutlierReport }) {
  const meta = CATEGORY_META[group.group as Category]
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span
            aria-hidden
            className="size-2.5 rounded-[2px]"
            style={{ backgroundColor: meta?.color ?? 'var(--muted-foreground)' }}
          />
          {meta?.label ?? group.group}
        </span>
        <span className="tabular text-xs text-muted-foreground">
          n = {formatNumber(group.n)} · {group.outlier_count} outlier
          {group.outlier_count === 1 ? '' : 's'} ({formatPercent(group.outlier_rate, 1)})
        </span>
      </div>
      <p className="tabular text-xs text-muted-foreground">
        Median {formatHours(group.median)} · IQR {formatHours(group.iqr)} · own fence{' '}
        <span className="font-medium text-foreground">{formatHours(group.upper_fence)}</span>
      </p>
      {group.sample_warning ? (
        <p className="text-xs text-warning">{group.sample_warning}</p>
      ) : null}
    </div>
  )
}

export interface OutlierWorklistProps {
  report: OutlierReport | null
  /** The top-level `outliers` array, used when no full report is present. */
  fallback: OutlierPoint[]
  className?: string
}

export function OutlierWorklist({ report, fallback, className }: OutlierWorklistProps) {
  const [tab, setTab] = useState('global')
  const globalOutliers = report?.outliers?.length ? report.outliers : fallback
  const groups = (report?.by_group ?? []).filter((g) => g.outlier_count > 0)

  return (
    <div className={cn('space-y-4', className)}>
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="global">
            City-wide fence
            {globalOutliers.length ? (
              <span className="ml-1.5 tabular text-xs opacity-70">
                {globalOutliers.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="per-category">
            Per-category fences
            {groups.length ? (
              <span className="ml-1.5 tabular text-xs opacity-70">{groups.length}</span>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="space-y-3">
          {report ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {report.interpretation}
            </p>
          ) : null}
          <OutlierTable outliers={globalOutliers} />
        </TabsContent>

        <TabsContent value="per-category" className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Fences recomputed inside each category. A complaint listed here is slow{' '}
            <em>for its own kind of work</em>, which is a fairer accusation than measuring
            everything against one city-wide threshold.
          </p>
          {groups.length === 0 ? (
            <EmptyState
              icon={TriangleAlert}
              title="No category-level outliers"
              description="Every category is behaving within its own normal range."
              size="sm"
            />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groups.map((group) => (
                  <GroupSummary key={group.group} group={group} />
                ))}
              </div>
              <OutlierTable outliers={groups.flatMap((group) => group.outliers)} />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
