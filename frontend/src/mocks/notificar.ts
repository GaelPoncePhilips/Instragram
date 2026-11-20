// TEMPORAL (hueco 1) — el mock genera notificaciones a partir de sus propias acciones.
import type { TipoNotificacion } from '../types/temporal'
import type { Db } from './db'
import { nextId, nowIso } from './db'

export interface Extra {
  post_id?: number | null
  album_id?: number | null
  url_miniatura?: string | null
  texto?: string | null
}

export function notificar(db: Db, destinatario: number, tipo: TipoNotificacion, actor: number, extra: Extra = {}): void {
  if (destinatario === actor) return
  db.notificaciones.push({
    id: nextId(db, 'notificaciones'),
    destinatario_id: destinatario,
    tipo,
    actor_id: actor,
    post_id: extra.post_id ?? null,
    album_id: extra.album_id ?? null,
    url_miniatura: extra.url_miniatura ?? null,
    texto: extra.texto ?? null,
    leida: false,
    fecha: nowIso(),
  })
}

/** Al deshacer una acción (unlike, dejar de seguir, aceptar solicitud) se quita la notificación vieja. */
export function quitarNotificacion(db: Db, destinatario: number, tipo: TipoNotificacion, actor: number, post_id?: number): void {
  db.notificaciones = db.notificaciones.filter(
    (n) =>
      !(
        n.destinatario_id === destinatario &&
        n.tipo === tipo &&
        n.actor_id === actor &&
        (post_id === undefined || n.post_id === post_id)
      ),
  )
}
