import { Check, Copy } from 'lucide-react'

import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { formatReferenceCode } from '@/lib/domain'
import { cn } from '@/lib/utils'

export interface ReferenceCodeProps {
  code: string
  /** Renders a copy button. A reference code works without signing in. */
  copyable?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE: Record<NonNullable<ReferenceCodeProps['size']>, string> = {
  sm: 'text-[0.6875rem] px-1.5 py-0.5',
  md: 'text-xs px-2 py-1',
  lg: 'text-base px-3 py-1.5',
}

/** The public tracking handle, e.g. `CIV-8F3K2M`. Always monospaced and copyable. */
export function ReferenceCode({
  code,
  copyable = false,
  size = 'md',
  className,
}: ReferenceCodeProps) {
  const formatted = formatReferenceCode(code)
  const { copied, copy } = useCopyToClipboard()

  return (
    <span
      className={cn(
        'ref-code inline-flex items-center gap-1.5 rounded-md border bg-muted/60 text-foreground',
        SIZE[size],
        className,
      )}
    >
      {formatted}
      {copyable ? (
        <button
          type="button"
          onClick={() => void copy(formatted, 'Reference code copied')}
          aria-label="Copy reference code"
          className="-mr-0.5 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {copied ? (
            <Check className="size-3.5 text-success" aria-hidden />
          ) : (
            <Copy className="size-3.5" aria-hidden />
          )}
        </button>
      ) : null}
    </span>
  )
}
