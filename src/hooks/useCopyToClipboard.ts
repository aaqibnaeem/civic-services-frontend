import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

/**
 * Copies text and reports a short-lived `copied` flag for the button's tick
 * animation. Used for reference codes, which citizens need to keep.
 */
export function useCopyToClipboard(resetAfterMs = 1800) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = useCallback(
    async (text: string, successMessage?: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        if (successMessage) toast.success(successMessage)
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(() => setCopied(false), resetAfterMs)
        return true
      } catch {
        toast.error('Could not copy', { description: 'Copy it manually instead.' })
        return false
      }
    },
    [resetAfterMs],
  )

  return { copied, copy }
}
