/**
 * Backend simulado en memoria. Implementa las rutas de docs/API.md con las mismas reglas y errores.
 * Latencia y tasa de fallos configurables con VITE_MOCK_LATENCY_MS y VITE_MOCK_FAIL_RATE.
 */
import { env } from '../config/env'
import type { Db } from './db'
import { MockHttpError, notFound, unauthorized } from './rules'
import { crearSeed } from './seed'

export interface Ctx {
  db: Db
  /** id del usuario del token (null si la ruta es pública y no hay token) */
  yo: number
  params: Record<string, string>
  query: URLSearchParams
  body: unknown
}

export type Handler = (ctx: Ctx) => unknown
export type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

interface Route {
  method: Method
  pattern: string
  regex: RegExp
  keys: string[]
  handler: Handler
  publica: boolean
}

const routes: Route[] = []

export function route(method: Method, pattern: string, handler: Handler, publica = false): void {
  const keys: string[] = []
  const regex = new RegExp(
    '^' +
      pattern.replace(/\{(\w+)\}/g, (_m, k: string) => {
        keys.push(k)
        return '([^/]+)'
      }) +
      '$',
  )
  routes.push({ method, pattern, regex, keys, handler, publica })
}

export const db: Db = crearSeed()

export const TOKEN_PREFIX = 'mock-token-'

export function tokenPara(id: number): string {
  return `${TOKEN_PREFIX}${id}`
}

/** TEMPORAL — identidad en el mock para piezas temporales cuando el backend es real. */
export function tokenParaUsername(username: string | null): string {
  const u = db.usuarios.find((x) => x.username === username) ?? db.usuarios[0]
  return tokenPara(u.id)
}

function usuarioDelToken(token: string | null): number | null {
  if (!token?.startsWith(TOKEN_PREFIX)) return null
  const id = Number(token.slice(TOKEN_PREFIX.length))
  return db.usuarios.some((u) => u.id === id) ? id : null
}

export interface MockResponse {
  status: number
  data: unknown
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function matchear(method: Method, path: string): { route: Route; params: Record<string, string> } | null {
  // Las rutas literales ganan a las parametrizadas (p. ej. /conversaciones/solicitudes).
  const candidatos = routes
    .filter((r) => r.method === method)
    .map((r) => ({ r, m: r.regex.exec(path) }))
    .filter((x): x is { r: Route; m: RegExpExecArray } => x.m !== null)
    .sort((a, b) => a.r.keys.length - b.r.keys.length)
  const first = candidatos[0]
  if (!first) return null
  const params: Record<string, string> = {}
  first.r.keys.forEach((k, i) => {
    params[k] = decodeURIComponent(first.m[i + 1])
  })
  return { route: first.r, params }
}

export async function handleMock(
  method: Method,
  pathWithQuery: string,
  body: unknown,
  token: string | null,
  opciones: { latencia?: boolean } = {},
): Promise<MockResponse> {
  await import('./handlers')
  if (opciones.latencia !== false) await sleep(env.mockLatencyMs * (0.6 + Math.random() * 0.8))
  const [path, qs = ''] = pathWithQuery.split('?')
  try {
    if (env.mockFailRate > 0 && Math.random() < env.mockFailRate) {
      throw new MockHttpError(500, 'MockFailure', 'Fallo simulado del servidor (VITE_MOCK_FAIL_RATE)')
    }
    const m = matchear(method, path)
    if (!m) throw notFound(`Ruta no encontrada: ${method} ${path}`)
    const yo = usuarioDelToken(token)
    if (!m.route.publica && yo === null) throw unauthorized()
    const data = m.route.handler({
      db,
      yo: yo ?? 0,
      params: m.params,
      query: new URLSearchParams(qs),
      body: body ?? {},
    })
    const status = data === undefined ? 204 : method === 'POST' && m.route.pattern !== '/auth/login' ? 201 : 200
    // Copia profunda: la UI nunca comparte referencias con la "base".
    return { status, data: data === undefined ? null : structuredClone(data) }
  } catch (e) {
    if (e instanceof MockHttpError) return { status: e.status, data: { error: e.error, message: e.message } }
    const msg = e instanceof Error ? e.message : String(e)
    return { status: 500, data: { error: 'InternalError', message: msg } }
  }
}
