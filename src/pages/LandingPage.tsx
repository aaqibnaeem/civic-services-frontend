/**
 * `/` — the public landing page.
 *
 * Deviates from the "every page starts with a `<PageHeader/>`" convention on
 * purpose: this page's hero IS its header, and the sections run full-bleed
 * because `PublicLayout` leaves `<main>` unconstrained.
 *
 * Every number on this page is live from `/analytics/public-summary`; the
 * highlighted tier comes from `/ai/health`. Nothing numeric is hard-coded.
 * The only static assets are the photographs (see HERO_PHOTOS below), and
 * the hero's triage chip is labelled as an example.
 */

import { Link } from 'react-router-dom'
import { ArrowRight, BrainCircuit, MapPin, Search, Sparkles } from 'lucide-react'

import { CategoryBadge } from '@/components/CategoryBadge'
import { ConfidenceMeter } from '@/components/ConfidenceMeter'
import { ErrorState } from '@/components/ErrorState'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { PriorityBadge } from '@/components/PriorityBadge'
import { ReferenceCode } from '@/components/ReferenceCode'
import {
  AiExplainer,
  Band,
  CategoryStrip,
  HowItWorks,
  LiveStats,
} from '@/components/citizen'
import { Button } from '@/components/ui/button'
import { useAiHealth, usePublicSummary } from '@/hooks'
import { formatNumber, INSIGHT_SEVERITY_META } from '@/lib/domain'
import type { AISource, Category } from '@/lib/api/types'

/**
 * The hero mosaic — real photographs of the problems this service takes,
 * each tagged with the category the AI would file it under. The photos are
 * stock (they live in /public/images/hero); everything numeric around them
 * is live data, so the example triage chip says "example" out loud.
 */
const HERO_PHOTOS: {
  src: string
  category: Category
  alt: string
  label: string
}[] = [
  {
    src: '/images/hero/pothole.jpg',
    category: 'road',
    alt: 'A deep pothole in a damaged asphalt road',
    label: 'Potholes and broken roads — start a report',
  },
  {
    src: '/images/hero/garbage.jpg',
    category: 'waste',
    alt: 'A pile of uncollected garbage bags on a city street',
    label: 'Uncollected garbage — start a report',
  },
  {
    src: '/images/hero/streetlight.jpg',
    category: 'electricity',
    alt: 'A streetlight pole with tangled overhead power lines',
    label: 'Dead streetlights and wiring — start a report',
  },
]

/** `/ai/health` reports availability per tier; the first available one answers. */
function activeTier(health: {
  llm_available: boolean
  ml_model_loaded: boolean
  rules_available: boolean
}): AISource {
  if (health.llm_available) return 'llm'
  if (health.ml_model_loaded) return 'ml'
  return 'rules'
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="max-w-2xl space-y-3">
      <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{eyebrow}</p>
      <h2 className="text-2xl font-semibold sm:text-3xl">{title}</h2>
      <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
    </div>
  )
}

