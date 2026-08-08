/**
 * `/report` — the citizen submission flow.
 *
 * Four steps (describe → location → contact → AI review), all of them backed by
 * `draftStore` so a refresh, a phone call or an accidental back-swipe never
 * costs someone their typing.
 *
 * The review step is the moment the product sells itself: it calls the ONE
 * synchronous AI endpoint (`POST /complaints/analyze-preview`, CONTRACT §5.2),
 * narrates what the analyzer is doing, then reveals the category, priority,
 * department, summary, confidence and — always — which tier answered.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import * as z from 'zod'
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Building2,
  LoaderCircle,
  LocateFixed,
  Mail,
  MapPin,
  PenLine,
  Phone,
  RefreshCw,
  Send,
  Trash2,
  TriangleAlert,
  User,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

import { ErrorState } from '@/components/ErrorState'
import { PageHeader } from '@/components/PageHeader'
import {
  AiAnalysisCard,
  AnalyzingPanel,
  EXAMPLE_DESCRIPTION,
  KARACHI_AREAS,
  PageShell,
  Stepper,
  SubmitSuccess,
  type StepDefinition,
} from '@/components/citizen'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAnalyzePreview, useCreateComplaint } from '@/hooks'
import type { Category, ComplaintCreate, ComplaintCreateResponse } from '@/lib/api/types'
import { CATEGORY_META } from '@/lib/domain'
import { cn } from '@/lib/utils'
import { useDraftStore } from '@/stores/draftStore'

/* -------------------------------------------------------------------------- */
/* Schema — mirrors CONTRACT §3 `ComplaintCreate`                              */
/* -------------------------------------------------------------------------- */

const DESCRIPTION_MIN = 15
const DESCRIPTION_MAX = 5000

const reportSchema = z.object({
  description: z
    .string()
    .trim()
    .min(DESCRIPTION_MIN, `Please write at least ${DESCRIPTION_MIN} characters so the AI has something to read.`)
    .max(DESCRIPTION_MAX, `Please keep the description under ${DESCRIPTION_MAX} characters.`),
  location_text: z
    .string()
    .trim()
    .min(3, 'Tell us where it is — a street, block or landmark is enough.')
    .max(300, 'Please keep the location under 300 characters.'),
  area: z.string().max(120).optional(),
  citizen_name: z.string().trim().max(120, 'That name is too long.').optional(),
  citizen_phone: z
    .string()
    .trim()
    .max(40, 'That phone number is too long.')
    .refine((value) => value === '' || /^[+()\d\s-]{7,}$/.test(value), {
      message: 'Enter a reachable phone number, or leave it blank.',
    })
    .optional(),
  // Required since CONTRACT §4b: the API finds or creates the citizen's account
  // from this address, which is the only way their reports can be listed
  // together later. Two messages, because "required" and "malformed" are
  // different mistakes and deserve different sentences.
  citizen_email: z
    .string()
    .trim()
    .min(1, 'We need your email — it is how your account is created.')
    .pipe(z.email('That does not look like an email address. Example: you@example.com')),
})

type ReportValues = z.infer<typeof reportSchema>

const STEPS: StepDefinition[] = [
  { id: 'describe', label: 'Describe', hint: 'What is wrong, in your own words', icon: PenLine },
  { id: 'location', label: 'Location', hint: 'Where someone will find it', icon: MapPin },
  { id: 'contact', label: 'Contact', hint: 'Your email — we make the account', icon: User },
  { id: 'review', label: 'AI review', hint: 'See how the AI reads it', icon: BrainCircuit },
]

const STEP_FIELDS: Array<Array<keyof ReportValues>> = [
  ['description'],
  ['location_text', 'area'],
  ['citizen_name', 'citizen_phone', 'citizen_email'],
  [],
]

/** How long the analysing narration stays up even if the model answers instantly. */
const MIN_ANALYSING_MS = 2_400

