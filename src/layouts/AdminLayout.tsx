/**
 * Admin shell: collapsible sidebar (desktop) + sheet drawer (mobile) + topbar.
 *
 * Sidebar collapse and table density live in `uiStore` and persist across
 * sessions. The topbar carries global search (⌘K) and the AI-tier health
 * indicator, so staff always know which analyzer is actually answering — the
 * contract forbids implying a better tier than the one that ran.
 */

import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Building2,
  ChartNoAxesCombined,
  Inbox,
  Landmark,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeft,
  Rows3,
  ExternalLink,
} from 'lucide-react'

import { ThemeToggle } from '@/components/ThemeToggle'
import { GlobalSearch } from '@/components/admin/GlobalSearch'
import { useAiHealth } from '@/hooks/useAi'
import { useLogout } from '@/hooks/useAuth'
import { AI_SOURCE_META, ROLE_META } from '@/lib/domain'
import { RoleBadge } from '@/components/admin/RoleBadge'
import type { AISource, AiHealthResponse } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useUiStore } from '@/stores/uiStore'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const NAV = [
  { to: '/admin', label: 'Triage inbox', icon: Inbox, end: true },
  { to: '/admin/analytics', label: 'Analytics', icon: ChartNoAxesCombined },
  { to: '/admin/assistant', label: 'AI assistant', icon: MessageSquare },
  { to: '/admin/departments', label: 'Departments', icon: Building2 },
]

function initials(name: string, email: string): string {
  const source = name.trim() || email
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  return (parts[0]?.[0] ?? 'A').concat(parts[1]?.[0] ?? '').toUpperCase()
}

/** The highest tier currently available — the one an analysis would actually use. */
function activeTier(health: AiHealthResponse): AISource | null {
  if (health.llm_available) return 'llm'
  if (health.ml_model_loaded) return 'ml'
  if (health.rules_available) return 'rules'
  return null
}

/**
 * A compact `AiSourceBadge`-shaped health indicator: which tier is live right
 * now, plus the full fallback chain on hover.
 */
function AiHealthIndicator() {
  const { data, isPending, isError } = useAiHealth({ refetchIntervalMs: 60_000 })

  if (isPending) {
    return (
      <span className="hidden h-7 w-24 animate-pulse rounded-full border bg-muted/50 sm:block" />
    )
  }

  if (isError || !data) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="hidden items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[0.6875rem] font-medium text-destructive sm:flex">
            <span className="size-1.5 rounded-full bg-destructive" aria-hidden />
            AI status unknown
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <code>/ai/health</code> did not respond. Complaint data is unaffected — analysis
          may be running on a lower tier.
        </TooltipContent>
      </Tooltip>
    )
  }

  const tier = activeTier(data)
  const meta = tier ? AI_SOURCE_META[tier] : null
  const tiers = [
    { key: 'llm' as const, live: data.llm_available },
    { key: 'ml' as const, live: data.ml_model_loaded },
    { key: 'rules' as const, live: data.rules_available },
  ]

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'hidden cursor-help items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.6875rem] font-medium sm:flex',
            meta ? meta.badgeClass : 'border-destructive/30 bg-destructive/10 text-destructive',
          )}
        >
          {meta ? (
            <meta.icon className="size-3" aria-hidden strokeWidth={2.25} />
          ) : (
            <span className="size-1.5 rounded-full bg-destructive" aria-hidden />
          )}
          {meta ? `Tier ${meta.tier} · ${meta.label}` : 'No analyzer available'}
        </span>
      </TooltipTrigger>
      <TooltipContent className="block max-w-xs space-y-2 py-2">
        <span className="block font-semibold">
          {meta ? `${meta.label} is answering right now` : 'Every analyzer tier is down'}
        </span>
        <span className="block leading-relaxed opacity-90">
          {meta
            ? meta.tooltip
            : 'New complaints are still stored safely; they will be enriched once a tier returns.'}
        </span>
        <span className="block space-y-0.5 border-t border-current/15 pt-1.5">
          {tiers.map((entry) => (
            <span key={entry.key} className="flex items-center gap-1.5">
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  entry.live ? 'bg-current' : 'bg-current/30',
                )}
                aria-hidden
              />
              <span className={cn('text-xs', !entry.live && 'line-through opacity-60')}>
                Tier {AI_SOURCE_META[entry.key].tier} · {AI_SOURCE_META[entry.key].label}
              </span>
            </span>
          ))}
        </span>
        {data.model_name ? (
          <span className="block font-mono text-[0.6875rem] opacity-70">
            {data.model_name}
          </span>
        ) : null}
        {data.last_error ? (
          <span className="block text-[0.6875rem] opacity-70">
            Last error: {data.last_error}
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  )
}