export default function LandingPage() {
  const summary = usePublicSummary()
  const aiHealth = useAiHealth()
  const tier = aiHealth.data ? activeTier(aiHealth.data) : null

  return (
    <div className="flex flex-col">
      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b bg-linear-to-b from-primary/6 via-background to-background">
        <div className="civic-grid pointer-events-none absolute inset-0" aria-hidden />
        {/* Aurora accents — two soft glows in theme tokens, no hard-coded hues. */}
        <div
          className="pointer-events-none absolute -top-44 right-[-10%] size-140 rounded-full bg-primary/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute top-1/2 left-[-12%] size-112 rounded-full bg-info/10 blur-3xl"
          aria-hidden
        />

        <div className="relative mx-auto w-full max-w-6xl px-4 pt-16 pb-16 sm:px-6 sm:pt-24 sm:pb-20">
          <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div className="space-y-7 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <span className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3.5 py-1.5 text-xs font-medium backdrop-blur">
                <MapPin className="size-3.5 text-primary" aria-hidden />
                Karachi
                {tier ? (
                  <>
                    <span className="h-3 w-px bg-border" aria-hidden />
                    <span className="size-1.5 animate-pulse-ring rounded-full bg-success" aria-hidden />
                    <span className="text-muted-foreground">AI triage online</span>
                  </>
                ) : null}
              </span>

              <div className="space-y-4">
                <h1 className="text-[2.75rem] leading-[1.04] font-semibold tracking-tight text-pretty sm:text-6xl">
                  Broken on your street?
                  <span className="mt-1.5 block text-primary">Reported in one sentence.</span>
                </h1>
                <p className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
                  English or Roman Urdu — the AI files it with the right department and hands you a
                  code to track.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  size="lg"
                  className="h-12 w-full rounded-full px-7 text-base shadow-civic-lg sm:w-auto"
                >
                  <Link to="/report">
                    Report a problem
                    <ArrowRight className="size-4.5" aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-12 w-full rounded-full px-7 text-base sm:w-auto"
                >
                  <Link to="/track">
                    <Search className="size-4.5" aria-hidden />
                    Track a report
                  </Link>
                </Button>
              </div>

              {/* Live proof instead of marketing bullets; hidden until it loads. */}
              {summary.data ? (
                <p className="text-sm text-muted-foreground">
                  <span className="tabular font-semibold text-foreground">
                    {formatNumber(summary.data.total_complaints)}
                  </span>{' '}
                  reports filed ·{' '}
                  <span className="tabular font-semibold text-foreground">
                    {formatNumber(summary.data.resolved)}
                  </span>{' '}
                  resolved — live counts
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Under a minute · No sign-up needed</p>
              )}
            </div>

            {/* Photo mosaic: the problems themselves. Each photo starts a report;
                the floating chip shows what the AI hands back, labelled example. */}
            <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700 [animation-delay:120ms] fill-mode-[backwards]">
              <div
                className="pointer-events-none absolute -inset-8 rounded-[3rem] bg-primary/8 blur-2xl"
                aria-hidden
              />

              <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
                {HERO_PHOTOS.map((photo, i) => (
                  <Link
                    key={photo.src}
                    to="/report"
                    aria-label={photo.label}
                    className={`group relative block overflow-hidden border shadow-civic-lg transition-shadow hover:shadow-civic-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none ${
                      i === 0 ? 'row-span-2 rounded-3xl' : 'rounded-2xl'
                    }`}
                  >
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      className={`w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
                        i === 0 ? 'h-full' : 'aspect-4/3'
                      }`}
                    />
                    <div
                      className="absolute inset-0 bg-linear-to-t from-black/45 via-transparent to-transparent"
                      aria-hidden
                    />
                    <CategoryBadge
                      category={photo.category}
                      size="sm"
                      short
                      className="absolute top-3 left-3 border-white/25 bg-black/35 text-white backdrop-blur-sm"
                    />
                  </Link>
                ))}
              </div>

              <div className="absolute -bottom-6 left-1/2 w-[min(88%,20rem)] -translate-x-1/2 space-y-2.5 rounded-2xl border bg-card/90 p-3.5 shadow-civic-lg backdrop-blur-md animate-in fade-in zoom-in-95 duration-500 [animation-delay:400ms] fill-mode-[backwards] sm:left-6 sm:translate-x-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold tracking-wide text-muted-foreground uppercase">
                    <BrainCircuit className="size-3.5 text-primary" aria-hidden />
                    AI triage · example
                  </span>
                  <ReferenceCode code="CIV-8F3K2M" size="sm" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <CategoryBadge category="road" size="sm" short />
                  <PriorityBadge priority="high" size="sm" />
                </div>
                <ConfidenceMeter value={0.91} variant="compact" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- stats */}
      <Band className="py-14 sm:py-20" innerClassName="space-y-8">
        <SectionHeading
          eyebrow="Live from the service"
          title="What has actually happened so far"
          description="These numbers are read straight from the complaint database each time this page loads. Nothing here is a mock-up."
        />

        {summary.isPending ? (
          <LoadingSkeleton variant="stats" count={4} />
        ) : summary.isError ? (
          <ErrorState
            error={summary.error}
            title="Live statistics are unavailable"
            onRetry={() => void summary.refetch()}
          />
        ) : (
          <LiveStats summary={summary.data} />
        )}
      </Band>

      {/* ---------------------------------------------------------- categories */}
      <Band className="border-y bg-muted/30 py-14 sm:py-20" innerClassName="space-y-8">
        <SectionHeading
          eyebrow="Seven categories"
          title="Everything a city gets asked to fix"
          description="Every complaint is placed in exactly one of these. The share beside each one is its real slice of the reports filed so far."
        />

        {summary.isPending ? (
          <LoadingSkeleton variant="cards" count={4} />
        ) : summary.isError ? (
          <ErrorState
            error={summary.error}
            title="Category breakdown unavailable"
            description="The categories themselves are unchanged — only their live counts could not be loaded."
            onRetry={() => void summary.refetch()}
          />
        ) : (
          <CategoryStrip
            rows={summary.data.categories}
            trailing={
              <Link
                to="/report"
                className="flex w-full flex-col justify-between gap-3 rounded-xl border border-dashed bg-card/40 p-4 transition-colors hover:border-primary/40 hover:bg-card focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="flex size-9 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
                  <Sparkles className="size-4.5" aria-hidden strokeWidth={2.1} />
                </span>
                <span className="space-y-1">
                  <span className="block text-sm font-medium">Not sure which one?</span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    You never have to pick. Describe the problem and the AI chooses the category for
                    you — you can correct it before submitting.
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  Start a report
                  <ArrowRight className="size-3.5" aria-hidden />
                </span>
              </Link>
            }
          />
        )}
      </Band>

      {/* -------------------------------------------------------- how it works */}
      <Band className="py-14 sm:py-20" innerClassName="space-y-8">
        <SectionHeading
          eyebrow="How it works"
          title="Report → understood → routed → tracked"
          description="Four steps, no council jargon, and no phone queue. The whole loop is designed to work from a phone on a street corner."
        />
        <HowItWorks />
      </Band>

      {/* ------------------------------------------------------- the AI itself */}
      <Band className="border-y bg-muted/30 py-14 sm:py-20" innerClassName="space-y-8">
        <SectionHeading
          eyebrow="How the AI works"
          title="Three tiers, and we always say which one answered"
          description="Automated triage is only trustworthy if it degrades honestly. The analyzer tries the best option first and falls back when it has to — and the result carries a badge saying which tier produced it."
        />
        <AiExplainer activeSource={tier} />
      </Band>

      {/* ---------------------------------------------------------- highlights */}
      {summary.data?.highlights?.length ? (
        <Band className="py-14 sm:py-20" innerClassName="space-y-8">
          <SectionHeading
            eyebrow="What the data says"
            title="The statistics, explained in plain English"
            description="The same analysis the staff dashboard runs, written so anyone can read it. Generated from the live data, not written by hand."
          />
          <ul className="grid gap-4 lg:grid-cols-3">
            {summary.data.highlights!.slice(0, 3).map((insight) => {
              const meta = INSIGHT_SEVERITY_META[insight.severity]
              return (
                <li
                  key={insight.id}
                  className={`flex flex-col gap-2.5 rounded-xl border p-5 ${meta.className}`}
                >
                  <span className="flex items-center gap-2">
                    <meta.icon className={`size-4 ${meta.iconClass}`} aria-hidden />
                    <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                      {meta.label}
                    </span>
                  </span>
                  <h3 className="text-sm leading-snug font-semibold">{insight.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{insight.detail}</p>
                </li>
              )
            })}
          </ul>
        </Band>
      ) : null}

      {/* ----------------------------------------------------------- final CTA */}
      {/* A road crew mid-repair — the end state every report is aiming for.
          The overlay is a fixed dark scrim (not a theme token) because the
          photo itself never changes with the theme; white text stays AA. */}
      <section className="relative overflow-hidden border-t">
        <img
          src="/images/hero/repair.jpg"
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 size-full object-cover"
        />
        <div
          className="absolute inset-0 bg-linear-to-r from-black/80 via-black/65 to-black/40"
          aria-hidden
        />

        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl space-y-3">
              <h2 className="text-2xl font-semibold text-balance text-white sm:text-3xl">
                Something broken on your street?
              </h2>
              <p className="text-sm leading-relaxed text-white/75 sm:text-base">
                Tell us in a couple of sentences. You will see exactly how the AI reads it before
                you submit, and you will leave with a code you can check any time.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:items-end">
              <Button
                asChild
                size="lg"
                className="h-11 px-6 text-base bg-white text-neutral-900 shadow-none hover:bg-white/90"
              >
                <Link to="/report">
                  Report a problem
                  <ArrowRight className="size-4.5" aria-hidden />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-11 px-6 text-base border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              >
                <Link to="/track">Track my complaint</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
