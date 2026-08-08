import { LoadingSkeleton } from '@/components/LoadingSkeleton'

/** Shown while a lazy route module is being fetched. */
export function RouteFallback() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="space-y-8">
        <LoadingSkeleton variant="text" count={2} className="max-w-md" />
        <LoadingSkeleton variant="stats" count={4} />
        <LoadingSkeleton variant="list" count={3} />
      </div>
    </div>
  )
}

export default RouteFallback
