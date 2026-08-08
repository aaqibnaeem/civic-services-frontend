/**
 * Small helpers shared by the citizen pages.
 *
 * The only non-obvious one is `parseApiDate`: most API timestamps end in `Z`,
 * but a couple of computed fields (`generated_at`) are emitted without a
 * timezone designator. `new Date()` would read those as LOCAL time and the
 * relative label would be hours out, so we normalise first.
 */

import { format, formatDistanceToNow, isValid } from 'date-fns'

const HAS_TIMEZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i

export function parseApiDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const normalised = HAS_TIMEZONE.test(value) ? value : `${value}Z`
  const date = new Date(normalised)
  return isValid(date) ? date : null
}

/** "3 hours ago" — always relative to now, always with a suffix. */
export function relativeTime(value: string | null | undefined): string {
  const date = parseApiDate(value)
  if (!date) return '—'
  return formatDistanceToNow(date, { addSuffix: true })
}

/** "8 Aug 2026, 18:47" — the exact stamp, for tooltips and timelines. */
export function absoluteTime(value: string | null | undefined): string {
  const date = parseApiDate(value)
  if (!date) return '—'
  return format(date, "d MMM yyyy, HH:mm")
}

/** "8 Aug 2026" — date only, for cards. */
export function shortDate(value: string | null | undefined): string {
  const date = parseApiDate(value)
  if (!date) return '—'
  return format(date, 'd MMM yyyy')
}

/** Days → the phrasing used across the public site. */
export function formatDays(days: number | null | undefined): string {
  if (days === null || days === undefined || Number.isNaN(days)) return '—'
  if (days < 1) {
    const hours = Math.max(1, Math.round(days * 24))
    return `${hours} hr${hours === 1 ? '' : 's'}`
  }
  const rounded = Math.round(days * 10) / 10
  return `${rounded} day${rounded === 1 ? '' : 's'}`
}
