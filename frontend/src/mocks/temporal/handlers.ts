// TEMPORAL — endpoints que el contrato no define todavía (ver docs/TEMPORAL.md).
// Responden desde el mock aunque VITE_USE_MOCK=false; cada uno se apaga con su VITE_TEMPORAL_*.
import type { Notificacion } from '../../types/temporal'
import type { DbNotificacion } from '../db'
import { obj } from '../handlers/util'
import { hayBloqueo, notFound, paginar, resumen, usuario } from '../rules'
import { route } from '../server'
import { idParam } from '../handlers/util'
import type { Db } from '../db'

function notifDTO(db: Db, n: DbNotificacion): Notificacion {
  return {
    id: n.id,
    tipo: n.tipo,
    actor: resumen(usuario(db, n.actor_id)),
    post_id: n.post_id,
    album_id: n.album_id,
    url_miniatura: n.url_miniatura,
    texto: n.texto,
    leida: n.leida,
    fecha: n.fecha,
  }
}

// TEMPORAL (hueco 1): GET /notificaciones?limit&offset
route('GET', '/notificaciones', ({ db, yo, query }) =>
  paginar(
    db.notificaciones
      .filter((n) => n.destinatario_id === yo && !hayBloqueo(db, yo, n.actor_id))
      .sort((a, b) => b.fecha.localeCompare(a.fecha)),
    query,
    50,
  ).map((n) => notifDTO(db, n)),
)

// TEMPORAL (hueco 1): POST /notificaciones/{id}/leida
route('POST', '/notificaciones/{id}/leida', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  const n = db.notificaciones.find((x) => x.id === id && x.destinatario_id === yo)
  if (!n) throw notFound('Notificación no encontrada')
  n.leida = true
  return undefined
})

// TEMPORAL (hueco 1): POST /notificaciones/leidas
route('POST', '/notificaciones/leidas', ({ db, yo, body }) => {
  obj(body)
  for (const n of db.notificaciones) if (n.destinatario_id === yo) n.leida = true
  return undefined
})

// TEMPORAL (hueco 1): GET /notificaciones/no-leidas/cantidad
route('GET', '/notificaciones/no-leidas/cantidad', ({ db, yo }) => ({
  cantidad: db.notificaciones.filter((n) => n.destinatario_id === yo && !n.leida && !hayBloqueo(db, yo, n.actor_id)).length,
}))

// TEMPORAL (hueco 2): GET /usuarios?q=&limit&offset
route('GET', '/usuarios', ({ db, yo, query }) => {
  const q = (query.get('q') ?? '').trim().toLowerCase().replace(/^@/, '')
  if (!q) return []
  const res = db.usuarios
    .filter((u) => !hayBloqueo(db, yo, u.id))
    .filter((u) => u.username.includes(q) || u.nombre.toLowerCase().includes(q))
    .sort((a, b) => Number(!a.username.startsWith(q)) - Number(!b.username.startsWith(q)) || a.username.localeCompare(b.username))
    .map(resumen)
  return paginar(res, query)
})

// TEMPORAL (hueco 7): GET /usuarios/{id}/resumen — resolver ids sueltos (solicitudes, autores que salieron de un álbum)
route('GET', '/usuarios/{id}/resumen', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  if (hayBloqueo(db, yo, id)) throw notFound('Usuario no encontrado')
  return resumen(usuario(db, id))
})
