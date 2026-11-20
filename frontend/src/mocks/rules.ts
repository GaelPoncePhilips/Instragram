/**
 * Reglas transversales del contrato (bloqueo → 404, privacidad → 403, stories 24 h, etc.)
 * y conversión de filas a DTOs. Equivale a permisos_service + mappers del backend.
 */
import type {
  Album,
  AlbumMiembro,
  Comentario,
  Conversacion,
  Post,
  Story,
  UsuarioResumen,
} from '../types/api'
import type { Db, DbAlbum, DbComentario, DbPost, DbStory, DbUsuario } from './db'
import { nowIso } from './db'

export class MockHttpError extends Error {
  status: number
  error: string
  constructor(status: number, error: string, message: string) {
    super(message)
    this.status = status
    this.error = error
  }
}

export const notFound = (msg = 'No encontrado') => new MockHttpError(404, 'NotFoundError', msg)
export const forbidden = (msg = 'No autorizado') => new MockHttpError(403, 'ForbiddenError', msg)
export const badRequest = (msg: string) => new MockHttpError(400, 'ValidationError', msg)
export const conflict = (msg: string) => new MockHttpError(409, 'ConflictError', msg)
export const unauthorized = (msg = 'Token inválido o vencido') =>
  new MockHttpError(401, 'UnauthorizedError', msg)

// ---------- Consultas básicas

export function usuario(db: Db, id: number): DbUsuario {
  const u = db.usuarios.find((x) => x.id === id)
  if (!u) throw notFound('Usuario no encontrado')
  return u
}

export function resumen(u: DbUsuario): UsuarioResumen {
  return { id: u.id, username: u.username, nombre: u.nombre }
}

export function hayBloqueo(db: Db, a: number, b: number): boolean {
  return db.bloqueos.some(
    (x) => (x.bloqueador_id === a && x.bloqueado_id === b) || (x.bloqueador_id === b && x.bloqueado_id === a),
  )
}

export function sigue(db: Db, seguidor: number, seguido: number): boolean {
  return db.seguidores.some(
    (s) => s.seguidor_id === seguidor && s.seguido_id === seguido && s.estado === 'aceptado',
  )
}

export function estadoSeguimiento(db: Db, seguidor: number, seguido: number) {
  return db.seguidores.find((s) => s.seguidor_id === seguidor && s.seguido_id === seguido)?.estado ?? null
}

/** Bloqueo en cualquier sentido → 404 (el otro es invisible). */
export function assertNoBloqueo(db: Db, yo: number, otro: number): void {
  if (yo !== otro && hayBloqueo(db, yo, otro)) throw notFound('Usuario no encontrado')
}

/** HU4: contenido de cuenta privada solo para el dueño y seguidores aceptados. */
export function puedeVer(db: Db, yo: number, dueno: number): boolean {
  if (yo === dueno) return true
  if (hayBloqueo(db, yo, dueno)) return false
  const u = db.usuarios.find((x) => x.id === dueno)
  if (!u) return false
  return !u.es_privada || sigue(db, yo, dueno)
}

/** Lanza 404 si hay bloqueo y 403 si es privada sin permiso. */
export function assertPuedeVer(db: Db, yo: number, dueno: number): void {
  usuario(db, dueno)
  assertNoBloqueo(db, yo, dueno)
  if (!puedeVer(db, yo, dueno)) throw forbidden('Esta cuenta es privada')
}

export function assertDueno(yo: number, id: number): void {
  if (yo !== id) throw forbidden('Solo el dueño puede hacer esto')
}

export function esMejorAmigo(db: Db, dueno: number, amigo: number): boolean {
  return db.mejoresAmigos.some((m) => m.usuario_id === dueno && m.amigo_id === amigo)
}

// ---------- Posts