function SidebarNav({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean
  onNavigate?: () => void
}) {
  return (
    <nav className="flex flex-col gap-1 px-2">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          title={collapsed ? item.label : undefined}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              'focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground/70',
              collapsed && 'justify-center px-0',
            )
          }
        >
          <item.icon className="size-4.5 shrink-0" aria-hidden />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const collapsed = useUiStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUiStore((s) => s.toggleSidebar)
  const density = useUiStore((s) => s.density)
  const setDensity = useUiStore((s) => s.setDensity)
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()
  // Staff and admin share every screen but not every permission, so the shell is
  // colour-coded by role rather than looking identical for both accounts.
  const roleMeta = user?.role ? ROLE_META[user.role] : null

  const current = NAV.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  )
  const pageTitle = location.pathname.startsWith('/admin/complaints/')
    ? 'Complaint'
    : (current?.label ?? 'Admin')

  return (
    <div className="flex min-h-dvh bg-background" data-density={density}>
      {/* --------------------------------------------------- Desktop sidebar */}
      <aside
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 flex-col border-r bg-sidebar transition-[width] duration-200 lg:flex',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div
          className={cn(
            'flex h-16 items-center gap-2.5 px-4',
            collapsed && 'justify-center px-0',
          )}
        >
          <Link
            to="/"
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none',
              roleMeta?.accentClass ?? 'bg-sidebar-primary text-sidebar-primary-foreground',
            )}
            aria-label="Civic Services home"
          >
            <Landmark className="size-4.5" aria-hidden strokeWidth={2.2} />
          </Link>
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-none">
              <span className="truncate text-sm font-semibold">
                {roleMeta?.console ?? 'Civic Console'}
              </span>
              <span className="truncate text-[0.6875rem] text-muted-foreground">
                {user?.role === 'staff' ? 'Triage & analytics' : 'Full access'}
              </span>
            </div>
          )}
        </div>

        <Separator />
        <div className="flex-1 overflow-y-auto py-3">
          <SidebarNav collapsed={collapsed} />
        </div>

        <Separator />
        <div className={cn('p-2', collapsed && 'flex justify-center')}>
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            onClick={toggleSidebar}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            className={cn(!collapsed && 'w-full justify-start')}
          >
            <PanelLeft className={cn('size-4', collapsed && 'rotate-180')} aria-hidden />
            {!collapsed && 'Collapse'}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ------------------------------------------------------------ Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              <SheetTitle className="sr-only">Admin navigation</SheetTitle>
              <div className="flex h-16 items-center gap-2.5 px-4">
                <span
                  className={cn(
                    'flex size-9 items-center justify-center rounded-lg',
                    roleMeta?.accentClass ?? 'bg-sidebar-primary text-sidebar-primary-foreground',
                  )}
                >
                  <Landmark className="size-4.5" aria-hidden />
                </span>
                <span className="text-sm font-semibold">{roleMeta?.console ?? 'Civic Console'}</span>
              </div>
              <Separator />
              <div className="py-3">
                <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <h2 className="hidden truncate text-sm font-semibold md:block">{pageTitle}</h2>

          <div className="ml-auto flex items-center gap-2">
            {user?.role ? <RoleBadge role={user.role} className="hidden sm:inline-flex" /> : null}
            <GlobalSearch />
            <AiHealthIndicator />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Toggle table density"
                  aria-pressed={density === 'compact'}
                  onClick={() =>
                    setDensity(density === 'compact' ? 'comfortable' : 'compact')
                  }
                >
                  <Rows3 className="size-4.5" aria-hidden />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {density === 'compact' ? 'Comfortable rows' : 'Compact rows'}
              </TooltipContent>
            </Tooltip>

            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Account menu">
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs font-semibold">
                      {initials(user?.full_name ?? '', user?.email ?? 'admin')}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="truncate text-sm">{user?.full_name || 'Signed in'}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">
                    {user?.email}
                  </span>
                  {user?.role ? (
                    <span className="mt-1 w-fit rounded-full border bg-muted/60 px-1.5 py-px text-[0.625rem] font-normal text-muted-foreground">
                      {ROLE_META[user.role].label}
                    </span>
                  ) : null}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/">
                    <ExternalLink className="size-4" aria-hidden />
                    View public site
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={logout} variant="destructive">
                  <LogOut className="size-4" aria-hidden />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
