/**
 * `/my-reports` — everything submitted from THIS browser.
 *
 * Anonymous reporting means there is no account to log into, so this list is
 * the citizen's account: reference codes kept in localStorage by `trackedStore`.
 * Each card re-fetches its live status by code, so the list is never stale.
 */

import { Link } from 'react-router-dom'
import { ListChecks, MonitorSmartphone, Plus, Search } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { PageShell, TrackedReportCard, useTrackedRefs } from '@/components/citizen'
import { Button } from '@/components/ui/button'
import { useTrackedStore } from '@/stores/trackedStore'

export default function MyReportsPage() {
  const tracked = useTrackedRefs()
  const remove = useTrackedStore((s) => s.remove)
  const add = useTrackedStore((s) => s.add)

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

  return (
    <PageShell width="default" className="space-y-8">
      <PageHeader
        eyebrow="This device"
        title="My reports"
        description="Every report filed or opened from this browser. The codes are stored on your device, not in an account — which is what makes anonymous reporting possible."
        meta={
          tracked.length > 0 ? (
            <span className="tabular rounded-full border bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground">
              {tracked.length} saved
            </span>
          ) : null
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

      {tracked.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nothing saved on this device yet"
          description="You do not need an account to use this service — instead, every report you file gets a reference code like CIV-8F3K2M, and this page remembers the ones from this browser so you can check them with one tap."
          action={
            <>
              <Button asChild size="sm">
                <Link to="/report">Report an issue</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/track">I already have a code</Link>
              </Button>
            </>
          }
          footer="Clearing your browsing data clears this list — keep a copy of your codes."
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
              clearing site data removes it. Your reference codes always work from anywhere, so keep
              them somewhere safe.
            </span>
          </p>
        </>
      )}
    </PageShell>
  )
}
