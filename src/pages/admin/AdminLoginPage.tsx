/**
 * Staff sign-in.
 *
 * The demo credentials are pre-filled on purpose: this is a hackathon build and
 * a judge should be one click from the admin, not hunting through a README. The
 * hint says exactly which account is loaded.
 *
 * It is also the reference pattern for react-hook-form + zod + shadcn `Field`:
 * schema → `useForm({ resolver: zodResolver(schema) })` → `<Controller/>` per
 * field → mutation from `@/hooks`.
 */

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import {
  ChartNoAxesCombined,
  Inbox,
  Landmark,
  LoaderCircle,
  LogIn,
  MessageSquare,
  TriangleAlert,
} from 'lucide-react'
import * as z from 'zod'

import { useLogin } from '@/hooks/useAuth'
import { isApiError } from '@/lib/api/client'
import { useAuthStore } from '@/stores/authStore'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

const DEMO_EMAIL = 'admin@civic.gov.pk'
const DEMO_PASSWORD = 'Admin@123'

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
})

type LoginValues = z.infer<typeof loginSchema>

const HIGHLIGHTS = [
  { icon: Inbox, label: 'Triage 800+ live complaints' },
  { icon: ChartNoAxesCombined, label: 'Statistics with plain-English insights' },
  { icon: MessageSquare, label: 'Ask the database a question' },
]

export default function AdminLoginPage() {
  const [searchParams] = useSearchParams()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const next = searchParams.get('next') || '/admin'
  // A citizen account cannot enter the console, so send it home rather than
  // through the admin guard just to be bounced back out again.
  const login = useLogin((account) =>
    account.role === 'citizen' ? '/my-reports' : next,
  )

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    // Pre-filled demo credentials — see the module docstring.
    defaultValues: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  })

  // Already signed in — skip the form.
  if (token) return <Navigate to={user?.role === 'citizen' ? '/my-reports' : next} replace />

  const onSubmit = (values: LoginValues) => login.mutate(values)

  const errorMessage = login.error
    ? isApiError(login.error) && login.error.isUnauthorized
      ? 'That email and password combination was not recognised.'
      : isApiError(login.error)
        ? login.error.toUserMessage()
        : 'Sign-in failed. Please try again.'
    : null

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="civic-grid pointer-events-none absolute inset-0" aria-hidden />

      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-civic-lg">
            <Landmark className="size-6" aria-hidden strokeWidth={2.2} />
          </span>
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">
              AI Smart Civic Services
            </p>
            <h1 className="text-xl font-semibold tracking-tight">Service team console</h1>
            <p className="text-sm text-muted-foreground text-balance">
              Sign in to triage, assign and resolve citizen reports.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Staff sign in</CardTitle>
            <CardDescription>
              Use the credentials issued by your department.
            </CardDescription>
          </CardHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <CardContent className="space-y-4">
              {errorMessage ? (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-destructive/35 bg-destructive/10 p-3 text-sm dark:bg-destructive/14"
                >
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0 text-destructive"
                    aria-hidden
                  />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              ) : null}

              <FieldGroup>
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="email">Email</FieldLabel>
                      <Input
                        {...field}
                        id="email"
                        type="email"
                        autoComplete="username"
                        placeholder={DEMO_EMAIL}
                        aria-invalid={fieldState.invalid}
                        disabled={login.isPending}
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
                      <FieldLabel htmlFor="password">Password</FieldLabel>
                      <Input
                        {...field}
                        id="password"
                        type="password"
                        autoComplete="current-password"
                        placeholder="••••••••"
                        aria-invalid={fieldState.invalid}
                        disabled={login.isPending}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </FieldGroup>
            </CardContent>

            <CardFooter className="mt-6 flex-col gap-3">
              <Button type="submit" className="w-full" disabled={login.isPending}>
                {login.isPending ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden />
                ) : (
                  <LogIn className="size-4" aria-hidden />
                )}
                {login.isPending ? 'Signing in…' : 'Sign in'}
              </Button>

              <div className="w-full rounded-lg border border-info/25 bg-info/8 p-2.5 text-center dark:bg-info/12">
                <p className="text-xs font-medium text-foreground">
                  Demo account is already filled in
                </p>
                <p className="mt-0.5 font-mono text-[0.6875rem] text-muted-foreground">
                  {DEMO_EMAIL} / {DEMO_PASSWORD}
                </p>
                <button
                  type="button"
                  className="mt-1 text-[0.6875rem] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  onClick={() => {
                    form.setValue('email', DEMO_EMAIL)
                    form.setValue('password', DEMO_PASSWORD)
                  }}
                >
                  Reset to demo credentials
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>

        <ul className="space-y-1.5">
          {HIGHLIGHTS.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <item.icon className="size-3.5 shrink-0 text-primary" aria-hidden />
              {item.label}
            </li>
          ))}
        </ul>

        <div className="space-y-1.5 text-center text-sm text-muted-foreground">
          <p>
            <Link to="/signin" className="underline underline-offset-4 hover:text-foreground">
              Citizen? Sign in to your reports here
            </Link>
          </p>
          <p>
            <Link to="/" className="underline underline-offset-4 hover:text-foreground">
              Back to the public site
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
