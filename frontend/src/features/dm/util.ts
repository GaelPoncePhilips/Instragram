import { ApiError } from '../../services/client'
import type { Conversacion, UsuarioResumen } from '../../types/api'

/** Participantes que no soy yo. */
export function otros(c: Conversacion, yoId: number): UsuarioResumen[] {
  const r = c.participantes.filter((p) => p.id !== yoId)
  return r.length ? r : c.participantes
}

/** Nombre visible: grupo → nombre o lista de usernames; 1 a 1 → username del otro. */
export function nombreConversacion(c: Conversacion, yoId: number): string {
  const o = otros(c, yoId)
  if (c.es_grupal) return c.nombre?.trim() || o.map((p) => p.username).join(', ')
  return o[0]?.username ?? 'Conversación'
}

export function esStatus(e: unknown, ...codes: number[]): boolean {
  return e instanceof ApiError && codes.includes(e.status)
}
