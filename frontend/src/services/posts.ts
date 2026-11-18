/** Posts y reels, likes, comentarios, feed, explorar y hashtags. */
import type {
  Comentario,
  CreatePostBody,
  HashtagTendencia,
  Paginacion,
  Post,
  TipoPost,
  UsuarioResumen,
} from '../types/api'
import { api } from './client'

/** POST /posts — body {tipo, url_imagen, url_video?, duracion_seg?, descripcion?} → Post. Reel exige url_video */
export const crearPost = (body: CreatePostBody) => api.post<Post>('/posts', body)

/** GET /posts/{id} → Post. 403 privada, 404 bloqueo/no existe */
export const obtenerPost = (id: number) => api.get<Post>(`/posts/${id}`)

/** DELETE /posts/{id} → 204. Solo autor */
export const borrarPost = (id: number) => api.del(`/posts/${id}`)

/** GET /usuarios/{id}/posts?tipo&limit&offset → Post[]. 403 si no autorizado */
export const postsDeUsuario = (id: number, p: Paginacion & { tipo?: TipoPost } = {}) =>
  api.get<Post[]>(`/usuarios/${id}/posts`, { ...p })

/** GET /usuarios/{id}/reels?limit&offset → Post[] (tipo reel) */
export const reelsDeUsuario = (id: number, p: Paginacion = {}) => api.get<Post[]>(`/usuarios/${id}/reels`, { ...p })

/** POST /posts/{id}/like → Post actualizado. Idempotente */
export const darLike = (id: number) => api.post<Post>(`/posts/${id}/like`)

/** DELETE /posts/{id}/like → 204 */
export const quitarLike = (id: number) => api.del(`/posts/${id}/like`)

/** GET /posts/{id}/likes?limit&offset → UsuarioResumen[] */
export const likesDePost = (id: number, p: Paginacion = {}) => api.get<UsuarioResumen[]>(`/posts/${id}/likes`, { limit: 50, ...p })

/** GET /posts/{id}/comentarios?limit&offset → Comentario[] (fecha asc) */
export const comentarios = (id: number, p: Paginacion = {}) => api.get<Comentario[]>(`/posts/${id}/comentarios`, { limit: 50, ...p })

/** POST /posts/{id}/comentarios — body {texto} (1–300) → Comentario */
export const comentar = (id: number, texto: string) => api.post<Comentario>(`/posts/${id}/comentarios`, { texto })

/** DELETE /comentarios/{id} → 204. Autor del comentario o dueño del post */
export const borrarComentario = (id: number) => api.del(`/comentarios/${id}`)

/** GET /usuarios/{id}/feed?limit&offset → Post[] de seguidos, fecha desc. Solo dueño */
export const feed = (id: number, p: Paginacion = {}) => api.get<Post[]>(`/usuarios/${id}/feed`, { ...p })

/** GET /usuarios/{id}/reels/feed?limit&offset → Post[] recomendados. 403 si reels_desactivados */
export const reelsFeed = (id: number, p: Paginacion = {}) => api.get<Post[]>(`/usuarios/${id}/reels/feed`, { ...p })

/** GET /usuarios/{id}/explorar?limit&offset → Post[] recomendados (con motivo) */
export const explorar = (id: number, p: Paginacion = {}) => api.get<Post[]>(`/usuarios/${id}/explorar`, { ...p })

/** GET /hashtags/tendencia → HashtagTendencia[] (top 10, 24 h, cuentas públicas) */
export const tendencias = () => api.get<HashtagTendencia[]>('/hashtags/tendencia')

/** GET /hashtags/{nombre}/posts?limit&offset → Post[] públicos ordenados por likes */
export const postsDeHashtag = (nombre: string, p: Paginacion = {}) =>
  api.get<Post[]>(`/hashtags/${encodeURIComponent(nombre)}/posts`, { ...p })
