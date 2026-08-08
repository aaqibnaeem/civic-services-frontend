/**
 * AI hooks: the synchronous analyse-preview call, tier health, the stored model
 * evaluation report, and the analytics assistant.
 */

import { useMutation, useQuery } from '@tanstack/react-query'

import type { ApiError } from '@/lib/api/client'
import * as endpoints from '@/lib/api/endpoints'
import { qk } from '@/lib/api/queryKeys'
import type {
  AIAnalysis,
  AiEvaluationResponse,
  AiHealthResponse,
  AnalyzePreviewRequest,
  AssistantChatRequest,
  AssistantChatResponse,
  HealthResponse,
} from '@/lib/api/types'

/**
 * CONTRACT §5.2 — the ONE synchronous AI call, used on the submit screen so the
 * citizen literally watches the AI work. Server timeout is 25s and it falls back
 * down the tiers, so a failure here means all three tiers failed.
 *
 * Exposed as a mutation (not a query) because it is user-triggered and must not
 * be cached or refetched.
 */
export function useAnalyzePreview() {
  return useMutation<AIAnalysis, ApiError, AnalyzePreviewRequest>({
    mutationFn: (payload) => endpoints.analyzePreview(payload),
    // Never blocks submission: the caller shows a soft warning and lets the
    // citizen continue if this fails.
    retry: false,
  })
}

/** `GET /ai/health` — which analyzer tiers are currently available. */
export function useAiHealth(options?: { refetchIntervalMs?: number }) {
  return useQuery<AiHealthResponse, ApiError>({
    queryKey: qk.ai.health(),
    queryFn: () => endpoints.getAiHealth(),
    staleTime: 30_000,
    refetchInterval: options?.refetchIntervalMs ?? false,
    retry: 0,
  })
}

/** `GET /ai/evaluation` — accuracy, macro-F1, per-class table, confusion matrix. */
export function useAiEvaluation() {
  return useQuery<AiEvaluationResponse, ApiError>({
    queryKey: qk.ai.evaluation(),
    queryFn: () => endpoints.getAiEvaluation(),
    // A static report — no reason to refetch during a session.
    staleTime: Infinity,
    retry: 0,
  })
}

/** `GET /health` (root path) — database + AI provider + version. */
export function useHealth() {
  return useQuery<HealthResponse, ApiError>({
    queryKey: qk.health(),
    queryFn: () => endpoints.getHealth(),
    staleTime: 60_000,
    retry: 0,
  })
}

/**
 * `POST /assistant/chat`. The page owns the transcript state and passes the
 * previous turns as `history` — keeping it out of the cache means a retry never
 * replays a stale conversation.
 */
export function useAssistantChat() {
  return useMutation<AssistantChatResponse, ApiError, AssistantChatRequest>({
    mutationFn: (payload) => endpoints.assistantChat(payload),
    retry: false,
  })
}
