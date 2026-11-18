// TEMPORAL — servicios de endpoints que el contrato no define todavía (docs/TEMPORAL.md).
// Cada uno responde desde el mock aunque VITE_USE_MOCK=false mientras su flag esté activo.
import { temporal } from '../../config/env'
import type { Paginacion, UsuarioResumen } from '../../types/api'
import type { CantidadNoLeidas, Notificacion } from '../../types/temporal'
import { temporalRequest } from '../client'

// ---------- Hueco 1: notificaciones

/** TEMPORAL GET /notificaciones?limit&offset → Notificacion[] (fecha desc) */
export const notificaciones = (p: Paginacion = {}) =>
  temporalRequest<Notificacion[]>(temporal.notificaciones, 'GET', '/notificaciones', { query: { limit: 50, ...p } })

/** TEMPORAL POST /notificaciones/{id}/leida → 204 */
export const marcarNotificacionLeida = (id: number) =>
  temporalRequest<void>(temporal.notificaciones, 'POST', `/notificaciones/${id}/leida`, { body: {} })

/** TEMPORAL POST /notificaciones/leidas → 204 (marca todas) */
export const marcarTodasLeidas = () => temporalRequest<void>(temporal.notificaciones, 'POST', '/notificaciones/leidas', { body: {} })

/** TEMPORAL GET /notificaciones/no-leidas/cantidad → {cantidad} */
export const cantidadNoLeidas = () =>
  temporalRequest<CantidadNoLeidas>(temporal.notificaciones, 'GET', '/notificaciones/no-leidas/cantidad')

// ---------- Hueco 2: búsqueda de usuarios

/** TEMPORAL GET /usuarios?q=&limit&offset → UsuarioResumen[] */
export const buscarUsuarios = (q: string, p: Paginacion = {}) =>
  temporalRequest<UsuarioResumen[]>(temporal.busqueda, 'GET', '/usuarios', { query: { q, limit: 20, ...p } })

// ---------- Hueco 7: resolver un usuario por id

const cacheResumen = new Map<number, Promise<UsuarioResumen>>()

/** TEMPORAL GET /usuarios/{id}/resumen → UsuarioResumen (con caché en memoria) */
export function usuarioPorId(id: number): Promise<UsuarioResumen> {
  const hit = cacheResumen.get(id)
  if (hit) return hit
  const p = temporalRequest<UsuarioResumen>(temporal.usuariosPorId, 'GET', `/usuarios/${id}/resumen`)
  p.catch(() => cacheResumen.delete(id))
  cacheResumen.set(id, p)
  return p
}

export function recordarUsuario(u: UsuarioResumen): void {
  cacheResumen.set(u.id, Promise.resolve(u))
}
