/**
 * Base de datos en memoria del backend simulado. Refleja las tablas de backend/src/db/tables.sql.
 * Se reinicia al recargar la página (los datos semilla están en seed.ts).
 */
import type {
  AlbumItem,
  EstadoConversacion,
  EstadoMiembro,
  EstadoSeguimiento,
  ISODate,
  Mensaje,
  RolAlbum,
  TipoPost,
  Usuario,
} from '../types/api'
import type { TipoNotificacion } from '../types/temporal'

export interface DbUsuario extends Usuario {
  password: string
}
export interface DbSeguimiento {
  seguidor_id: number
  seguido_id: number
  estado: EstadoSeguimiento
  fecha: ISODate
}
export interface DbPost {
  id: number
  usuario_id: number
  tipo: TipoPost
  url_imagen: string
  url_video: string | null
  duracion_seg: number | null
  descripcion: string | null
  fecha_publicacion: ISODate
}
export interface DbLike {
  usuario_id: number
  post_id: number
  fecha: ISODate
}
export interface DbComentario {
  id: number
  post_id: number
  usuario_id: number
  texto: string
  fecha: ISODate
}
export interface DbStory {
  id: number
  usuario_id: number
  url_imagen: string
  solo_mejores_amigos: boolean
  fecha_publicacion: ISODate
  fecha_vencimiento: ISODate
}
export interface DbVista {
  usuario_id: number
  story_id: number
  fecha: ISODate
}
export interface DbMejorAmigo {
  usuario_id: number
  amigo_id: number
}
export interface DbBloqueo {
  bloqueador_id: number
  bloqueado_id: number
  fecha: ISODate
}
export interface DbDestacada {
  id: number
  usuario_id: number
  titulo: string
  portada_url: string | null
  orden: number
  story_ids: number[]
}
export interface DbAlbum {
  id: number
  creador_id: number
  titulo: string
  descripcion: string | null
  portada_url: string | null
  fecha_creacion: ISODate
}
export interface DbMiembro {
  album_id: number
  usuario_id: number
  rol: RolAlbum
  estado: EstadoMiembro
  fecha: ISODate
}
export interface DbConversacion {
  id: number
  es_grupal: boolean
  nombre: string | null
  fecha: ISODate
}
export interface DbParticipante {
  conversacion_id: number
  usuario_id: number
  estado: EstadoConversacion
  ultima_lectura: ISODate | null
  oculta: boolean
}
/** TEMPORAL (hueco 1) */
export interface DbNotificacion {
  id: number
  destinatario_id: number
  tipo: TipoNotificacion
  actor_id: number
  post_id: number | null
  album_id: number | null
  url_miniatura: string | null
  texto: string | null
  leida: boolean
  fecha: ISODate
}

export interface Db {
  usuarios: DbUsuario[]
  seguidores: DbSeguimiento[]
  posts: DbPost[]
  likes: DbLike[]
  comentarios: DbComentario[]
  stories: DbStory[]
  vistas: DbVista[]
  mejoresAmigos: DbMejorAmigo[]
  bloqueos: DbBloqueo[]
  destacadas: DbDestacada[]
  albums: DbAlbum[]
  miembros: DbMiembro[]
  items: AlbumItem[]
  conversaciones: DbConversacion[]
  participantes: DbParticipante[]
  mensajes: Mensaje[]
  notificaciones: DbNotificacion[]
  seq: Record<string, number>
}

export function emptyDb(): Db {
  return {
    usuarios: [],
    seguidores: [],
    posts: [],
    likes: [],
    comentarios: [],
    stories: [],
    vistas: [],
    mejoresAmigos: [],
    bloqueos: [],
    destacadas: [],
    albums: [],
    miembros: [],
    items: [],
    conversaciones: [],
    participantes: [],
    mensajes: [],
    notificaciones: [],
    seq: {},
  }
}

export function nextId(db: Db, tabla: string): number {
  const n = (db.seq[tabla] ?? 0) + 1
  db.seq[tabla] = n
  return n
}

export const nowIso = (): ISODate => new Date().toISOString()
export const hoursAgo = (h: number): ISODate => new Date(Date.now() - h * 3_600_000).toISOString()
export const addHours = (iso: ISODate, h: number): ISODate =>
  new Date(new Date(iso).getTime() + h * 3_600_000).toISOString()
