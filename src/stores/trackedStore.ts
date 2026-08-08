/**
 * Tracked-complaints store — the reference codes THIS browser has submitted.
 *
 * Citizens do get an account now (CONTRACT §4b), but they get it *after* filing
 * and they may never sign in. Until they do, localStorage is the only way they
 * can find their complaints again, so this stays the signed-out /my-reports data
 * source. Treat it as genuinely load-bearing: never clear it as a side effect of
 * anything else — least of all of signing in.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Category, Complaint } from '@/lib/api/types'

export const TRACKED_STORAGE_KEY = 'civic.tracked'
const TRACKED_VERSION = 1
const MAX_TRACKED = 100

/** A local breadcrumb. The live complaint is always re-fetched by reference code. */
export interface TrackedRef {
  reference_code: string
  /** Server id when we have it — lets /my-reports deep-link without a lookup. */
  id: string | null
  title: string
  category: Category | null
  location_text: string
  /** ISO string, when this browser submitted or first tracked it. */
  saved_at: string
  /** Set by the user on /my-reports so a list of codes stays readable. */
  nickname: string | null
}

interface PersistedTracked {
  refs: TrackedRef[]
}

interface TrackedState extends PersistedTracked {
  /** Idempotent: adding an existing code refreshes its metadata, no duplicate. */
  add: (ref: Partial<TrackedRef> & { reference_code: string }) => void
  /** Convenience for the submit flow — derives metadata from the 201 response. */
  addFromComplaint: (complaint: Complaint) => void
  remove: (referenceCode: string) => void
  rename: (referenceCode: string, nickname: string | null) => void
  has: (referenceCode: string) => boolean
  clearAll: () => void
}

const normalise = (code: string) => code.trim().toUpperCase()

/** Newest first. Applied on write so `selectTrackedRefs` can be a stable identity. */
const sortNewestFirst = (refs: TrackedRef[]) =>
  [...refs].sort((a, b) => b.saved_at.localeCompare(a.saved_at))

export const useTrackedStore = create<TrackedState>()(
  persist(
    (set, get) => ({
      refs: [],

      add: (input) => {
        const reference_code = normalise(input.reference_code)
        if (!reference_code) return
        set((s) => {
          const existing = s.refs.find((r) => r.reference_code === reference_code)
          const merged: TrackedRef = {
            reference_code,
            id: input.id ?? existing?.id ?? null,
            title: input.title ?? existing?.title ?? '',
            category: input.category ?? existing?.category ?? null,
            location_text: input.location_text ?? existing?.location_text ?? '',
            saved_at: existing?.saved_at ?? input.saved_at ?? new Date().toISOString(),
            nickname: input.nickname ?? existing?.nickname ?? null,
          }
          const rest = s.refs.filter((r) => r.reference_code !== reference_code)
          return { refs: sortNewestFirst([merged, ...rest]).slice(0, MAX_TRACKED) }
        })
      },

      addFromComplaint: (complaint) => {
        get().add({
          reference_code: complaint.reference_code,
          id: complaint.id,
          title: complaint.title,
          category: complaint.category,
          location_text: complaint.location_text,
          saved_at: complaint.created_at,
        })
      },

      remove: (referenceCode) => {
        const code = normalise(referenceCode)
        set((s) => ({ refs: s.refs.filter((r) => r.reference_code !== code) }))
      },

      rename: (referenceCode, nickname) => {
        const code = normalise(referenceCode)
        set((s) => ({
          refs: s.refs.map((r) =>
            r.reference_code === code ? { ...r, nickname: nickname || null } : r,
          ),
        }))
      },

      has: (referenceCode) =>
        get().refs.some((r) => r.reference_code === normalise(referenceCode)),

      clearAll: () => set({ refs: [] }),
    }),
    {
      name: TRACKED_STORAGE_KEY,
      version: TRACKED_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): PersistedTracked => ({ refs: s.refs }),
      migrate: (persisted, version): PersistedTracked => {
        if (version < 1) {
          // v0 stored a plain `string[]` of reference codes.
          const legacy = persisted as { codes?: string[] } | string[] | null
          const codes = Array.isArray(legacy) ? legacy : (legacy?.codes ?? [])
          return {
            refs: codes.map((code) => ({
              reference_code: normalise(String(code)),
              id: null,
              title: '',
              category: null,
              location_text: '',
              saved_at: new Date().toISOString(),
              nickname: null,
            })),
          }
        }
        // Sort on the way in: order is a write-time invariant now, and data
        // persisted before that was true would otherwise stay unsorted forever.
        const stored = (persisted as PersistedTracked) ?? { refs: [] }
        return { refs: sortNewestFirst(stored.refs ?? []) }
      },
    },
  ),
)

/** Sorted newest-first.
 *
 * Returns the stored array by identity rather than sorting here. A selector that
 * built a new array on every call would return a fresh reference each render, and
 * zustand v5 compares with `Object.is` — so the component would re-render forever.
 * The order is maintained on write instead; see {@link sortNewestFirst}.
 */
export const selectTrackedRefs = (s: TrackedState) => s.refs
