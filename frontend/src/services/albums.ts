/** Álbumes compartidos (EXTRA). */
import type { Album, AlbumItem, CreateAlbumBody, CreateAlbumItemBody, Paginacion, UpdateAlbumBody } from '../types/api'
import { api } from './client'
import { conVideo, guardarVideo } from './temporal/albumVideo'
import { enviarInvitacionPorDm } from './temporal/invitacionDm'

/** POST /albums — body {titulo, descripcion?, portada_url?} → Album. El creador entra como admin aceptado */
export const crearAlbum = (body: CreateAlbumBody) => api.post<Album>('/albums', body)

/** GET /albums/{id} → Album con miembros. 403/404 si no es visible */
export const obtenerAlbum = (id: number) => api.get<Album>(`/albums/${id}`)

/** PATCH /albums/{id} — body {titulo?, descripcion?, portada_url?} → Album. Solo admin */
export const editarAlbum = (id: number, body: UpdateAlbumBody) => api.patch<Album>(`/albums/${id}`, body)

/** DELETE /albums/{id} → 204. Solo admin */
export const borrarAlbum = (id: number) => api.del(`/albums/${id}`)

/** GET /usuarios/{id}/albums → Album[] donde {id} es miembro aceptado y que puedo ver */
export const albumsDeUsuario = (id: number) => api.get<Album[]>(`/usuarios/${id}/albums`)

/**
 * POST /albums/{id}/invitaciones — body {usuario_id} → Album. Solo admin; 400 si hay bloqueo.
 * TEMPORAL (hueco 12): además manda un DM con la invitación (ver services/temporal/invitacionDm.ts).
 */
export const invitar = async (id: number, usuarioId: number) => {
  const album = await api.post<Album>(`/albums/${id}/invitaciones`, { usuario_id: usuarioId })
  await enviarInvitacionPorDm(album, usuarioId)
  return album
}

/** GET /usuarios/{id}/invitaciones-album → Album[] con invitación pendiente. Solo dueño */
export const invitacionesAlbum = (id: number) => api.get<Album[]>(`/usuarios/${id}/invitaciones-album`)

/** POST /albums/{id}/invitaciones/aceptar → Album */
export const aceptarInvitacion = (id: number) => api.post<Album>(`/albums/${id}/invitaciones/aceptar`)

/** DELETE /albums/{id}/miembros/{usuario_id} → 204. Admin quita; uno mismo rechaza o sale */
export const quitarMiembro = (id: number, usuarioId: number) => api.del(`/albums/${id}/miembros/${usuarioId}`)

/** GET /albums/{id}/items?limit&offset → AlbumItem[] (fecha desc) */
export const itemsDeAlbum = async (id: number, p: Paginacion = {}) =>
  (await api.get<AlbumItem[]>(`/albums/${id}/items`, { limit: 50, ...p })).map(conVideo)

/**
 * POST /albums/{id}/items — body {url_imagen, descripcion?} → AlbumItem. Solo miembros aceptados.
 * TEMPORAL (hueco 3): se envían también tipo y url_video; si el backend los ignora, se guardan localmente.
 */
export const subirItem = async (id: number, body: CreateAlbumItemBody) => {
  const item = await api.post<AlbumItem>(`/albums/${id}/items`, body)
  return conVideo(guardarVideo(item, body))
}

/** DELETE /albums/{id}/items/{item_id} → 204. Autor del item o admin */
export const borrarItem = (id: number, itemId: number) => api.del(`/albums/${id}/items/${itemId}`)
