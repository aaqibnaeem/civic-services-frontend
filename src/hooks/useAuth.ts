/**
 * Auth hooks. The token lives in `authStore` (persisted); TanStack Query only
 * caches the `/auth/me` echo so a stale user object can be refreshed.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import type { ApiError } from '@/lib/api/client'
import * as endpoints from '@/lib/api/endpoints'
import { qk } from '@/lib/api/queryKeys'
import type { LoginRequest, TokenResponse, User } from '@/lib/api/types'
import { useAuthStore } from '@/stores/authStore'

/**
 * `POST /auth/login`. Writes the token + user into the auth store and navigates
 * to `redirectTo` (defaults to the triage inbox).
 */
export function useLogin(redirectTo = '/admin') {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setSession = useAuthStore((s) => s.login)

  return useMutation<TokenResponse, ApiError, LoginRequest>({
    mutationFn: (payload) => endpoints.login(payload),
    onSuccess: (data) => {
      setSession(data)
      queryClient.setQueryData(qk.auth.me(), data.user)
      toast.success(`Welcome back, ${data.user.full_name || data.user.email}`)
      navigate(redirectTo, { replace: true })
    },
    onError: (error) => {
      toast.error('Sign-in failed', {
        description: error.isUnauthorized
          ? 'That email and password combination was not recognised.'
          : error.toUserMessage(),
      })
    },
  })
}

/** `GET /auth/me`. Disabled until a token exists so it never 401s on purpose. */
export function useMe(enabled = true) {
  const token = useAuthStore((s) => s.token)
  const setUser = useAuthStore((s) => s.setUser)

  return useQuery<User, ApiError>({
    queryKey: qk.auth.me(),
    queryFn: async () => {
      const user = await endpoints.getMe()
      setUser(user)
      return user
    },
    enabled: enabled && Boolean(token),
    staleTime: 5 * 60_000,
    retry: 0,
  })
}

/** Clears the session, wipes the cache, and returns to the login screen. */
export function useLogout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const logout = useAuthStore((s) => s.logout)

  return () => {
    logout()
    queryClient.clear()
    navigate('/admin/login', { replace: true })
    toast.success('Signed out')
  }
}
