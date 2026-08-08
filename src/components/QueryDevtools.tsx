import { lazy, Suspense } from 'react'

/**
 * TanStack Query devtools, dev-only.
 *
 * Lazy + `import.meta.env.DEV` guarded so the devtools bundle is never pulled
 * into the production build.
 */
const Devtools = lazy(() =>
  import('@tanstack/react-query-devtools').then((module) => ({
    default: module.ReactQueryDevtools,
  })),
)

export function QueryDevtools() {
  if (!import.meta.env.DEV) return null
  return (
    <Suspense fallback={null}>
      <Devtools initialIsOpen={false} buttonPosition="bottom-left" />
    </Suspense>
  )
}

export default QueryDevtools
