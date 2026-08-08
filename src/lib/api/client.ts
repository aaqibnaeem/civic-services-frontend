/**
 * Typed fetch wrapper for the Civic Services API.
 *
 * Responsibilities (and nothing else):
 *  - resolve the base URL from `VITE_API_URL` (default `/api/v1`, which the Vite
 *    dev proxy forwards to http://localhost:8000)
 *  - inject `Authorization: Bearer <token>` from the auth store
 *  - normalise the backend error envelope `{error:{code,message,details,request_id}}`
 *    into a thrown `ApiError`
 *  - on 401: clear auth and bounce to the admin login screen
 *
 * It does NOT know about React, TanStack Query or any page.
 */

import { useAuthStore } from '@/stores/authStore'
import type {
  ApiErrorBody,
  ApiErrorCode,
  ApiErrorDetail,
  ApiErrorEnvelope,
} from './types'

/** Base URL for all `/api/v1` calls. Override per-environment with `VITE_API_URL`. */
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ?? '/api/v1'
).replace(/\/+$/, '')

/**
 * `GET /health` sits at the ROOT, not under `/api/v1` (CONTRACT §3). Derive it
 * by stripping the version segment so it works with both `/api/v1` and
 * `https://api.example.com/api/v1`.
 */
export const API_ROOT_URL = API_BASE_URL.replace(/\/api\/v\d+$/, '') || ''

export const LOGIN_PATH = '/admin/login'

/* -------------------------------------------------------------------------- */
/* ApiError                                                                    */
/* -------------------------------------------------------------------------- */

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode | (string & {})
  readonly details: ApiErrorDetail[]
  readonly requestId: string | null
  /** Raw parsed body, for debugging. */
  readonly body: unknown

  constructor(
    status: number,
    body: ApiErrorBody,
    options?: { raw?: unknown; cause?: unknown },
  ) {
    super(body.message)
    this.name = 'ApiError'
    this.status = status
    this.code = body.code
    this.details = body.details ?? []
    this.requestId = body.request_id || null
    this.body = options?.raw ?? body
    if (options?.cause !== undefined) this.cause = options.cause
  }

  /** True when the failure is a client-side/network problem, not an HTTP status. */
  get isNetworkError(): boolean {
    return this.status === 0
  }

  get isUnauthorized(): boolean {
    return this.status === 401 || this.code === 'unauthorized'
  }

  get isForbidden(): boolean {
    return this.status === 403 || this.code === 'forbidden'
  }

  get isNotFound(): boolean {
    return this.status === 404 || this.code === 'not_found'
  }

  get isValidation(): boolean {
    return this.status === 422 || this.code === 'validation_error'
  }

  get isAiUnavailable(): boolean {
    return this.status === 503 || this.code === 'ai_unavailable'
  }

  get isRateLimited(): boolean {
    return this.status === 429 || this.code === 'rate_limited'
  }

  /** `{ description: 'too short' }` — convenient for react-hook-form `setError`. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {}
    for (const d of this.details) {
      if (d?.field) out[d.field] = d.issue
    }
    return out
  }

  /** A short, always-safe sentence to show a user. */
  toUserMessage(): string {
    if (this.isNetworkError) {
      return 'Could not reach the server. Check your connection and try again.'
    }
    return this.message || 'Something went wrong. Please try again.'
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/* -------------------------------------------------------------------------- */
/* Query string                                                                */
/* -------------------------------------------------------------------------- */

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>

/**
 * Builds a query string. Arrays are repeated (`?status=open&status=assigned`),
 * which is what FastAPI's `Query(list[...])` expects. `null`/`undefined`/`''`
 * are dropped so callers can pass filter objects straight through.
 */
export function buildQuery(params?: Record<string, QueryValue>): string {
  if (!params) return ''
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === '') continue
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === null || item === undefined || item === '') continue
        search.append(key, String(item))
      }
    } else {
      search.append(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

/* -------------------------------------------------------------------------- */
/* Error normalisation                                                         */
/* -------------------------------------------------------------------------- */

const STATUS_FALLBACK_CODES: Record<number, ApiErrorCode> = {
  400: 'validation_error',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  409: 'conflict',
  422: 'validation_error',
  429: 'rate_limited',
  500: 'internal_error',
  503: 'ai_unavailable',
}

const STATUS_FALLBACK_MESSAGES: Record<number, string> = {
  400: 'The request was invalid.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to do that.',
  404: 'We could not find what you were looking for.',
  409: 'That conflicts with something that already exists.',
  422: 'Some of the information provided is not valid.',
  429: 'Too many requests. Please slow down and try again shortly.',
  500: 'The server hit an unexpected error. Please try again.',
  503: 'The AI service is temporarily unavailable.',
}

function hasErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof (value as ApiErrorEnvelope).error === 'object' &&
    (value as ApiErrorEnvelope).error !== null
  )
}

