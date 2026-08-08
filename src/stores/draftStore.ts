/**
 * Draft store — the in-progress complaint form.
 *
 * Load-bearing: a citizen typing a 500-word complaint on a phone must not lose it
 * to an accidental refresh or a backgrounded tab. The /report page should call
 * `setField` on change and `clear()` only after a successful 201.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Category, ComplaintCreate } from '@/lib/api/types'

export const DRAFT_STORAGE_KEY = 'civic.draft'
const DRAFT_VERSION = 1

/** Mirrors `ComplaintCreate` but every field is present and string-friendly. */
export interface ComplaintDraft {
  description: string
  location_text: string
  area: string
  latitude: number | null
  longitude: number | null
  citizen_name: string
  citizen_phone: string
  citizen_email: string
  image_url: string
  category: Category | null
  consent: boolean
}

export const EMPTY_DRAFT: ComplaintDraft = {
  description: '',
  location_text: '',
  area: '',
  latitude: null,
  longitude: null,
  citizen_name: '',
  citizen_phone: '',
  citizen_email: '',
  image_url: '',
  category: null,
  consent: true,
}

interface PersistedDraft {
  draft: ComplaintDraft
  step: number
  updatedAt: number | null
}

interface DraftState extends PersistedDraft {
  setField: <K extends keyof ComplaintDraft>(key: K, value: ComplaintDraft[K]) => void
  patch: (values: Partial<ComplaintDraft>) => void
  setStep: (step: number) => void
  clear: () => void
  /** True when anything meaningful has been typed. Drives the "restore draft?" hint. */
  isDirty: () => boolean
  /** Draft → request body, trimming blanks to null as the API expects. */
  toPayload: () => ComplaintCreate
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export const useDraftStore = create<DraftState>()(
  persist(
    (set, get) => ({
      draft: { ...EMPTY_DRAFT },
      step: 0,
      updatedAt: null,

      setField: (key, value) =>
        set((s) => ({
          draft: { ...s.draft, [key]: value },
          updatedAt: Date.now(),
        })),

      patch: (values) =>
        set((s) => ({
          draft: { ...s.draft, ...values },
          updatedAt: Date.now(),
        })),

      setStep: (step) => set({ step }),

      clear: () => set({ draft: { ...EMPTY_DRAFT }, step: 0, updatedAt: null }),

      isDirty: () => {
        const { draft } = get()
        return (
          draft.description.trim().length > 0 ||
          draft.location_text.trim().length > 0 ||
          draft.citizen_name.trim().length > 0 ||
          draft.citizen_phone.trim().length > 0 ||
          draft.citizen_email.trim().length > 0 ||
          draft.image_url.trim().length > 0 ||
          draft.category !== null
        )
      },

      toPayload: () => {
        const { draft } = get()
        return {
          description: draft.description.trim(),
          location_text: draft.location_text.trim(),
          area: blankToNull(draft.area),
          latitude: draft.latitude,
          longitude: draft.longitude,
          citizen_name: blankToNull(draft.citizen_name),
          citizen_phone: blankToNull(draft.citizen_phone),
          // Required since CONTRACT §4b — the API creates the citizen's account
          // from it, so it is never trimmed away to null. The form refuses to
          // submit while it is empty.
          citizen_email: draft.citizen_email.trim(),
          image_url: blankToNull(draft.image_url),
          category: draft.category,
          consent: draft.consent,
        }
      },
    }),
    {
      name: DRAFT_STORAGE_KEY,
      version: DRAFT_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): PersistedDraft => ({
        draft: s.draft,
        step: s.step,
        updatedAt: s.updatedAt,
      }),
      migrate: (persisted, version): PersistedDraft => {
        if (version < 1) {
          // v0 persisted the fields flat at the top level.
          const legacy = (persisted ?? {}) as Partial<ComplaintDraft>
          return {
            draft: { ...EMPTY_DRAFT, ...legacy },
            step: 0,
            updatedAt: null,
          }
        }
        const next = persisted as PersistedDraft
        // Guarantee new fields exist after a schema addition.
        return { ...next, draft: { ...EMPTY_DRAFT, ...next?.draft } }
      },
    },
  ),
)
