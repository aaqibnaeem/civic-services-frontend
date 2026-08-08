import { Link } from 'react-router-dom'
import {
  Check,
  CircleCheck,
  Copy,
  FileText,
  KeyRound,
  ListChecks,
  LogIn,
  Mail,
  MapPin,
  Search,
  UserCheck,
} from 'lucide-react'

import { ReferenceCode } from '@/components/ReferenceCode'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import type { AccountInfo, ComplaintCreateResponse } from '@/lib/api/types'

import { absoluteTime } from './utils'

export interface SubmitSuccessProps {
  complaint: ComplaintCreateResponse
  /** Clears the flow and starts a fresh report. */
  onReportAnother: () => void
}

/**
 * The credentials panel — CONTRACT §4b.
 *
 * Deliberately a separate card below the confirmation: the reference code is
 * still the thing that works everywhere without signing in, and burying it under
 * a password would be a downgrade. The password is shown exactly once, so it is
 * copyable and stated plainly rather than hidden behind a reveal.
 */
function AccountPanel({ account }: { account: AccountInfo }) {
  const { copied, copy } = useCopyToClipboard()
  const password = account.default_password

  // `is_new === false` means the API matched an existing account and, per the
  // contract, returned `default_password: null`. Never invent one.
  if (!account.is_new || !password) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/60 text-muted-foreground">
              <UserCheck className="size-4.5" aria-hidden />
            </span>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold">Added to your account</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                This report was filed under the account for{' '}
                <span className="font-medium break-all text-foreground">{account.email}</span>.
                {account.is_new
                  ? ' Sign in to see all your reports together.'
                  : ' Sign in with your existing password to see all your reports together.'}
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to="/signin">
              <LogIn className="size-4" aria-hidden />
              Sign in
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-primary/30 bg-primary/4 dark:bg-primary/8">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
            <KeyRound className="size-4.5" aria-hidden />
          </span>
          <div className="space-y-1">
            <h3 className="text-base font-semibold">Your account is ready</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              You did not have to sign up — we created an account from the email you gave. These
              are your sign-in details, shown once.
            </p>
          </div>
        </div>

        <dl className="space-y-3">
          <div className="rounded-lg border bg-card p-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="size-3.5" aria-hidden />
              Email
            </dt>
            <dd className="mt-1 text-sm font-medium break-all">{account.email}</dd>
          </div>

          <div className="rounded-lg border bg-card p-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <KeyRound className="size-3.5" aria-hidden />
              Password
            </dt>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              <code className="rounded-md border bg-muted/60 px-2.5 py-1 font-mono text-sm tracking-wide select-all">
                {password}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void copy(password, 'Password copied')}
                aria-label="Copy password"
              >
                {copied ? (
                  <Check className="size-3.5 text-success" aria-hidden />
                ) : (
                  <Copy className="size-3.5" aria-hidden />
                )}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </dd>
          </div>
        </dl>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Sign in to see all of your reports in one place — on this device or any other. Please
          change this password once you are in.
        </p>

        <Button asChild size="sm">
          <Link to="/signin">
            <LogIn className="size-4" aria-hidden />
            Sign in now
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

/** The confirmation screen. The reference code is still the whole point of it. */
export function SubmitSuccess({ complaint, onReportAnother }: SubmitSuccessProps) {
  const account = complaint.account ?? null

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
              Keep this code. It checks this one report from any device and never needs a
              sign-in — it works whether or not you use the account below.
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

      {/* Absent on a pre-v2 API — the confirmation above still stands on its own. */}
      {account ? <AccountPanel account={account} /> : null}
    </div>
  )
}
