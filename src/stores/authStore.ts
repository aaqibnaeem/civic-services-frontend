/**
 * Auth store — JWT + user, persisted so an admin survives a refresh.
 *
 * Only `token` and `user` are persisted (see `partialize`); transient flags stay
 * in memory. `client.ts` reads `getState().token` directly, so this module must
 * never import from `@/lib/api/client` (circular import).
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Role, TokenResponse, User } from '@/lib/api/types'

export const AUTH_STORAGE_KEY = 'civic.auth'
const AUTH_VERSION = 1

interface PersistedAuth {
  token: string | null
  user: User | null
}

interface AuthState extends PersistedAuth {
  /** True once localStorage has been read. Guards ProtectedRoute against a flash. */
  hydrated: boolean

  login: (payload: TokenResponse) => void
  setUser: (user: User) => void
  /** Clear the session without navigating. Called by the 401 interceptor. */
  clear: () => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,

      login: ({ access_token, user }) => set({ token: access_token, user }),
      setUser: (user) => set({ user }),
      clear: () => set({ token: null, user: null }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: AUTH_STORAGE_KEY,
      version: AUTH_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): PersistedAuth => ({ token: state.token, user: state.user }),
      migrate: (persisted, version): PersistedAuth => {
        // v0 stored the raw JWT under `jwt`. Upgrade it in place instead of
        // logging the user out.
        if (version < 1) {
          const legacy = persisted as { jwt?: string; user?: User } | null
          return { token: legacy?.jwt ?? null, user: legacy?.user ?? null }
        }
        return persisted as PersistedAuth
      },
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true
      },
    },
  ),
)

// Storage is synchronous, so hydration is done by the time this module finishes
// evaluating. Flip the flag defensively for both orderings.
if (useAuthStore.persist.hasHydrated()) {
  useAuthStore.setState({ hydrated: true })
} else {
  useAuthStore.persist.onFinishHydration(() => {
    useAuthStore.setState({ hydrated: true })
  })
}

/* ------------------------------- selectors ------------------------------- */

export const selectIsAuthenticated = (s: AuthState) => Boolean(s.token)
export const selectUser = (s: AuthState) => s.user
export const selectRole = (s: AuthState): Role | null => s.user?.role ?? null

/** `hasRole(user, 'staff')` — admins implicitly satisfy `staff` checks. */
export function hasRole(user: User | null, ...roles: Role[]): boolean {
  if (!user) return false
  if (roles.includes(user.role)) return true
  return user.role === 'admin' && roles.includes('staff')
}