export default function ReportPage() {
  const draft = useDraftStore((s) => s.draft)
  const patchDraft = useDraftStore((s) => s.patch)
  const storedStep = useDraftStore((s) => s.step)
  const setStoredStep = useDraftStore((s) => s.setStep)
  const clearDraft = useDraftStore((s) => s.clear)

  // Read the persisted draft once — after this the form is the source of truth.
  const initial = useRef({ draft, step: storedStep }).current
  const restoredOnMount = useRef(initial.draft.description.trim().length > 0).current

  const [step, setStep] = useState(() =>
    initial.draft.description.trim().length >= DESCRIPTION_MIN
      ? Math.min(Math.max(initial.step, 0), STEPS.length - 1)
      : 0,
  )
  const [furthest, setFurthest] = useState(step)
  const [created, setCreated] = useState<ComplaintCreateResponse | null>(null)
  const [geoState, setGeoState] = useState<'idle' | 'locating' | 'ok' | 'denied' | 'unsupported'>(
    initial.draft.latitude != null ? 'ok' : 'idle',
  )
  const [consent, setConsent] = useState(initial.draft.consent !== false)
  const [minElapsed, setMinElapsed] = useState(false)
  const [runId, setRunId] = useState(0)

  const analyze = useAnalyzePreview()
  const create = useCreateComplaint()
  const analysedFor = useRef<string | null>(null)

  const form = useForm<ReportValues>({
    resolver: zodResolver(reportSchema),
    mode: 'onTouched',
    defaultValues: {
      description: initial.draft.description,
      location_text: initial.draft.location_text,
      area: initial.draft.area,
      citizen_name: initial.draft.citizen_name,
      citizen_phone: initial.draft.citizen_phone,
      citizen_email: initial.draft.citizen_email,
    },
  })

  /* ------------------------------------------------------------ persistence */

  useEffect(() => {
    const subscription = form.watch((values) => {
      patchDraft({
        description: values.description ?? '',
        location_text: values.location_text ?? '',
        area: values.area ?? '',
        citizen_name: values.citizen_name ?? '',
        citizen_phone: values.citizen_phone ?? '',
        citizen_email: values.citizen_email ?? '',
      })
    })
    return () => subscription.unsubscribe()
  }, [form, patchDraft])

  useEffect(() => setStoredStep(step), [step, setStoredStep])

  /* ------------------------------------------------------------- AI preview */

  const runAnalysis = useCallback(
    (description: string, locationText: string) => {
      analysedFor.current = description
      setRunId((id) => id + 1)
      analyze.mutate({ description, location_text: locationText || null })
    },
    [analyze],
  )

  /**
   * Holds the narration on screen for a readable minimum. It lives in its own
   * effect keyed on `runId` so that React's StrictMode double-invoke re-arms the
   * timer instead of cancelling it — a timer started inside `runAnalysis` would
   * be cleared by the remount and the panel would never reveal the result.
   */
  useEffect(() => {
    if (runId === 0) return
    setMinElapsed(false)
    const timer = window.setTimeout(() => setMinElapsed(true), MIN_ANALYSING_MS)
    return () => window.clearTimeout(timer)
  }, [runId])

  /**
   * Entering the review step kicks off exactly one analysis per description.
   *
   * The `setTimeout(0)` matters: firing a TanStack mutation *during* the mount
   * effect pass leaves its observer detached when React's StrictMode remounts
   * the component, and the result never reaches the UI (the request succeeds but
   * the mutation reads as `pending` forever). Deferring by a tick means the
   * StrictMode cleanup cancels the first attempt and only the settled mount
   * fires the request.
   */
  useEffect(() => {
    if (step !== 3 || created) return
    const description = form.getValues('description').trim()
    if (description.length < DESCRIPTION_MIN) return
    if (analysedFor.current === description) return
    const locationText = form.getValues('location_text').trim()
    const handle = window.setTimeout(() => runAnalysis(description, locationText), 0)
    return () => window.clearTimeout(handle)
    // `runAnalysis` changes identity on every render; re-running this effect on
    // it would restart the analysis mid-animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, created])

  const analysing = analyze.isPending || ((analyze.isSuccess || analyze.isError) && !minElapsed)

  /* ------------------------------------------------------------- navigation */

  const goNext = async () => {
    const valid = await form.trigger(STEP_FIELDS[step])
    if (!valid) return
    const next = Math.min(step + 1, STEPS.length - 1)
    setStep(next)
    setFurthest((value) => Math.max(value, next))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goBack = () => {
    setStep((value) => Math.max(0, value - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const selectStep = (index: number) => {
    if (index > furthest) return
    setStep(index)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* ------------------------------------------------------------ geolocation */

  const useMyLocation = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGeoState('unsupported')
      return
    }
    setGeoState('locating')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        patchDraft({
          latitude: Math.round(position.coords.latitude * 1e6) / 1e6,
          longitude: Math.round(position.coords.longitude * 1e6) / 1e6,
        })
        setGeoState('ok')
      },
      () => {
        // Denied, unavailable or timed out — degrade silently, never throw.
        setGeoState('denied')
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    )
  }

  const clearCoordinates = () => {
    patchDraft({ latitude: null, longitude: null })
    setGeoState('idle')
  }

  /* ----------------------------------------------------------- category hint */

  const setCategoryOverride = (category: Category | null) => patchDraft({ category })

  /* ----------------------------------------------------------------- submit */

  const submit = async () => {
    if (create.isPending || created || !consent) return

    // A restored draft can land straight on the review step, so the whole form is
    // re-validated here rather than trusting the per-step gates. Email is
    // required now (CONTRACT §4b) and a 422 from the API would be a worse way to
    // learn that than a jump back to the field.
    const valid = await form.trigger()
    if (!valid) {
      const errors = form.formState.errors
      const target = errors.description ? 0 : errors.location_text || errors.area ? 1 : 2
      setStep(target)
      setFurthest((value) => Math.max(value, target))
      toast.error('One thing is missing', {
        description:
          target === 2
            ? 'We need a valid email address to create your account.'
            : 'Please check the highlighted field.',
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    const values = form.getValues()
    const payload: ComplaintCreate = {
      description: values.description.trim(),
      location_text: values.location_text.trim(),
      area: values.area?.trim() || null,
      latitude: draft.latitude,
      longitude: draft.longitude,
      citizen_name: values.citizen_name?.trim() || null,
      citizen_phone: values.citizen_phone?.trim() || null,
      citizen_email: values.citizen_email.trim(),
      image_url: null,
      category: draft.category,
      consent: true,
    }

    create.mutate(payload, {
      onSuccess: (complaint) => {
        setCreated(complaint)
        clearDraft()
        form.reset({
          description: '',
          location_text: '',
          area: '',
          citizen_name: '',
          citizen_phone: '',
          citizen_email: '',
        })
        toast.success('Report submitted', {
          description: `Your reference code is ${complaint.reference_code}. Keep it to track progress.`,
        })
        window.scrollTo({ top: 0, behavior: 'smooth' })
      },
    })
  }

  const reportAnother = () => {
    setCreated(null)
    setStep(0)
    setFurthest(0)
    setGeoState('idle')
    setConsent(true)
    analysedFor.current = null
    analyze.reset()
    create.reset()
    clearDraft()
    form.reset({
      description: '',
      location_text: '',
      area: '',
      citizen_name: '',
      citizen_phone: '',
      citizen_email: '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const discardDraft = () => {
    clearDraft()
    form.reset({
      description: '',
      location_text: '',
      area: '',
      citizen_name: '',
      citizen_phone: '',
      citizen_email: '',
    })
    setStep(0)
    setFurthest(0)
    setGeoState('idle')
    analysedFor.current = null
    analyze.reset()
    toast.success('Draft discarded')
  }

  /* ------------------------------------------------------------------ render */

  if (created) {
    return (
      <PageShell width="form">
        <SubmitSuccess complaint={created} onReportAnother={reportAnother} />
      </PageShell>
    )
  }

  const description = form.watch('description') ?? ''
  const locationText = form.watch('location_text') ?? ''
  const areaValue = form.watch('area') ?? ''
  const name = form.watch('citizen_name') ?? ''
  const phone = form.watch('citizen_phone') ?? ''
  const email = form.watch('citizen_email') ?? ''
  const overrideCategory = draft.category

  return (
    <PageShell width="form" className="space-y-8">
      <PageHeader
        eyebrow={`Step ${step + 1} of ${STEPS.length}`}
        title="Report an issue"
        description="Tell us what is wrong and where. You will not fill in a signup form — we create your account from your email so every report you file stays in one place — and you will see exactly how the AI reads your report before you submit it."
      />

      {restoredOnMount && !created ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-info/30 bg-info/8 px-4 py-3 text-sm dark:bg-info/12">
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">Draft restored.</span> We kept what you
            had typed on this device.
          </p>
          <Button variant="ghost" size="sm" onClick={discardDraft}>
            <Trash2 className="size-3.5" aria-hidden />
            Start over
          </Button>
        </div>
      ) : null}

      <Stepper steps={STEPS} current={step} furthest={furthest} onSelect={selectStep} />

      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (step === STEPS.length - 1) void submit()
          else void goNext()
        }}
        noValidate
      >
        {/* ------------------------------------------------ step 1: describe */}
        {step === 0 ? (
          <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <CardContent className="p-5 sm:p-6">
              <FieldGroup>
                <Controller
                  name="description"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="description">
                        What is the problem?
                      </FieldLabel>
                      <FieldDescription>
                        Plain language is best. Say what is wrong, how long it has been like that,
                        and whether anyone is at risk. The AI reads exactly this text.
                      </FieldDescription>
                      <Textarea
                        {...field}
                        id="description"
                        rows={9}
                        maxLength={DESCRIPTION_MAX}
                        placeholder={EXAMPLE_DESCRIPTION}
                        aria-invalid={fieldState.invalid}
                        aria-describedby="description-counter"
                        className="min-h-44 resize-y leading-relaxed"
                      />
                      <div className="flex items-center justify-between gap-3">
                        {fieldState.invalid ? (
                          <FieldError errors={[fieldState.error]} />
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {description.trim().length < DESCRIPTION_MIN
                              ? `At least ${DESCRIPTION_MIN} characters.`
                              : 'Looks good.'}
                          </span>
                        )}
                        <span
                          id="description-counter"
                          className={cn(
                            'tabular shrink-0 text-xs',
                            description.length > DESCRIPTION_MAX * 0.9
                              ? 'text-warning'
                              : 'text-muted-foreground',
                          )}
                        >
                          {description.length.toLocaleString()} / {DESCRIPTION_MAX.toLocaleString()}
                        </span>
                      </div>
                    </Field>
                  )}
                />
              </FieldGroup>
            </CardContent>
          </Card>
        ) : null}

        {/* ------------------------------------------------ step 2: location */}
        {step === 1 ? (
          <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <CardContent className="p-5 sm:p-6">
              <FieldGroup>
                <Controller
                  name="location_text"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="location_text">Where is it?</FieldLabel>
                      <FieldDescription>
                        A street, block, landmark or plot number — enough for a crew to find it
                        without calling you.
                      </FieldDescription>
                      <Input
                        {...field}
                        id="location_text"
                        placeholder="Block 5, near the school gate, Gulshan-e-Iqbal"
                        maxLength={300}
                        autoComplete="street-address"
                        aria-invalid={fieldState.invalid}
                        className="h-10"
                      />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />

                <Controller
                  name="area"
                  control={form.control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel htmlFor="area">Area</FieldLabel>
                      <FieldDescription>
                        Your neighbourhood, town or district. Used for the hotspot analysis that shows
                        which parts of the city report the most problems.
                      </FieldDescription>
                      {/* A free text field, not a fixed list: the seeded data happens to be
                          from Karachi, but nothing in the system is Karachi-specific and a
                          citizen elsewhere must still be able to file. The known areas are
                          offered as autocomplete suggestions so the common cases stay
                          one-tap and spellings stay consistent for the hotspot grouping. */}
                      <Input
                        id="area"
                        list="known-areas"
                        autoComplete="address-level3"
                        placeholder="e.g. Gulshan-e-Iqbal (optional)"
                        maxLength={120}
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(event.target.value)}
                        onBlur={field.onBlur}
                      />
                      <datalist id="known-areas">
                        {KARACHI_AREAS.map((area) => (
                          <option key={area} value={area} />
                        ))}
                      </datalist>
                      {areaValue ? (
                        <button
                          type="button"
                          onClick={() => field.onChange('')}
                          className="w-fit text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                        >
                          Clear area
                        </button>
                      ) : null}
                    </Field>
                  )}
                />

                <Field>
                  <FieldLabel htmlFor="use-location">Pin point (optional)</FieldLabel>
                  <FieldDescription>
                    Adding coordinates helps the crew find the exact spot. We only ask your browser
                    — nothing happens if you say no.
                  </FieldDescription>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      id="use-location"
                      type="button"
                      variant="outline"
                      size="lg"
                      className="h-10"
                      onClick={useMyLocation}
                      disabled={geoState === 'locating'}
                    >
                      {geoState === 'locating' ? (
                        <LoaderCircle className="size-4 animate-spin" aria-hidden />
                      ) : (
                        <LocateFixed className="size-4" aria-hidden />
                      )}
                      {geoState === 'locating' ? 'Finding you…' : 'Use my location'}
                    </Button>

                    {draft.latitude != null && draft.longitude != null ? (
                      <span className="inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs text-success">
                        <MapPin className="size-3.5" aria-hidden />
                        <span className="tabular">
                          {draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)}
                        </span>
                        <button
                          type="button"
                          onClick={clearCoordinates}
                          aria-label="Remove coordinates"
                          className="rounded-sm hover:opacity-80"
                        >
                          <X className="size-3.5" aria-hidden />
                        </button>
                      </span>
                    ) : null}
                  </div>

                  {geoState === 'denied' ? (
                    <p className="text-xs text-muted-foreground">
                      No location from the browser — that is completely fine. The address above is
                      all we need.
                    </p>
                  ) : null}
                  {geoState === 'unsupported' ? (
                    <p className="text-xs text-muted-foreground">
                      This browser cannot share a location. Carry on with the address above.
                    </p>
                  ) : null}
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        ) : null}

        {/* ------------------------------------------------- step 3: contact */}
        {step === 2 ? (
          <Card className="animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div className="rounded-lg border border-dashed p-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">
                    You don&rsquo;t create an account — we make one for you.
                  </span>{' '}
                  Your email is the only thing we need for that: it becomes your sign-in, so every
                  report you ever file shows up in one place. Name and phone stay optional, and
                  none of these details are ever sent to the AI.
                </p>
              </div>

              <FieldGroup>
                <Controller
                  name="citizen_name"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="citizen_name">
                        <User className="size-3.5" aria-hidden />
                        Name
                      </FieldLabel>
                      <Input
                        {...field}
                        id="citizen_name"
                        placeholder="Optional"
                        autoComplete="name"
                        aria-invalid={fieldState.invalid}
                        className="h-10"
                      />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />

                <Controller
                  name="citizen_phone"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="citizen_phone">
                        <Phone className="size-3.5" aria-hidden />
                        Phone
                      </FieldLabel>
                      <FieldDescription>
                        Only used if the crew cannot find the problem from your description.
                      </FieldDescription>
                      <Input
                        {...field}
                        id="citizen_phone"
                        type="tel"
                        inputMode="tel"
                        placeholder="03xx xxxxxxx"
                        autoComplete="tel"
                        aria-invalid={fieldState.invalid}
                        className="h-10"
                      />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />

                <Controller
                  name="citizen_email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="citizen_email">
                        <Mail className="size-3.5" aria-hidden />
                        Email
                        <span className="text-destructive" aria-hidden>
                          *
                        </span>
                        <span className="sr-only">(required)</span>
                      </FieldLabel>
                      <FieldDescription>
                        Required — this is how you get an account to track your reports. We create
                        it for you on submit and show you the password on the next screen; you
                        never fill in a signup form.
                      </FieldDescription>
                      <Input
                        {...field}
                        id="citizen_email"
                        type="email"
                        required
                        placeholder="you@example.com"
                        autoComplete="email"
                        aria-invalid={fieldState.invalid}
                        className="h-10"
                      />
                      {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    </Field>
                  )}
                />
              </FieldGroup>
            </CardContent>
          </Card>
        ) : null}

        {/* ------------------------------------------------ step 4: AI review */}
        {step === 3 ? (
          <div className="space-y-5">
            <div aria-live="polite" aria-busy={analysing}>
              {analysing ? (
                <AnalyzingPanel runId={runId} />
              ) : analyze.isError ? (
                <ErrorState
                  error={analyze.error}
                  title="The AI could not read your report just now"
                  description="Every analyzer tier is unavailable. This does not block you — submit anyway and it will be analysed in the background, or triaged by a person if the outage continues."
                  onRetry={() => runAnalysis(description.trim(), locationText.trim())}
                  retryLabel="Try the analysis again"
                />
              ) : analyze.data ? (
                <div className="animate-in fade-in-0 slide-in-from-bottom-3 duration-500">
                  <AiAnalysisCard
                    analysis={analyze.data}
                    title="This is how the AI read your report"
                    override={{ value: overrideCategory, onChange: setCategoryOverride }}
                    footer={
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                        <p className="text-xs text-muted-foreground">
                          Nothing has been saved yet. Submit below to file it.
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => runAnalysis(description.trim(), locationText.trim())}
                        >
                          <RefreshCw className="size-3.5" aria-hidden />
                          Analyse again
                        </Button>
                      </div>
                    }
                  />
                </div>
              ) : (
                <Card>
                  <CardContent className="p-6 text-sm text-muted-foreground">
                    Go back and describe the problem to see the AI's reading.
                  </CardContent>
                </Card>
              )}
            </div>

            {/* What is about to be sent */}
            <Card>
              <CardContent className="space-y-4 p-5 sm:p-6">
                <h3 className="text-sm font-semibold">Your report</h3>

                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Description</dt>
                    <dd className="mt-1 leading-relaxed whitespace-pre-wrap">
                      {description.trim()}
                    </dd>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="size-3.5" aria-hidden />
                        Location
                      </dt>
                      <dd className="mt-1 wrap-break-word">
                        {locationText.trim()}
                        {areaValue ? (
                          <span className="text-muted-foreground"> · {areaValue}</span>
                        ) : null}
                        {draft.latitude != null && draft.longitude != null ? (
                          <span className="tabular block text-xs text-muted-foreground">
                            {draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)}
                          </span>
                        ) : null}
                      </dd>
                    </div>
                    <div>
                      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="size-3.5" aria-hidden />
                        Contact
                      </dt>
                      <dd className="mt-1 wrap-break-word">
                        {[name, phone, email].filter(Boolean).join(' · ')}
                      </dd>
                      {email ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Your account is created for this address — no signup form.
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-warning">
                          An email is needed. Go back to the Contact step to add one.
                        </p>
                      )}
                    </div>
                  </div>
                  {overrideCategory ? (
                    <div>
                      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Building2 className="size-3.5" aria-hidden />
                        Your category
                      </dt>
                      <dd className="mt-1">{CATEGORY_META[overrideCategory].label}</dd>
                    </div>
                  ) : null}
                </dl>

                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm">
                  <Checkbox
                    checked={consent}
                    onCheckedChange={(value) => {
                      const next = value === true
                      setConsent(next)
                      patchDraft({ consent: next })
                    }}
                    aria-describedby="consent-text"
                    className="mt-0.5"
                  />
                  <span id="consent-text" className="leading-relaxed text-muted-foreground">
                    I agree that this report, its location and any contact details I entered may be
                    stored and passed to the responsible department.
                  </span>
                </label>

                {!consent ? (
                  <p className="flex items-center gap-2 text-xs text-warning">
                    <TriangleAlert className="size-3.5" aria-hidden />
                    We cannot file the report without this.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        ) : null}

        {/* ------------------------------------------------------- navigation */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            {step > 0 ? (
              <Button type="button" variant="ghost" size="lg" className="h-10" onClick={goBack}>
                <ArrowLeft className="size-4" aria-hidden />
                Back
              </Button>
            ) : (
              <Button asChild variant="ghost" size="lg" className="h-10">
                <Link to="/">
                  <ArrowLeft className="size-4" aria-hidden />
                  Cancel
                </Link>
              </Button>
            )}
          </div>

          {step < STEPS.length - 1 ? (
            <Button type="submit" size="lg" className="h-10 px-5">
              {step === 2 ? 'Continue to AI review' : 'Continue'}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button
              type="submit"
              size="lg"
              className="h-10 px-5"
              // Never gated on the AI preview — CONTRACT §5.1: a slow or dead
              // analyzer must not be able to stop someone filing a complaint.
              disabled={create.isPending || !consent}
            >
              {create.isPending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              {create.isPending ? 'Submitting…' : 'Submit report'}
            </Button>
          )}
        </div>

        {create.isError ? (
          <ErrorState
            className="mt-6"
            error={create.error}
            title="Your report was not filed"
            description="Nothing was lost — your text is still here. Try submitting again."
            onRetry={() => void submit()}
            retryLabel="Submit again"
          />
        ) : null}
      </form>
    </PageShell>
  )
}
