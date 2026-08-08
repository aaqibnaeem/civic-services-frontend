/**
 * The 404. It sits OUTSIDE `PublicLayout` in the route table, so it draws its
 * own full-height canvas, logo mark and links back into the product.
 */

import { Link } from 'react-router-dom'
import { FileText, House, Landmark, Search } from 'lucide-react'

import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="civic-grid pointer-events-none absolute inset-0" aria-hidden />

      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-md space-y-8 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2.5 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-civic">
            <Landmark className="size-4.5" aria-hidden strokeWidth={2.2} />
          </span>
          <span className="text-sm font-semibold tracking-tight">Civic Services</span>
        </Link>

        <div className="space-y-3">
          <p className="tabular font-mono text-sm tracking-[0.28em] text-muted-foreground">404</p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            This page does not exist
          </h1>
          <p className="text-sm leading-relaxed text-balance text-muted-foreground">
            The address you followed does not match anything here. If you were opening a report,
            check the reference code — they look like{' '}
            <span className="ref-code rounded-md border bg-muted/60 px-1.5 py-0.5">CIV-8F3K2M</span>.
          </p>
        </div>

        <div className="flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild size="lg" className="h-10 px-5">
            <Link to="/">
              <House className="size-4" aria-hidden />
              Go home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-10 px-5">
            <Link to="/report">
              <FileText className="size-4" aria-hidden />
              Report an issue
            </Link>
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          <Link
            to="/track"
            className="inline-flex items-center gap-1.5 underline underline-offset-4 hover:text-foreground"
          >
            <Search className="size-3.5" aria-hidden />
            Track a report with a code
          </Link>
        </p>
      </div>
    </div>
  )
}
