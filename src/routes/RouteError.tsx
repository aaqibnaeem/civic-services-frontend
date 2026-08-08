/**
 * Route-level error boundary. Attached as `errorElement` on the root route, so
 * a render crash or a thrown loader error shows this instead of a white screen.
 */

import { Link, isRouteErrorResponse, useNavigate, useRouteError } from 'react-router-dom'
import { House, RefreshCw } from 'lucide-react'

import { ApiError } from '@/lib/api/client'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/ErrorState'

export function RouteError() {
  const error = useRouteError()
  const navigate = useNavigate()

  const isNotFound = isRouteErrorResponse(error) && error.status === 404

  const title = isNotFound
    ? 'Page not found'
    : isRouteErrorResponse(error)
      ? `${error.status} ${error.statusText}`
      : undefined

  const description = isNotFound
    ? 'That address does not match any page in this application.'
    : error instanceof ApiError
      ? error.toUserMessage()
      : error instanceof Error
        ? error.message
        : undefined

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-center justify-center p-6">
      <ErrorState
        error={error}
        title={title}
        description={description}
        onRetry={() => navigate(0)}
        retryLabel="Reload page"
        action={
          <Button asChild variant="default" size="sm">
            <Link to="/">
              <House className="size-4" aria-hidden />
              Back to home
            </Link>
          </Button>
        }
        className="w-full"
      />
      <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
        <RefreshCw className="size-3" aria-hidden />
        If this keeps happening, check that the API is running on port 8000.
      </p>
    </div>
  )
}

export default RouteError