function normaliseError(status: number, raw: unknown): ApiError {
  if (hasErrorEnvelope(raw)) {
    const err = raw.error
    return new ApiError(
      status,
      {
        code: err.code ?? STATUS_FALLBACK_CODES[status] ?? 'internal_error',
        message:
          err.message ||
          STATUS_FALLBACK_MESSAGES[status] ||
          `Request failed (${status}).`,
        details: Array.isArray(err.details) ? err.details : [],
        request_id: err.request_id ?? '',
      },
      { raw },
    )
  }

  // FastAPI's own default shape, in case a handler slips past our middleware.
  let message = STATUS_FALLBACK_MESSAGES[status] ?? `Request failed (${status}).`
  if (typeof raw === 'object' && raw !== null && 'detail' in raw) {
    const detail = (raw as { detail: unknown }).detail
    if (typeof detail === 'string') message = detail
  } else if (typeof raw === 'string' && raw.trim()) {
    message = raw.trim().slice(0, 300)
  }

  return new ApiError(
    status,
    {
      code: STATUS_FALLBACK_CODES[status] ?? 'internal_error',
      message,
      details: [],
      request_id: '',
    },
    { raw },
  )
}

function networkError(cause: unknown): ApiError {
  return new ApiError(
    0,
    {
      code: 'internal_error',
      message: 'Could not reach the server. Check your connection and try again.',
      details: [],
      request_id: '',
    },
    { raw: cause, cause },
  )
}

/* -------------------------------------------------------------------------- */
/* 401 handling                                                                */
/* -------------------------------------------------------------------------- */

let redirectingToLogin = false

function handleUnauthorized() {
  const hadSession = Boolean(useAuthStore.getState().token)
  useAuthStore.getState().clear()

  if (typeof window === 'undefined' || !hadSession || redirectingToLogin) return
  if (window.location.pathname === LOGIN_PATH) return

  redirectingToLogin = true
  const next = encodeURIComponent(
    window.location.pathname + window.location.search,
  )
  window.location.assign(`${LOGIN_PATH}?next=${next}`)
}

/* -------------------------------------------------------------------------- */
/* request()                                                                   */
/* -------------------------------------------------------------------------- */

export interface RequestOptions extends Omit<RequestInit, 'body' | 'method'> {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  /** Serialised as JSON unless it is a `FormData`. */
  body?: unknown
  query?: Record<string, QueryValue>
  /** Send the bearer token. Default: true when a token exists. */
  auth?: boolean
  /** Hit the API root instead of `/api/v1` (only `/health` needs this). */
  root?: boolean
  /** Abort after N ms. Default 30_000; analyze-preview uses 30s per CONTRACT §5.2. */
  timeoutMs?: number
  signal?: AbortSignal
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    query,
    auth,
    root = false,
    timeoutMs = 30_000,
    signal,
    headers,
    ...rest
  } = options

  const base = root ? API_ROOT_URL : API_BASE_URL
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}${buildQuery(query)}`

  const finalHeaders = new Headers(headers)
  finalHeaders.set('Accept', 'application/json')

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !isFormData) {
    finalHeaders.set('Content-Type', 'application/json')
  }

  const token = useAuthStore.getState().token
  if (token && auth !== false) {
    finalHeaders.set('Authorization', `Bearer ${token}`)
  }

  // Compose the caller's signal with our timeout so both can abort the request.
  const timeoutSignal =
    timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined
  const composedSignal =
    signal && timeoutSignal
      ? AbortSignal.any([signal, timeoutSignal])
      : (signal ?? timeoutSignal)

  let response: Response
  try {
    response = await fetch(url, {
      ...rest,
      method,
      headers: finalHeaders,
      signal: composedSignal,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
    })
  } catch (cause) {
    // A caller-initiated abort must propagate so TanStack Query can ignore it.
    if (cause instanceof DOMException && cause.name === 'AbortError' && signal?.aborted) {
      throw cause
    }
    throw networkError(cause)
  }

  if (response.status === 204 || response.status === 205) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') ?? ''
  let payload: unknown = null
  if (contentType.includes('application/json')) {
    payload = await response.json().catch(() => null)
  } else {
    const text = await response.text().catch(() => '')
    payload = text || null
  }

  if (!response.ok) {
    const error = normaliseError(response.status, payload)
    if (error.status === 401) handleUnauthorized()
    throw error
  }

  // Every endpoint in this app returns JSON. A 2xx that isn't JSON means the
  // request never reached the API — most often because VITE_API_URL is unset in
  // production, so `/api/v1/...` resolves against the SPA's own origin and the
  // catch-all rewrite in vercel.json serves index.html with a 200. Returning that
  // HTML as if it were the payload is how a missing env var turns into
  // "Cannot read properties of undefined" three components deep.
  if (!contentType.includes('application/json')) {
    throw new ApiError(response.status, {
      code: 'invalid_response',
      message:
        `Expected JSON from the API but received "${contentType || 'no content-type'}". ` +
        `The request to ${response.url} did not reach the backend — check that ` +
        `VITE_API_URL points at the deployed API.`,
      details: [],
      request_id: '',
    }, { raw: payload })
  }

  return payload as T
}

/** Thin verb helpers. Every endpoint in `endpoints.ts` goes through these. */
export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
