/**
 * Route table. React Router v7 data router.
 *
 * RULES FOR PAGE AGENTS
 *  - Never put page logic in this file. Each route points at a module in
 *    `src/pages/` whose default export is the page component.
 *  - Every page module is lazy-loaded, so adding imports to a page does not
 *    grow the initial bundle.
 *  - To add a route: create `src/pages/YourPage.tsx` with a default export, then
 *    add one `lazy` entry below.
 */

import { createBrowserRouter, type RouteObject } from 'react-router-dom'

import PublicLayout from '@/layouts/PublicLayout'
import AdminLayout from '@/layouts/AdminLayout'
import { ProtectedRoute } from './ProtectedRoute'
import { RouteError } from './RouteError'
import { RouteFallback } from './RouteFallback'

/** `lazy(() => import('@/pages/X'))` for a module whose default export is the page. */
const lazyPage = (loader: () => Promise<{ default: React.ComponentType }>) => async () => {
  const module = await loader()
  return { Component: module.default }
}

const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    errorElement: <RouteError />,
    HydrateFallback: RouteFallback,
    children: [
      { index: true, lazy: lazyPage(() => import('@/pages/LandingPage')) },
      { path: 'report', lazy: lazyPage(() => import('@/pages/ReportPage')) },
      { path: 'track', lazy: lazyPage(() => import('@/pages/TrackPage')) },
      {
        path: 'track/:referenceCode',
        lazy: lazyPage(() => import('@/pages/TrackDetailPage')),
      },
      { path: 'my-reports', lazy: lazyPage(() => import('@/pages/MyReportsPage')) },
    ],
  },

  // Login sits outside the admin shell — it has no sidebar and no auth guard.
  {
    path: '/admin/login',
    errorElement: <RouteError />,
    HydrateFallback: RouteFallback,
    lazy: lazyPage(() => import('@/pages/admin/AdminLoginPage')),
  },

  {
    path: '/admin',
    element: (
      <ProtectedRoute requireRole="staff">
        <AdminLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteError />,
    HydrateFallback: RouteFallback,
    children: [
      { index: true, lazy: lazyPage(() => import('@/pages/admin/AdminInboxPage')) },
      {
        path: 'complaints/:id',
        lazy: lazyPage(() => import('@/pages/admin/AdminComplaintDetailPage')),
      },
      { path: 'analytics', lazy: lazyPage(() => import('@/pages/admin/AdminAnalyticsPage')) },
      { path: 'assistant', lazy: lazyPage(() => import('@/pages/admin/AdminAssistantPage')) },
      {
        path: 'departments',
        lazy: lazyPage(() => import('@/pages/admin/AdminDepartmentsPage')),
      },
    ],
  },

  {
    path: '*',
    errorElement: <RouteError />,
    HydrateFallback: RouteFallback,
    lazy: lazyPage(() => import('@/pages/NotFoundPage')),
  },
]

export const router = createBrowserRouter(routes)
export default router
