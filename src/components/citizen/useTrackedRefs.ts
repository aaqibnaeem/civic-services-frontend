import { useMemo } from 'react'

import { useTrackedStore, type TrackedRef } from '@/stores/trackedStore'

/**
 * Newest-first list of the reference codes stored in this browser.
 *
 * Do NOT call `useTrackedStore(selectTrackedRefs)` directly: that selector
 * builds a new sorted array on every invocation, and Zustand v5 reads through
 * `useSyncExternalStore`, which compares snapshots by identity. A fresh array
 * each read means React never sees a stable snapshot and the page dies with
 * "Maximum update depth exceeded". Selecting the raw slice and sorting in a
 * `useMemo` keeps the snapshot stable.
 */
export function useTrackedRefs(): TrackedRef[] {
  const refs = useTrackedStore((s) => s.refs)
  return useMemo(
    () => [...refs].sort((a, b) => b.saved_at.localeCompare(a.saved_at)),
    [refs],
  )
}
