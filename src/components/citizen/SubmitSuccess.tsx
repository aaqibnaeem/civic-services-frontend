import { Link } from 'react-router-dom'
import { CircleCheck, FileText, ListChecks, MapPin, Search } from 'lucide-react'

import { ReferenceCode } from '@/components/ReferenceCode'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Complaint } from '@/lib/api/types'

import { absoluteTime } from './utils'

export interface SubmitSuccessProps {
  complaint: Complaint
  /** Clears the flow and starts a fresh report. */
  onReportAnother: () => void
}

/** The confirmation screen. The reference code is the whole point of it. */
export function SubmitSuccess({ complaint, onReportAnother }: SubmitSuccessProps) {
  return (
    <div className="animate-in fade-in-0 slide-in-from-bottom-3 space-y-6 duration-500">
      <Card className="border-success/30">
        <CardContent className="space-y-7 p-6 text-center sm:p-10">
          <div className="flex flex-col items-center gap-4">
            <span className="flex size-14 items-center justify-center rounded-2xl border border-success/30 bg-success/12 text-success">
              <CircleCheck className="size-7" aria-hidden strokeWidth={2} />
            </span>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Report submitted</h2>
              <p className="mx-auto max-w-md text-sm leading-relaxed text-balance text-muted-foreground">
                It is already in the queue. The AI is finishing its reading in the background —
                you do not have to wait here for it.
              </p>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm space-y-3 rounded-xl border bg-muted/40 p-5">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Your reference code
            </p>
            <ReferenceCode
              code={complaint.reference_code}
              copyable
              size="lg"
              className="mx-auto text-lg"
            />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Keep this code. It is how you check on the report from any device — there is no
              account and no password.
            </p>
          </div>

          <dl className="mx-auto grid w-full max-w-md gap-3 text-left sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5" aria-hidden />
                Location
              </dt>
              <dd className="mt-1 text-sm wrap-break-word">{complaint.location_text}</dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="size-3.5" aria-hidden />
                Submitted
              </dt>
              <dd className="mt-1 text-sm">{absoluteTime(complaint.created_at)}</dd>
            </div>
          </dl>

          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Button asChild size="lg" className="h-10 w-full px-5 sm:w-auto">
              <Link to={`/track/${complaint.reference_code}`}>
                <Search className="size-4" aria-hidden />
                Track this report
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-10 w-full px-5 sm:w-auto">
              <Link to="/my-reports">
                <ListChecks className="size-4" aria-hidden />
                My reports
              </Link>
            </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={onReportAnother}>
            Report another issue
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
