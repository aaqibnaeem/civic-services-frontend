/**
 * App root: providers + router. Nothing else belongs here.
 *
 * Provider order matters — QueryClientProvider must wrap RouterProvider so route
 * modules can use hooks, and TooltipProvider must wrap everything that renders a
 * tooltip (which is most of our badges).
 */

import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'

import { queryClient } from '@/lib/query-client'
import { router } from '@/routes'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { QueryDevtools } from '@/components/QueryDevtools'

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <RouterProvider router={router} />
        <Toaster richColors closeButton position="top-right" />
      </TooltipProvider>
      <QueryDevtools />
    </QueryClientProvider>
  )
}
