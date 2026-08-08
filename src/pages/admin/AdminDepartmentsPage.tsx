/**
 * `/admin/departments` — the department directory.
 *
 * Each card links straight into a pre-filtered inbox (`/admin?department_id=…`),
 * which works because inbox filter state lives in the URL.
 */

import { Link } from 'react-router-dom'
import { ArrowUpRight, Building2, Inbox, Mail } from 'lucide-react'

import { CategoryBadge } from '@/components/CategoryBadge'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import { useAnalyticsDepartments, useDepartments } from '@/hooks'
import { CATEGORY_META, formatHours, formatNumber, formatPercent } from '@/lib/domain'
import type { Category, DepartmentStat } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Interpretation } from '@/components/charts/chart-kit'

const isCategory = (value: string): value is Category => value in CATEGORY_META

export default function AdminDepartmentsPage() {
  const departments = useDepartments()
  const stats = useAnalyticsDepartments()

  const statByName = new Map<string, DepartmentStat>()
  for (const stat of stats.data?.departments ?? []) {
    statByName.set(stat.department, stat)
  }

  const slowest = stats.data?.slowest?.department
  const largestBacklog = stats.data?.largest_backlog?.department

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Directory"
        title="Departments"
        description="Who owns which categories, how to reach them, and how much work each one is currently carrying."
      />

      {departments.isError ? (
        <ErrorState error={departments.error} onRetry={() => void departments.refetch()} />
      ) : departments.isPending ? (
        <LoadingSkeleton variant="cards" count={6} />
      ) : (departments.data?.length ?? 0) === 0 ? (
        <EmptyState
          icon={Building2}
          title="No departments configured"
          description="Departments are seeded with the database. Once they exist, complaints can be routed to them."
          size="lg"
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {departments.data?.map((department) => {
              const stat = statByName.get(department.name)
              const isSlowest = department.name === slowest
              const isBacklogged = department.name === largestBacklog

              return (
                <Card key={department.id} className="flex flex-col">
                  <CardHeader className="gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-base leading-snug font-semibold text-balance">
                        {department.name}
                      </h2>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/60 text-muted-foreground">
                        <Building2 className="size-4.5" aria-hidden />
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {department.categories.map((category) =>
                        isCategory(category) ? (
                          <CategoryBadge
                            key={category}
                            category={category}
                            size="sm"
                            short
                            withTooltip
                          />
                        ) : (
                          <span
                            key={category}
                            className="rounded-full border bg-muted/60 px-2 py-0.5 text-xs"
                          >
                            {category}
                          </span>
                        ),
                      )}
                    </div>

                    {(isSlowest || isBacklogged) && (
                      <div className="flex flex-wrap gap-1.5">
                        {isSlowest ? (
                          <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[0.6875rem] font-medium text-destructive">
                            Slowest to resolve
                          </span>
                        ) : null}
                        {isBacklogged ? (
                          <span className="rounded-full border border-warning/40 bg-warning/12 px-2 py-0.5 text-[0.6875rem] font-medium text-warning">
                            Biggest backlog
                          </span>
                        ) : null}
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col gap-4">
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                      <div>
                        <dt className="text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
                          Open now
                        </dt>
                        <dd className="tabular text-lg font-semibold">
                          {formatNumber(department.open_complaints)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
                          Total handled
                        </dt>
                        <dd className="tabular text-lg font-semibold">
                          {stat ? formatNumber(stat.n) : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
                          Median time
                        </dt>
                        <dd
                          className={cn(
                            'tabular text-sm font-medium',
                            isSlowest && 'text-destructive',
                          )}
                        >
                          {stat ? formatHours(stat.median_resolution_hours) : '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[0.6875rem] tracking-wide text-muted-foreground uppercase">
                          Resolved
                        </dt>
                        <dd className="tabular text-sm font-medium">
                          {stat ? formatPercent(stat.resolution_rate, 0) : '—'}
                        </dd>
                      </div>
                    </dl>

                    {department.contact_email ? (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Mail className="size-3.5 shrink-0" aria-hidden />
                        <a
                          href={`mailto:${department.contact_email}`}
                          className="truncate underline underline-offset-2 hover:text-foreground"
                        >
                          {department.contact_email}
                        </a>
                      </p>
                    ) : null}

                    <div className="mt-auto flex flex-wrap gap-2 pt-1">
                      <Button variant="outline" size="sm" asChild>
                        <Link to={`/admin?department_id=${department.id}`}>
                          <Inbox className="size-4" aria-hidden />
                          All complaints
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          to={`/admin?department_id=${department.id}&status=open&status=assigned&status=in_progress`}
                        >
                          Open queue
                          <ArrowUpRight className="size-4" aria-hidden />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {stats.data ? (
            <Interpretation>{stats.data.interpretation}</Interpretation>
          ) : null}
        </>
      )}
    </div>
  )
}
