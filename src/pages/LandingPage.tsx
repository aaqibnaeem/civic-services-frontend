/**
 * `/` — the public landing page.
 *
 * Deviates from the "every page starts with a `<PageHeader/>`" convention on
 * purpose: this page's hero IS its header, and the sections run full-bleed
 * because `PublicLayout` leaves `<main>` unconstrained.
 *
 * Every number on this page is live from `/analytics/public-summary`; the
 * highlighted tier comes from `/ai/health`. Nothing is hard-coded.
 */

import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BrainCircuit,
  CircleCheck,
  Search,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react'

import { AiSourceBadge } from '@/components/AiSourceBadge'
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
import { Card, CardContent } from '@/components/ui/card'
import { useAiHealth, usePublicSummary } from '@/hooks'
import { AI_SOURCE_META, INSIGHT_SEVERITY_META } from '@/lib/domain'
import type { AISource } from '@/lib/api/types'

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
      <section className="relative overflow-hidden border-b bg-linear-to-b from-primary/8 via-background to-background">
        <div className="civic-grid pointer-events-none absolute inset-0" aria-hidden />

        <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-xs font-medium text-primary dark:bg-primary/12">
                  <Sparkles className="size-3.5" aria-hidden />
                  AI-assisted civic triage
                </span>
                {tier ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
                    <span className="size-1.5 animate-pulse-ring rounded-full bg-success" aria-hidden />
                    Analyzer online · {AI_SOURCE_META[tier].label} tier
                  </span>
                ) : null}
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-pretty sm:text-5xl xl:text-6xl">
                  Report a civic problem.
                  <span className="block text-primary">The AI routes it in seconds.</span>
                </h1>
                <p className="max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Describe a pothole, a burst water main or a dead streetlight in your own words. It
                  is read, categorised, prioritised and sent to the department that owns it — and
                  you leave with a code to follow it, plus an account we create for you so every
                  report you file stays in one place.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="h-11 w-full px-6 text-base sm:w-auto">
                  <Link to="/report">
                    Report a problem
                    <ArrowRight className="size-4.5" aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="h-11 w-full px-6 text-base sm:w-auto"
                >
                  <Link to="/track">
                    <Search className="size-4.5" aria-hidden />
                    Track my complaint
                  </Link>
                </Button>
              </div>

              <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-1.5">
                  <CircleCheck className="size-4 text-success" aria-hidden />
                  No signup form — we make your account
                </li>
                <li className="flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-success" aria-hidden />
                  Track by code without signing in
                </li>
                <li className="flex items-center gap-1.5">
                  <Zap className="size-4 text-success" aria-hidden />
                  Takes under a minute
                </li>
              </ul>
            </div>

            {/* An illustrative example of the triage output — labelled as such. */}
            <div className="relative">
              <Card className="border-primary/20 shadow-civic-lg">
                <CardContent className="space-y-4 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Example triage output
                    </span>
                    <ReferenceCode code="CIV-8F3K2M" size="sm" />
                  </div>

                  <p className="rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed">
                    “Huge pothole on the main road outside the school in Block 5. Two motorcyclists
                    fell there yesterday and it fills with water when it rains.”
                  </p>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BrainCircuit className="size-4 text-primary" aria-hidden />
                    The analyzer returns
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <CategoryBadge category="road" />
                    <PriorityBadge priority="high" />
                    <AiSourceBadge source="llm" modelName="deepseek-v4-flash" latencyMs={1840} />
                  </div>

                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Routed to <span className="font-medium text-foreground">Roads &amp; Infrastructure</span>{' '}
                    — a pothole outside a school where people have already fallen is a safety risk,
                    not routine maintenance.
                  </p>

                  <ConfidenceMeter value={0.91} />
                </CardContent>
              </Card>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Illustration of the triage output. Your own report is analysed live on the next screen.
              </p>
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
      <Band className="border-t bg-linear-to-b from-background to-primary/8 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl space-y-6 text-center">
          <h2 className="text-2xl font-semibold text-balance sm:text-3xl">
            Something broken on your street?
          </h2>
          <p className="text-sm leading-relaxed text-balance text-muted-foreground sm:text-base">
            Tell us in a couple of sentences. You will see exactly how the AI reads it before you
            submit, and you will leave with a code you can check any time.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-11 px-6 text-base">
              <Link to="/report">
                Report a problem
                <ArrowRight className="size-4.5" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-11 px-6 text-base">
              <Link to="/track">Track my complaint</Link>
            </Button>
          </div>
        </div>
      </Band>
    </div>
  )
}