export function hashtagsDe(texto: string | null): string[] {
  if (!texto) return []
  const set = new Set<string>()
  for (const m of texto.matchAll(/#([\p{L}\p{N}_]+)/gu)) set.add(m[1].toLowerCase())
  return [...set]
}

export function postOr404(db: Db, id: number): DbPost {
  const p = db.posts.find((x) => x.id === id)
  if (!p) throw notFound('Post no encontrado')
  return p
}

export function postDTO(db: Db, p: DbPost, yo: number, motivo?: string): Post {
  const autor = usuario(db, p.usuario_id)
  const likes = db.likes.filter(
    (l) => l.post_id === p.id && !hayBloqueo(db, p.usuario_id, l.usuario_id),
  )
  const comentarios = db.comentarios.filter(
    (c) => c.post_id === p.id && !hayBloqueo(db, p.usuario_id, c.usuario_id),
  )
  const dto: Post = {
    id: p.id,
    usuario_id: p.usuario_id,
    autor_username: autor.username,
    autor_nombre: autor.nombre,
    tipo: p.tipo,
    url_imagen: p.url_imagen,
    url_video: p.url_video,
    duracion_seg: p.duracion_seg,
    descripcion: p.descripcion,
    fecha_publicacion: p.fecha_publicacion,
    cantidad_likes: likes.length,
    cantidad_comentarios: comentarios.length,
    me_gusta: likes.some((l) => l.usuario_id === yo),
  }
  if (motivo !== undefined) dto.motivo = motivo
  return dto
}

export function comentarioDTO(db: Db, c: DbComentario): Comentario {
  return {
    id: c.id,
    post_id: c.post_id,
    usuario_id: c.usuario_id,
    autor_username: usuario(db, c.usuario_id).username,
    texto: c.texto,
    fecha: c.fecha,
  }
}

export const porFechaDesc = <T extends { fecha_publicacion: string }>(a: T, b: T) =>
  b.fecha_publicacion.localeCompare(a.fecha_publicacion)

// ---------- Stories

export const vigente = (s: DbStory) => s.fecha_vencimiento > nowIso()

/** Story de mejores amigos: solo el dueño y los de su lista. */
export function storyVisiblePara(db: Db, s: DbStory, yo: number): boolean {
  if (s.usuario_id === yo) return true
  if (!s.solo_mejores_amigos) return true
  return esMejorAmigo(db, s.usuario_id, yo)
}

export function storyDTO(db: Db, s: DbStory, yo: number): Story {
  return {
    id: s.id,
    usuario_id: s.usuario_id,
    url_imagen: s.url_imagen,
    solo_mejores_amigos: s.solo_mejores_amigos,
    fecha_publicacion: s.fecha_publicacion,
    fecha_vencimiento: s.fecha_vencimiento,
    vista: db.vistas.some((v) => v.story_id === s.id && v.usuario_id === yo),
  }
}

// ---------- Álbumes

export function albumOr404(db: Db, id: number): DbAlbum {
  const a = db.albums.find((x) => x.id === id)
  if (!a) throw notFound('Álbum no encontrado')
  return a
}

export function miembro(db: Db, albumId: number, usuarioId: number) {
  return db.miembros.find((m) => m.album_id === albumId && m.usuario_id === usuarioId)
}

/**
 * Visible para: miembros (pendientes incluidos) y seguidores aceptados de cualquier
 * miembro aceptado, salvo bloqueo con el creador.
 */
export function albumVisible(db: Db, a: DbAlbum, yo: number): boolean {
  if (miembro(db, a.id, yo)) return true
  if (hayBloqueo(db, yo, a.creador_id)) return false
  return db.miembros.some(
    (m) => m.album_id === a.id && m.estado === 'aceptado' && sigue(db, yo, m.usuario_id),
  )
}

export function albumDTO(db: Db, a: DbAlbum): Album {
  const miembros: AlbumMiembro[] = db.miembros
    .filter((m) => m.album_id === a.id)
    .sort((x, y) => x.fecha.localeCompare(y.fecha))
    .map((m) => ({ ...resumen(usuario(db, m.usuario_id)), rol: m.rol, estado: m.estado }))
  return {
    id: a.id,
    creador_id: a.creador_id,
    titulo: a.titulo,
    descripcion: a.descripcion,
    portada_url: a.portada_url ?? db.items.find((i) => i.album_id === a.id)?.url_imagen ?? null,
    fecha_creacion: a.fecha_creacion,
    miembros,
  }
}

// ---------- DMs

export function conversacionDTO(db: Db, convId: number, yo: number): Conversacion {
  const c = db.conversaciones.find((x) => x.id === convId)
  if (!c) throw notFound('Conversación no encontrada')
  const parts = db.participantes.filter((p) => p.conversacion_id === convId)
  const mio = parts.find((p) => p.usuario_id === yo)
  if (!mio) throw notFound('Conversación no encontrada')
  const mensajes = db.mensajes
    .filter((m) => m.conversacion_id === convId)
    .sort((a, b) => a.id - b.id)
  const ultimo = mensajes.at(-1) ?? null
  const noLeidos = mensajes.filter(
    (m) => m.emisor_id !== yo && (mio.ultima_lectura === null || m.fecha > mio.ultima_lectura),
  ).length
  return {
    id: c.id,
    es_grupal: c.es_grupal,
    nombre: c.nombre,
    estado: mio.estado,
    participantes: parts
      .filter((p) => p.usuario_id !== yo)
      .map((p) => resumen(usuario(db, p.usuario_id))),
    ultimo_mensaje: ultimo,
    no_leidos: noLeidos,
  }
}

// ---------- Paginación (limit máx. 50)

export function paginar<T>(items: T[], q: URLSearchParams, defLimit = 20): T[] {
  const limit = q.has('limit') ? Number(q.get('limit')) : defLimit
  const offset = q.has('offset') ? Number(q.get('offset')) : 0
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw badRequest('limit debe estar entre 1 y 50')
  if (!Number.isInteger(offset) || offset < 0) throw badRequest('offset inválido')
  return items.slice(offset, offset + limit)
}
