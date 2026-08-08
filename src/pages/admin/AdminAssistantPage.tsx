/**
 * `/admin/assistant` — ask the complaint database a question in English.
 *
 * The differentiator here is not the chat bubble; it is that every answer ships
 * with the numbers it was computed from (`used_stats`) and links to the exact
 * complaints it cited. A judge can check any claim in two clicks.
 */

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Eraser,
  LoaderCircle,
  MessageSquare,
  Send,
  Sparkles,
  TriangleAlert,
  User,
} from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { ReferenceCode } from '@/components/ReferenceCode'
import { AiSourceBadge } from '@/components/AiSourceBadge'
import { useAssistantChat } from '@/hooks'
import { AI_SOURCES, type AISource } from '@/lib/api/types'
import type { AssistantCitation, AssistantMessage } from '@/lib/api/types'
import { isApiError } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

import { UsedStatsPanel } from '@/components/admin/UsedStatsPanel'

const EXAMPLE_QUESTIONS = [
  'Which area has the most drainage complaints?',
  "What's our slowest department?",
  'How many critical complaints are still open?',
  'Show me the breakdown of complaints by category this month',
  'Which areas have the most unresolved water problems?',
  'How long does a pothole take to fix on average?',
]

interface Turn {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: AssistantCitation[]
  usedStats?: Record<string, unknown>
  source?: string
  failed?: boolean
}

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `turn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const isAiSource = (value: string | undefined): value is AISource =>
  Boolean(value) && (AI_SOURCES as readonly string[]).includes(value as string)

/* ========================================================================== */
/* Bubbles                                                                    */
/* ========================================================================== */

function UserBubble({ content }: { content: string }) {
  return (
    <li className="flex justify-end gap-3">
      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-primary-foreground">
        {content}
      </div>
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border bg-muted text-muted-foreground">
        <User className="size-4" aria-hidden />
      </span>
    </li>
  )
}

function AssistantBubble({ turn }: { turn: Turn }) {
  return (
    <li className="flex gap-3">
      <span
        className={cn(
          'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border',
          turn.failed
            ? 'border-destructive/30 bg-destructive/10 text-destructive'
            : 'border-primary/25 bg-primary/10 text-primary',
        )}
      >
        {turn.failed ? (
          <TriangleAlert className="size-4" aria-hidden />
        ) : (
          <Sparkles className="size-4" aria-hidden />
        )}
      </span>

      <div className="min-w-0 max-w-[85%] space-y-2.5">
        <div
          className={cn(
            'rounded-2xl rounded-bl-md border px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-pretty',
            turn.failed ? 'border-destructive/30 bg-destructive/5' : 'bg-card',
          )}
        >
          {turn.content}
        </div>

        {turn.citations && turn.citations.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Complaints this answer is based on
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {turn.citations.map((citation) => (
                <li key={citation.id || citation.reference_code}>
                  <Link
                    to={`/admin/complaints/${citation.id}`}
                    className="inline-flex items-center gap-1 rounded-md border bg-muted/50 px-1.5 py-1 transition-colors hover:border-primary/40 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <ReferenceCode code={citation.reference_code} size="sm" />
                    <ArrowUpRight className="size-3 text-muted-foreground" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {turn.usedStats && Object.keys(turn.usedStats).length > 0 ? (
          <UsedStatsPanel stats={turn.usedStats} source={turn.source} />
        ) : null}

        {isAiSource(turn.source) ? (
          <AiSourceBadge source={turn.source} size="sm" />
        ) : null}
      </div>
    </li>
  )
}

/* ========================================================================== */
/* Page                                                                       */
/* ========================================================================== */

export default function AdminAssistantPage() {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const chat = useAssistantChat()
  const listEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns, chat.isPending])

  const ask = (question: string) => {
    const message = question.trim()
    if (!message || chat.isPending) return

    const history: AssistantMessage[] = turns
      .filter((turn) => !turn.failed)
      .map((turn) => ({ role: turn.role, content: turn.content }))

    setTurns((current) => [...current, { id: uid(), role: 'user', content: message }])
    setDraft('')

    chat.mutate(
      { message, history },
      {
        onSuccess: (response) => {
          setTurns((current) => [
            ...current,
            {
              id: uid(),
              role: 'assistant',
              content: response.answer,
              citations: response.citations,
              usedStats: response.used_stats,
              source: response.source,
            },
          ])
        },
        onError: (error) => {
          setTurns((current) => [
            ...current,
            {
              id: uid(),
              role: 'assistant',
              failed: true,
              content: isApiError(error)
                ? error.toUserMessage()
                : 'The assistant could not answer that. Try rephrasing the question.',
            },
          ])
        },
      },
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Ask"
        title="AI assistant"
        description="Ask the complaint database a question in plain English. Every answer shows the numbers it was computed from and links to the complaints it cites — nothing here is a guess."
        actions={
          turns.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => setTurns([])}>
              <Eraser className="size-4" aria-hidden />
              New conversation
            </Button>
          ) : undefined
        }
      />

      <Card className="overflow-hidden">
        <CardContent className="flex min-h-[26rem] flex-col gap-5 p-4 sm:p-5">
          {turns.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 py-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl border bg-primary/10 text-primary">
                <MessageSquare className="size-6" aria-hidden strokeWidth={1.75} />
              </span>
              <div className="space-y-1.5">
                <h2 className="text-base font-semibold">
                  Ask about the complaints, not about the schema
                </h2>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-balance text-muted-foreground">
                  The assistant plans a query, runs it against the live database, and writes
                  the answer from the numbers that came back.
                </p>
              </div>
              <ul className="flex flex-wrap justify-center gap-2">
                {EXAMPLE_QUESTIONS.map((question) => (
                  <li key={question}>
                    <button
                      type="button"
                      onClick={() => ask(question)}
                      className="rounded-full border bg-card px-3 py-1.5 text-sm transition-colors hover:border-primary/40 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                      {question}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ul className="flex-1 space-y-5">
              {turns.map((turn) =>
                turn.role === 'user' ? (
                  <UserBubble key={turn.id} content={turn.content} />
                ) : (
                  <AssistantBubble key={turn.id} turn={turn} />
                ),
              )}

              {chat.isPending ? (
                <li className="flex gap-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary">
                    <Sparkles className="size-4" aria-hidden />
                  </span>
                  <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
                    <span className="flex gap-1" aria-hidden>
                      {[0, 1, 2].map((dot) => (
                        <span
                          key={dot}
                          className="size-1.5 animate-pulse rounded-full bg-muted-foreground/60"
                          style={{ animationDelay: `${dot * 160}ms` }}
                        />
                      ))}
                    </span>
                    Querying the complaint database…
                  </div>
                </li>
              ) : null}
              <div ref={listEndRef} />
            </ul>
          )}

          {/* --------------------------------------------------- Composer */}
          <form
            className="flex items-end gap-2 border-t pt-4"
            onSubmit={(event) => {
              event.preventDefault()
              ask(draft)
            }}
          >
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  ask(draft)
                }
              }}
              placeholder="Which area has the most drainage complaints?"
              aria-label="Ask a question"
              rows={2}
              maxLength={500}
              disabled={chat.isPending}
              className="min-h-16 resize-none"
            />
            <Button type="submit" size="icon-lg" disabled={!draft.trim() || chat.isPending}>
              {chat.isPending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              <span className="sr-only">Send</span>
            </Button>
          </form>

          {turns.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5">
              {EXAMPLE_QUESTIONS.slice(0, 3).map((question) => (
                <li key={question}>
                  <button
                    type="button"
                    onClick={() => ask(question)}
                    disabled={chat.isPending}
                    className="rounded-full border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
                  >
                    {question}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      <p className="text-xs leading-relaxed text-muted-foreground">
        The assistant never invents a figure: it derives a query plan from the question, runs
        it against the live complaint table, and writes the sentence from the returned
        aggregates. Open &ldquo;how this answer was computed&rdquo; on any reply to see the
        exact filters, the row count and the group-by breakdown behind it.
      </p>
    </div>
  )
}
