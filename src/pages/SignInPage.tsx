/**
 * `/signin` — the CITIZEN sign-in screen. `/admin/login` is the staff one.
 *
 * Nobody signs up here. CONTRACT §4b: filing a report creates the account, and
 * the confirmation screen shows the password once. This page exists so that
 * account is usable afterwards — the reference code still works without it.
 *
 * Follows the reference form pattern (zod → `useForm` → `<Controller>` per
 * `<Field>`); see `AdminLoginPage.tsx`.
 */

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { FileText, ListChecks, LoaderCircle, LogIn, Search, Shield, TriangleAlert } from 'lucide-react'
import * as z from 'zod'

import { PageHeader } from '@/components/PageHeader'
import { PageShell } from '@/components/citizen'
import { useLogin } from '@/hooks/useAuth'
import { isApiError } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const signInSchema = z.object({
  email: z.email('Enter the email address you filed your report with.'),
  password: z.string().min(1, 'Enter your password.'),
})

type SignInValues = z.infer<typeof signInSchema>

export default function SignInPage() {
  const [searchParams] = useSearchParams()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const next = searchParams.get('next') || '/my-reports'

  // One endpoint, two destinations: staff who sign in here still belong in the
  // console rather than on a citizen page that would have nothing to show them.
  const login = useLogin((account) => (account.role === 'citizen' ? next : '/admin'))

  const form = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  })

  if (token) {
    return <Navigate to={user && user.role !== 'citizen' ? '/admin' : next} replace />
  }

  const onSubmit = (values: SignInValues) => login.mutate(values)

  const errorMessage = login.error
    ? isApiError(login.error) && login.error.isUnauthorized
      ? 'That email and password combination was not recognised. If you have never filed a report, there is no account for this address yet.'
      : isApiError(login.error)
        ? login.error.toUserMessage()
        : 'Sign-in failed. Please try again.'
    : null

  return (
    <PageShell width="narrow" className="space-y-8">
      <PageHeader
        eyebrow="Your account"
        title="Sign in"
        description="You never filled in a signup form — we made the account for you the first time you filed a report, and showed the password on the confirmation screen. Sign in to see every report you have filed in one place."
      />

      <Card>
        <CardContent className="p-5 sm:p-6">
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-5">
            {errorMessage ? (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-lg border border-destructive/35 bg-destructive/10 p-3 text-sm dark:bg-destructive/14"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            ) : null}

            <FieldGroup>
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="signin-email">Email</FieldLabel>
                    <FieldDescription>
                      The address you gave when you filed your report.
                    </FieldDescription>
                    <Input
                      {...field}
                      id="signin-email"
                      type="email"
                      autoComplete="username"
                      placeholder="you@example.com"
                      aria-invalid={fieldState.invalid}
                      disabled={login.isPending}
                      className="h-10"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="signin-password">Password</FieldLabel>
                    <FieldDescription>
                      The one shown on your confirmation screen, unless you have changed it.
                    </FieldDescription>
                    <Input
                      {...field}
                      id="signin-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      aria-invalid={fieldState.invalid}
                      disabled={login.isPending}
                      className="h-10"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </FieldGroup>

            <Button type="submit" size="lg" className="h-10 w-full" disabled={login.isPending}>
              {login.isPending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <LogIn className="size-4" aria-hidden />
              )}
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3 rounded-xl border border-dashed p-5">
        <h2 className="text-sm font-semibold">No account yet?</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          You do not create one. File a report with your email address and the account is made for
          you — the confirmation screen shows the password. And you never need it to check on a
          single report: a reference code works on its own, from any device.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/report">
              <FileText className="size-4" aria-hidden />
              Report an issue
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/track">
              <Search className="size-4" aria-hidden />
              Track with a code
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/my-reports">
              <ListChecks className="size-4" aria-hidden />
              Reports on this device
            </Link>
          </Button>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground">
        <Link
          to="/admin/login"
          className="inline-flex items-center gap-1.5 underline underline-offset-4 hover:text-foreground"
        >
          <Shield className="size-3.5" aria-hidden />
          Staff and department accounts sign in here
        </Link>
      </p>
    </PageShell>
  )
}
