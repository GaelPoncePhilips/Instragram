/**
 * Cliente API único. Token Bearer persistido en localStorage, manejo de 401.
 * VITE_USE_MOCK=true → responde el backend simulado (src/mocks); false → fetch a VITE_API_URL.
 * Las piezas TEMPORAL usan `temporalRequest`, que responde desde el mock aunque VITE_USE_MOCK=false.
 */
import { env } from '../config/env'
import type { ApiErrorBody } from '../types/api'

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
export type QueryValue = string | number | boolean | null | undefined
export type Query = Record<string, QueryValue>

export class ApiError extends Error implements ApiErrorBody {
  status: number
  error: string
  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.status = status
    this.error = body.error
  }
}

const TOKEN_KEY = 'ronda.token'

let token: string | null = (() => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
})()

const unauthorizedListeners = new Set<() => void>()

export const auth = {
  getToken: (): string | null => token,
  setToken(t: string | null): void {
    token = t
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      /* almacenamiento no disponible */
    }
  },
  /** Se dispara con cualquier 401 (token vencido o inválido). */
  onUnauthorized(fn: () => void): () => void {
    unauthorizedListeners.add(fn)
    return () => unauthorizedListeners.delete(fn)
  },
}

function buildPath(path: string, query?: Query): string {
  if (!query) return path
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  const s = qs.toString()
  return s ? `${path}?${s}` : path
}

function isErrorBody(x: unknown): x is ApiErrorBody {
  return typeof x === 'object' && x !== null && 'message' in x && typeof (x as ApiErrorBody).message === 'string'
}

function toApiError(status: number, data: unknown): ApiError {
  if (isErrorBody(data)) return new ApiError(status, { error: data.error ?? 'Error', message: data.message })
  // FastAPI devuelve {"detail": ...} en errores de validación (422).
  if (typeof data === 'object' && data !== null && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail
    const message = typeof detail === 'string' ? detail : 'Datos inválidos'
    return new ApiError(status, { error: 'ValidationError', message })
  }
  return new ApiError(status, { error: 'HttpError', message: `Error ${status}` })
}

/**
 * TEMPORAL — con backend real, el mock no reconoce el JWT: las piezas temporales se identifican
 * en el mock con el username del usuario real (o el primer usuario del seed si no existe).
 */
let temporalUsername: string | null = null
export function setTemporalIdentity(username: string | null): void {
  temporalUsername = username
}

async function viaMock<T>(method: HttpMethod, fullPath: string, body: unknown): Promise<T> {
  const { handleMock, tokenParaUsername } = await import('../mocks/server')
  const mockToken = env.useMock ? token : tokenParaUsername(temporalUsername)
  const res = await handleMock(method, fullPath, body, mockToken)
  if (res.status >= 400) throw toApiError(res.status, res.data)
  return res.data as T
}

async function viaFetch<T>(method: HttpMethod, fullPath: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  let res: Response
  try {
    res = await fetch(`${env.apiUrl}${fullPath}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, { error: 'NetworkError', message: 'No se pudo conectar con el servidor' })
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  const data: unknown = text ? JSON.parse(text) : null
  if (!res.ok) throw toApiError(res.status, data)
  return data as T
}

async function send<T>(useMock: boolean, method: HttpMethod, path: string, opts: { query?: Query; body?: unknown }): Promise<T> {
  const full = buildPath(path, opts.query)
  try {
    return useMock ? await viaMock<T>(method, full, opts.body) : await viaFetch<T>(method, full, opts.body)
  } catch (e) {
    const esMockTemporal = useMock && !env.useMock
    if (e instanceof ApiError && e.status === 401 && !esMockTemporal && !path.startsWith('/auth/login')) {
      for (const fn of unauthorizedListeners) fn()
    }
    throw e
  }
}

export function request<T>(method: HttpMethod, path: string, opts: { query?: Query; body?: unknown } = {}): Promise<T> {
  return send<T>(env.useMock, method, path, opts)
}

/**
 * TEMPORAL — para endpoints que el backend todavía no tiene.
 * Si el flag está activo responde el mock aunque VITE_USE_MOCK=false; si no, va al backend real.
 */
export function temporalRequest<T>(
  flag: boolean,
  method: HttpMethod,
  path: string,
  opts: { query?: Query; body?: unknown } = {},
): Promise<T> {
  return send<T>(env.useMock || flag, method, path, opts)
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, query?: Query) => request<T>('POST', path, { body: body ?? {}, query }),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, { body }),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, { body }),
  del: <T = void>(path: string) => request<T>('DELETE', path),
}

export function mensajeDeError(e: unknown): string {
  if (e instanceof ApiError) return e.message
  if (e instanceof Error) return e.message
  return 'Algo salió mal'
}
