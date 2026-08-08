/**
 * Public shell: sticky header, full-bleed outlet, footer.
 *
 * `<main>` is deliberately NOT width-constrained — the landing page runs
 * edge-to-edge bands, and every other page opts into a measured column with
 * `<PageShell/>` from `@/components/citizen`. Pages render a `<PageHeader/>`
 * as their first child; they never render their own site header.
 */

import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  BookOpen,
  FileText,
  Landmark,
  ListChecks,
  LogIn,
  LogOut,
  Menu,
  Search,
  Shield,
  SlidersHorizontal,
} from 'lucide-react'

import { ThemeToggle } from '@/components/ThemeToggle'
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
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { useLogout } from '@/hooks/useAuth'
import { API_ROOT_URL } from '@/lib/api/client'
import { ROLE_META } from '@/lib/domain'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

const NAV = [
  { to: '/report', label: 'Report', icon: FileText },
  { to: '/track', label: 'Track', icon: Search },
  { to: '/my-reports', label: 'My reports', icon: ListChecks },
]

/**
 * The interactive API documentation. In dev the Vite proxy only forwards
 * `/api`, so link straight at the FastAPI host; in production the docs sit at
 * the API root.
 */
const API_DOCS_URL = import.meta.env.DEV ? 'http://localhost:8000/docs' : `${API_ROOT_URL}/docs`

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
              isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground',
            )
          }
        >
          <item.icon className="size-4" aria-hidden />
          {item.label}
        </NavLink>
      ))}
    </>
  )
}

function LogoMark() {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-civic">
      <Landmark className="size-4.5" aria-hidden strokeWidth={2.2} />
    </span>
  )
}

function initials(name: string, email: string): string {
  const source = name.trim() || email
  const parts = source.split(/[\s@._-]+/).filter(Boolean)
  return (parts[0]?.[0] ?? 'C').concat(parts[1]?.[0] ?? '').toUpperCase()
}

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const token = useAuthStore((s) => s.token)
  // Citizens sign out back onto the public site, not into a staff console.
  const logout = useLogout('/')
  const signedIn = Boolean(token && user)
  const isStaff = user?.role === 'staff' || user?.role === 'admin'

  // Close the mobile drawer whenever the route changes (back button included).
  useEffect(() => setMobileOpen(false), [location.pathname])

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <LogoMark />
            <span className="flex flex-col leading-none">
              <span className="text-sm font-semibold tracking-tight">Civic Services</span>
              <span className="hidden text-[0.6875rem] text-muted-foreground sm:block">
                AI-assisted complaint triage
              </span>
            </span>
          </Link>

          <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
            <NavItems />
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <Button asChild size="sm" className="hidden h-8 px-3 sm:inline-flex md:hidden lg:inline-flex">
              <Link to="/report">Report an issue</Link>
            </Button>

            <ThemeToggle />

            {signedIn ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Account menu">
                    <Avatar className="size-8">
                      <AvatarFallback className="text-xs font-semibold">
                        {initials(user?.full_name ?? '', user?.email ?? '')}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="truncate text-sm">
                      {user?.full_name || 'Signed in'}
                    </span>
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
                    <Link to="/my-reports">
                      <ListChecks className="size-4" aria-hidden />
                      My reports
                    </Link>
                  </DropdownMenuItem>
                  {isStaff ? (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <SlidersHorizontal className="size-4" aria-hidden />
                        Staff console
                      </Link>
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={logout} variant="destructive">
                    <LogOut className="size-4" aria-hidden />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                to="/signin"
                className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:inline-flex"
              >
                <LogIn className="size-3.5" aria-hidden />
                Sign in
              </Link>
            )}

            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                  <Menu className="size-5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 p-4">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="mt-6 flex items-center gap-2.5 px-1">
                  <LogoMark />
                  <span className="text-sm font-semibold tracking-tight">Civic Services</span>
                </div>
                <nav aria-label="Mobile" className="mt-6 flex flex-col gap-1">
                  <NavItems onNavigate={() => setMobileOpen(false)} />
                </nav>
                <div className="mt-4 space-y-2 border-t pt-4">
                  <Button asChild className="w-full">
                    <Link to="/report" onClick={() => setMobileOpen(false)}>
                      Report an issue
                    </Link>
                  </Button>

                  {signedIn ? (
                    <>
                      <div className="rounded-md border bg-muted/40 px-3 py-2">
                        <p className="truncate text-sm font-medium">
                          {user?.full_name || 'Signed in'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
                        {user?.role ? (
                          <p className="mt-1 text-[0.625rem] text-muted-foreground">
                            {ROLE_META[user.role].label}
                          </p>
                        ) : null}
                      </div>
                      {isStaff ? (
                        <Link
                          to="/admin"
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <SlidersHorizontal className="size-4" aria-hidden />
                          Staff console
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          setMobileOpen(false)
                          logout()
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <LogOut className="size-4" aria-hidden />
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/signin"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <LogIn className="size-4" aria-hidden />
                        Sign in
                      </Link>
                      <Link
                        to="/admin/login"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Shield className="size-4" aria-hidden />
                        Staff login
                      </Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
          <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
            <div className="max-w-sm space-y-3">
              <div className="flex items-center gap-2.5">
                <LogoMark />
                <span className="text-sm font-semibold tracking-tight">Civic Services</span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                A hackathon prototype for AI-assisted civic complaint triage in Karachi. Reports are
                stored for demonstration only and are not sent to any real department.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-8 text-sm sm:gap-12">
              <div className="space-y-2.5">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Citizens
                </p>
                <ul className="space-y-2">
                  {NAV.map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                  <li>
                    {signedIn ? (
                      <button
                        type="button"
                        onClick={logout}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Sign out
                      </button>
                    ) : (
                      <Link
                        to="/signin"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Sign in
                      </Link>
                    )}
                  </li>
                </ul>
              </div>

              <div className="space-y-2.5">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Project
                </p>
                <ul className="space-y-2">
                  <li>
                    <a
                      href={API_DOCS_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <BookOpen className="size-3.5" aria-hidden />
                      API docs
                    </a>
                  </li>
                  <li>
                    <Link
                      to="/admin/login"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Staff login
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <p className="mt-8 border-t pt-6 text-xs text-muted-foreground">
            AI Smart Civic Services — built for a hackathon. Every automated decision on this site is
            labelled with the tier that produced it.
          </p>
        </div>
      </footer>
    </div>
  )
}
