/**
 * `/track` — enter a reference code.
 *
 * The code is the handle that works without signing in, so this page does two
 * things: validate the `CIV-XXXXXX` shape before spending a request on it, and
 * offer one-tap access to every code this browser has already seen.
 */

import { Link, useNavigate } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import * as z from 'zod'
import { ArrowRight, FileText, ListChecks, Search } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { ReferenceCode } from '@/components/ReferenceCode'
import { PageShell, shortDate, useTrackedRefs } from '@/components/citizen'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { formatReferenceCode, isReferenceCode } from '@/lib/domain'

const trackSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Enter the reference code from your report.')
    .refine((value) => isReferenceCode(value), 'Reference codes look like CIV-8F3K2M.'),
})

type TrackValues = z.infer<typeof trackSchema>

export default function TrackPage() {
  const navigate = useNavigate()
  const tracked = useTrackedRefs()

  const form = useForm<TrackValues>({
    resolver: zodResolver(trackSchema),
    mode: 'onSubmit',
    defaultValues: { code: '' },
  })

  const onSubmit = (values: TrackValues) => {
    navigate(`/track/${formatReferenceCode(values.code)}`)
  }

  return (
    <PageShell width="narrow" className="space-y-8">
      <PageHeader
        eyebrow="Tracking"
        title="Track a report"
        description="Enter the reference code you were given when you submitted — for example CIV-8F3K2M. A code works on its own: no sign-in needed."
      />

      <Card>
        <CardContent className="p-5 sm:p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <Controller
              name="code"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="code">Reference code</FieldLabel>
                  <FieldDescription>
                    Case does not matter — we will tidy it up for you.
                  </FieldDescription>
                  <Input
                    {...field}
                    id="code"
                    placeholder="CIV-8F3K2M"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={14}
                    aria-invalid={fieldState.invalid}
                    onChange={(event) => field.onChange(event.target.value.toUpperCase())}
                    className="ref-code h-12 text-center text-lg tracking-[0.18em] sm:text-xl"
                  />
                  {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                </Field>
              )}
            />

            <Button type="submit" size="lg" className="h-11 w-full text-base">
              <Search className="size-4.5" aria-hidden />
              Find my report
            </Button>
          </form>
        </CardContent>
      </Card>

      {tracked.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold">Reports from this device</h2>
            <Button asChild variant="ghost" size="sm">
              <Link to="/my-reports">
                <ListChecks className="size-3.5" aria-hidden />
                See all
              </Link>
            </Button>
          </div>

          <ul className="divide-y overflow-hidden rounded-xl border bg-card">
            {tracked.slice(0, 5).map((entry) => (
              <li key={entry.reference_code}>
                <Link
                  to={`/track/${entry.reference_code}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <ReferenceCode code={entry.reference_code} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {entry.nickname || entry.title || 'Saved report'}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      Saved {shortDate(entry.saved_at)}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <div className="rounded-xl border border-dashed p-5 text-sm leading-relaxed text-muted-foreground">
          <p className="flex items-start gap-2">
            <FileText className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              No reports have been submitted from this device yet. Once you file one, its code is
              remembered here so you never have to type it again.{' '}
              <Link to="/report" className="font-medium text-foreground underline underline-offset-4">
                Report an issue
              </Link>
              .
            </span>
          </p>
        </div>
      )}
    </PageShell>
  )
}
