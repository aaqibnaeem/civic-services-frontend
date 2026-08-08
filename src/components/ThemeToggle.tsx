import { Laptop, Moon, Sun } from 'lucide-react'

import { useUiStore, type Theme } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const OPTIONS: Array<{ value: Theme; label: string; icon: typeof Sun }> = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Laptop },
]

export interface ThemeToggleProps {
  /** `menu` offers light/dark/system; `switch` flips straight between light and dark. */
  variant?: 'menu' | 'switch'
  className?: string
}

/** Dark-mode control, backed by `uiStore` and persisted to localStorage. */
export function ThemeToggle({ variant = 'menu', className }: ThemeToggleProps) {
  const theme = useUiStore((s) => s.theme)
  const resolved = useUiStore((s) => s.resolvedTheme)
  const setTheme = useUiStore((s) => s.setTheme)
  const toggleTheme = useUiStore((s) => s.toggleTheme)

  const Icon = resolved === 'dark' ? Moon : Sun

  if (variant === 'switch') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={className}
            onClick={toggleTheme}
            aria-label={`Switch to ${resolved === 'dark' ? 'light' : 'dark'} mode`}
          >
            <Icon className="size-4.5" aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Switch to {resolved === 'dark' ? 'light' : 'dark'} mode
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={className} aria-label="Change theme">
          <Icon className="size-4.5" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => setTheme(option.value)}
            className={cn('gap-2', theme === option.value && 'bg-accent font-medium')}
          >
            <option.icon className="size-4" aria-hidden />
            {option.label}
            {theme === option.value ? (
              <span className="ml-auto size-1.5 rounded-full bg-primary" aria-hidden />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
