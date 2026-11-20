// TEMPORAL — tipos de endpoints que el contrato todavía no define (ver docs/TEMPORAL.md).
import type { ISODate, UsuarioResumen } from './api'

/** TEMPORAL (hueco 1) */
export type TipoNotificacion =
  | 'seguidor_nuevo'
  | 'solicitud_seguimiento'
  | 'like'
  | 'comentario'
  | 'invitacion_album'
  | 'invitacion_aceptada'
  | 'album_contenido'
  | 'album_participante'

/** TEMPORAL (hueco 1) */
export interface Notificacion {
  id: number
  tipo: TipoNotificacion
  actor: UsuarioResumen
  post_id: number | null
  album_id: number | null
  url_miniatura: string | null
  texto: string | null
  leida: boolean
  fecha: ISODate
}

/** TEMPORAL (hueco 1) */
export interface CantidadNoLeidas {
  cantidad: number
}
