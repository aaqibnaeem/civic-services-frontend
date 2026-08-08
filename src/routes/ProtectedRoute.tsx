/**
 * Auth gate for the admin section.
 *
 * Reads `authStore` only — it never calls the API, so a refresh with a valid
 * token renders instantly. If the token turns out to be dead, the 401 handler in
 * `client.ts` clears it and bounces here anyway.
 */

import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { hasRole, useAuthStore } from '@/stores/authStore'
import type { Role } from '@/lib/api/types'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { EmptyState } from '@/components/EmptyState'
import { ShieldAlert } from 'lucide-react'

export interface ProtectedRouteProps {
  /** Minimum role. Admins always pass a `staff` requirement. */
  requireRole?: Role
  /** Render children instead of an `<Outlet/>` when used as a wrapper. */
  children?: ReactNode
  redirectTo?: string
}

export function ProtectedRoute({
  requireRole,
  children,
  redirectTo = '/admin/login',
}: ProtectedRouteProps) {
  const location = useLocation()
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const hydrated = useAuthStore((s) => s.hydrated)

  // Avoid bouncing to /login for one frame before localStorage is read.
  if (!hydrated) {
    return (
      <div className="p-8">
        <LoadingSkeleton variant="stats" count={4} />
      </div>
    )
  }

  if (!token) {
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`${redirectTo}?next=${encodeURIComponent(next)}`} replace />
  }

  // A signed-in citizen has a perfectly good home; showing them a locked console
  // would be a dead end. Send them to it instead of an access-denied panel.
  if (requireRole && !hasRole(user, requireRole) && user?.role === 'citizen') {
    return <Navigate to="/my-reports" replace />
  }

  if (requireRole && !hasRole(user, requireRole)) {
    return (
      <div className="p-8">
        <EmptyState
          icon={ShieldAlert}
          title="You do not have access to this area"
          description={`This page needs the "${requireRole}" role. Ask an administrator to upgrade your account.`}
        />
      </div>
    )
  }

  return <>{children ?? <Outlet />}</>
}

export default ProtectedRoute
