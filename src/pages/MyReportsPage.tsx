/**
 * `/my-reports` — the citizen's reports, from both places they can live.
 *
 * Signed in as a `citizen`: the real list from `GET /complaints/mine` (CONTRACT
 * §4b), which follows them to any device.
 *
 * Signed out: the reference codes this browser has kept in `trackedStore`. That
 * path is not a legacy fallback — it is the only thing that works before someone
 * signs in for the first time, and it must never lose an entry. Both lists are
 * shown together when signed in, because a code filed under a different email
 * still belongs to whoever is holding this phone.
 */

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ListChecks,
  LogIn,
  MonitorSmartphone,
  Plus,
  Search,
  Smartphone,
  TriangleAlert,
} from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PageHeader } from '@/components/PageHeader'
import {
  ComplaintSummaryCard,
  PageShell,
  TrackedReportCard,
  useTrackedRefs,
} from '@/components/citizen'
import { Button } from '@/components/ui/button'
import { useMyComplaints } from '@/hooks'
import { formatNumber } from '@/lib/domain'
import { useAuthStore } from '@/stores/authStore'
import { useTrackedStore, type TrackedRef } from '@/stores/trackedStore'

const PAGE_SIZE = 12

function SignInPrompt({ dense = false }: { dense?: boolean }) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-info/30 bg-info/8 p-4 dark:bg-info/12 ${
        dense ? '' : 'sm:p-5'
      }`}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium">Have an account? Sign in to see everything.</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          You never signed up for one — we created it from the email on your first report. Signing
          in gathers every report you have filed, on any device.
        </p>
      </div>
      <Button asChild size="sm" className="shrink-0">
        <Link to="/signin">
          <LogIn className="size-4" aria-hidden />
          Sign in
        </Link>
      </Button>
    </div>
  )
}

export default function MyReportsPage() {
  const tracked = useTrackedRefs()
  const remove = useTrackedStore((s) => s.remove)
  const add = useTrackedStore((s) => s.add)

  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  const signedIn = Boolean(token && user)
  const isCitizen = signedIn && user?.role === 'citizen'

  const [page, setPage] = useState(1)
  // Only citizens have an account list; a staff session would just get an empty
  // one, so it is not worth the request or the error surface.
  const mine = useMyComplaints({ page, page_size: PAGE_SIZE }, isCitizen)

  // Memoised off `mine.data` rather than a fresh `?? []` each render, or every
  // downstream memo would recompute on every render and defeat itself.
  const accountItems = useMemo(() => mine.data?.items ?? [], [mine.data])
  const accountCodes = useMemo(
    () => new Set(accountItems.map((complaint) => complaint.reference_code)),
    [accountItems],
  )
  /** Codes on this device that the account list does not already cover. */
  const deviceOnly: TrackedRef[] = useMemo(
    () => tracked.filter((entry) => !accountCodes.has(entry.reference_code)),
    [tracked, accountCodes],
  )

  const handleRemove = (referenceCode: string) => {
    const entry = tracked.find((item) => item.reference_code === referenceCode)
    remove(referenceCode)
    toast.success('Removed from this device', {
      description: `${referenceCode} is no longer listed here. The report itself is untouched.`,
      action: entry
        ? {
            label: 'Undo',
            onClick: () => add(entry),
          }
        : undefined,
    })
  }

  /* ---------------------------------------------------------------- header */

  const total = mine.data?.total ?? 0
  const pages = mine.data?.pages ?? 1
  // A 404 means this deployment's API predates citizen accounts; anything else
  // is a real failure. Either way the device list below still works.
  const accountUnavailable = isCitizen && mine.isError && mine.error?.isNotFound

  const header = (
    <PageHeader
      eyebrow={isCitizen ? 'Your account' : 'This device'}
      title="My reports"
      description={
        isCitizen
          ? `Every report filed with ${user?.email}. You never created this account — it was made for you when you filed your first report, so the list follows you to any device.`
          : signedIn
            ? 'Every report filed or opened from this browser. Your staff account has its own queue in the console — this page is the citizen-side view.'
            : 'Every report filed or opened from this browser. Sign in to see all of your reports on any device — the account was created for you when you first reported something.'
      }
      meta={
        <div className="flex flex-wrap items-center gap-1.5">
          {isCitizen && mine.data ? (
            <span className="tabular rounded-full border bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
              {formatNumber(total)} in your account
            </span>
          ) : null}
          {tracked.length > 0 ? (
            <span className="tabular rounded-full border bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
              {tracked.length} saved on this device
            </span>
          ) : null}
        </div>
      }
      actions={
        <>
          <Button asChild size="sm">
            <Link to="/report">
              <Plus className="size-4" aria-hidden />
              New report
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/track">
              <Search className="size-4" aria-hidden />
              Add by code
            </Link>
          </Button>
        </>
      }
    />
  )

  /* ------------------------------------------------- signed-in citizen view */

  if (isCitizen) {
    return (
      <PageShell width="default" className="space-y-8">
        {header}

        {mine.isPending ? (
          <LoadingSkeleton variant="cards" count={4} />
        ) : accountUnavailable ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-warning/35 bg-warning/10 p-4 dark:bg-warning/14">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            <p className="text-sm leading-relaxed">
              Your account list is not available on this deployment yet. Nothing is lost — the
              reports saved on this device are below, and every reference code still works.
            </p>
          </div>
        ) : mine.isError ? (
          <ErrorState
            error={mine.error}
            title="Could not load your reports"
            description="Your reports are safe. This is only the list that failed to load."
            onRetry={() => void mine.refetch()}
          />
        ) : accountItems.length === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="Nothing filed under this account yet"
            description="Reports you file while signed in — or with this email address — collect here automatically."
            action={
              <Button asChild size="sm">
                <Link to="/report">Report an issue</Link>
              </Button>
            }
            size="lg"
          />
        ) : (
          <>
            <ul className="grid gap-4 lg:grid-cols-2">
              {accountItems.map((complaint) => (
                <li key={complaint.id}>
                  <ComplaintSummaryCard complaint={complaint} />
                </li>
              ))}
            </ul>

            {pages > 1 ? (
              <nav
                className="flex flex-wrap items-center justify-between gap-3"
                aria-label="Pagination"
              >
                <p className="tabular text-sm text-muted-foreground">
                  Page {formatNumber(page)} of {formatNumber(pages)}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || mine.isFetching}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= pages || mine.isFetching}
                    onClick={() => setPage((value) => Math.min(pages, value + 1))}
                  >
                    Next
                  </Button>
                </div>
              </nav>
            ) : null}
          </>
        )}

        {deviceOnly.length > 0 ? (
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-t pt-6">
              <Smartphone className="size-4 text-muted-foreground" aria-hidden />
              <h2 className="text-sm font-semibold">Also saved on this device</h2>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              These reference codes were kept by this browser but are not in your account — usually
              because they were filed with a different email address, or before accounts existed.
              They still work exactly as before.
            </p>
            <ul className="grid gap-4 lg:grid-cols-2">
              {deviceOnly.map((entry) => (
                <li key={entry.reference_code}>
                  <TrackedReportCard entry={entry} onRemove={handleRemove} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </PageShell>
    )
  }

  /* ------------------------------------------------ signed-out / staff view */

  return (
    <PageShell width="default" className="space-y-8">
      {header}

      {signedIn ? null : <SignInPrompt />}

      {tracked.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nothing saved on this device yet"
          description="You never fill in a signup form here: file a report and we create your account from your email, and hand you a reference code like CIV-8F3K2M. This page remembers the codes from this browser so you can check them with one tap — and signing in shows every report from every device."
          action={
            <>
              <Button asChild size="sm">
                <Link to="/report">Report an issue</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/track">I already have a code</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/signin">Sign in</Link>
              </Button>
            </>
          }
          footer="Clearing your browsing data clears this list — signing in is what makes it permanent."
          size="lg"
        />
      ) : (
        <>
          <ul className="grid gap-4 lg:grid-cols-2">
            {tracked.map((entry) => (
              <li key={entry.reference_code}>
                <TrackedReportCard entry={entry} onRemove={handleRemove} />
              </li>
            ))}
          </ul>

          <p className="flex items-start gap-2 rounded-xl border border-dashed p-4 text-xs leading-relaxed text-muted-foreground">
            <MonitorSmartphone className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              This list lives in this browser only — it will not appear on your other devices, and
              clearing site data removes it. Your reference codes always work from anywhere, and
              signing in gives you the same list on every device.
            </span>
          </p>
        </>
      )}
    </PageShell>
  )
}
