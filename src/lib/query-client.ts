/**
 * The app's single QueryClient.
 *
 * Defaults chosen for a demo/hackathon workload:
 *  - staleTime 30s      → tab-switching does not hammer the API
 *  - retry 1            → one retry for flaky networks, but never retry a 4xx
 *  - no refetchOnWindowFocus → the admin inbox must not reshuffle under the cursor
 *
 * Mutations surface their own toasts; the global handlers here only catch the
 * cases a component forgot about, so nothing ever fails silently.
 */

import { QueryClient, MutationCache, QueryCache } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api/client'

/** 4xx (except 408/429) are the caller's fault — retrying just wastes time. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false
  if (error instanceof ApiError) {
    if (error.isNetworkError) return true
    if (error.status >= 400 && error.status < 500) {
      return error.status === 408 || error.status === 429
    }
  }
  return true
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8_000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: false,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => {
        // Only shout about background refetch failures when we already had data
        // on screen — an initial load error is rendered by <ErrorState/>.
        if (query.state.data === undefined) return
        if (error instanceof ApiError && error.isUnauthorized) return
        toast.error('Could not refresh data', {
          description:
            error instanceof ApiError ? error.toUserMessage() : 'Please try again.',
        })
      },
    }),
    mutationCache: new MutationCache({
      onError: (error, _vars, _ctx, mutation) => {
        // A mutation with its own onError owns the messaging.
        if (mutation.options.onError) return
        if (error instanceof ApiError && error.isUnauthorized) return
        toast.error('Action failed', {
          description:
            error instanceof ApiError ? error.toUserMessage() : 'Please try again.',
        })
      },
    }),
  })
}

export const queryClient = createQueryClient()
