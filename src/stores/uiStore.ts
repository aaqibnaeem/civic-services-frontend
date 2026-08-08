/**
 * UI store — theme, table density, saved admin filter views, sidebar state.
 *
 * The theme is applied to <html class="dark"> by `applyTheme`, which is called
 * once at bootstrap (main.tsx) and again on every change. `system` follows the OS
 * and re-evaluates when the OS preference flips.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { ComplaintFilters } from '@/lib/api/types'

export const UI_STORAGE_KEY = 'civic.ui'
const UI_VERSION = 1

export type Theme = 'light' | 'dark' | 'system'
export type Density = 'comfortable' | 'compact'

export interface SavedView {
  id: string
  name: string
  filters: ComplaintFilters
  created_at: string
}

interface PersistedUi {
  theme: Theme
  density: Density
  sidebarCollapsed: boolean
  savedViews: SavedView[]
}

interface UiState extends PersistedUi {
  /** Resolved theme actually on the document — never `system`. */
  resolvedTheme: 'light' | 'dark'

  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  setDensity: (density: Density) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  saveView: (name: string, filters: ComplaintFilters) => SavedView
  removeView: (id: string) => void
  renameView: (id: string, name: string) => void
}

/* ------------------------------ theme plumbing ---------------------------- */

const prefersDark = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? (prefersDark() ? 'dark' : 'light') : theme
}

/** Writes the theme onto <html>. Safe to call repeatedly. */
export function applyTheme(theme: Theme): 'light' | 'dark' {
  const resolved = resolveTheme(theme)
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    root.classList.toggle('dark', resolved === 'dark')
    root.style.colorScheme = resolved
  }
  return resolved
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `view_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

/* --------------------------------- store ---------------------------------- */

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',
      density: 'comfortable',
      sidebarCollapsed: false,
      savedViews: [],

      setTheme: (theme) => set({ theme, resolvedTheme: applyTheme(theme) }),

      toggleTheme: () => {
        // Toggling from `system` picks the opposite of what is on screen.
        const next: Theme = get().resolvedTheme === 'dark' ? 'light' : 'dark'
        set({ theme: next, resolvedTheme: applyTheme(next) })
      },

      setDensity: (density) => set({ density }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),

      saveView: (name, filters) => {
        const view: SavedView = {
          id: uid(),
          name: name.trim() || 'Untitled view',
          filters,
          created_at: new Date().toISOString(),
        }
        set((s) => ({ savedViews: [view, ...s.savedViews].slice(0, 30) }))
        return view
      },

      removeView: (id) =>
        set((s) => ({ savedViews: s.savedViews.filter((v) => v.id !== id) })),

      renameView: (id, name) =>
        set((s) => ({
          savedViews: s.savedViews.map((v) =>
            v.id === id ? { ...v, name: name.trim() || v.name } : v,
          ),
        })),
    }),
    {
      name: UI_STORAGE_KEY,
      version: UI_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): PersistedUi => ({
        theme: s.theme,
        density: s.density,
        sidebarCollapsed: s.sidebarCollapsed,
        savedViews: s.savedViews,
      }),
      migrate: (persisted, version): PersistedUi => {
        if (version < 1) {
          const legacy = (persisted ?? {}) as { darkMode?: boolean }
          return {
            theme: legacy.darkMode ? 'dark' : 'system',
            density: 'comfortable',
            sidebarCollapsed: false,
            savedViews: [],
          }
        }
        const next = (persisted ?? {}) as Partial<PersistedUi>
        return {
          theme: next.theme ?? 'system',
          density: next.density ?? 'comfortable',
          sidebarCollapsed: next.sidebarCollapsed ?? false,
          savedViews: next.savedViews ?? [],
        }
      },
      onRehydrateStorage: () => (state) => {
        if (state) state.resolvedTheme = applyTheme(state.theme)
      },
    },
  ),
)

/**
 * Call once from `main.tsx`. Paints the persisted theme and keeps `system` in
 * sync with the OS. Returns an unsubscribe function.
 */
export function initTheme(): () => void {
  const { theme } = useUiStore.getState()
  useUiStore.setState({ resolvedTheme: applyTheme(theme) })

  if (typeof window === 'undefined') return () => {}
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onChange = () => {
    if (useUiStore.getState().theme !== 'system') return
    useUiStore.setState({ resolvedTheme: applyTheme('system') })
  }
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
