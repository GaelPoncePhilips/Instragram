/**
 * Tipos del contrato (docs/API.md + DTOs de Pydantic del backend).
 * Los nombres de campos van tal cual (snake_case). Las fechas viajan como string ISO.
 */

export type ISODate = string

/** Error estándar: `{"error": "NotFoundError", "message": "..."}` */
export interface ApiErrorBody {
  error: string
  message: string
}

// ---------- Auth
export interface LoginBody {
  email: string
  password: string
}
export interface TokenDTO {
  access_token: string
  token_type: string
}

// ---------- Usuarios
export interface Usuario {
  id: number
  username: string
  email: string
  nombre: string
  bio: string | null
  es_privada: boolean
  reels_desactivados: boolean
  fecha_registro: ISODate
}

export interface UsuarioResumen {
  id: number
  username: string
  nombre: string
}

export type Relacion = 'yo' | 'siguiendo' | 'pendiente' | 'ninguna'

export interface Perfil {
  id: number
  username: string
  nombre: string
  bio: string | null
  es_privada: boolean
  cantidad_posts: number
  cantidad_seguidores: number
  cantidad_seguidos: number
  relacion: Relacion
}

export interface CreateUsuarioBody {
  username: string
  email: string
  password: string
  nombre: string
  bio?: string | null
}

export interface UpdateUsuarioBody {
  nombre?: string
  bio?: string | null
  es_privada?: boolean
  reels_desactivados?: boolean
}

export interface Sugerencia extends UsuarioResumen {
  en_comun: number
  te_sigue: boolean
}

export interface TopPost {
  id: number
  url_imagen: string
  fecha_publicacion: ISODate
  likes: number
}
export interface TopSeguidor extends UsuarioResumen {
  likes: number
}
export interface Estadisticas {
  cantidad_posts: number
  promedio_likes_por_post: number
  post_con_mas_likes: TopPost | null
  seguidor_que_mas_likes_dio: TopSeguidor | null
}

// ---------- Seguidores
export type EstadoSeguimiento = 'pendiente' | 'aceptado'
export interface Seguimiento {
  seguidor_id: number
  seguido_id: number
  estado: EstadoSeguimiento
  fecha: ISODate
}
export interface SolicitudAccionBody {
  accion: 'aceptar' | 'rechazar'
}

// ---------- Posts y reels
export type TipoPost = 'foto' | 'reel'
export interface Post {
  id: number
  usuario_id: number
  autor_username: string
  autor_nombre: string
  tipo: TipoPost
  url_imagen: string
  url_video: string | null
  duracion_seg: number | null
  descripcion: string | null
  fecha_publicacion: ISODate
  cantidad_likes: number
  cantidad_comentarios: number
  me_gusta: boolean
  motivo?: string | null
}
export interface CreatePostBody {
  tipo: TipoPost
  url_imagen: string
  url_video?: string | null
  duracion_seg?: number | null
  descripcion?: string | null
}
export interface Comentario {
  id: number
  post_id: number
  usuario_id: number
  autor_username: string
  texto: string
  fecha: ISODate
}

// ---------- Stories
export interface Story {
  id: number
  usuario_id: number
  url_imagen: string
  solo_mejores_amigos: boolean
  fecha_publicacion: ISODate
  fecha_vencimiento: ISODate
  vista: boolean
}
export interface StoriesDeUsuario {
  usuario: UsuarioResumen
  todas_vistas: boolean
  stories: Story[]
}
export interface Vista extends UsuarioResumen {
  fecha: ISODate
}
export interface CreateStoryBody {
  url_imagen: string
  solo_mejores_amigos?: boolean
}

// ---------- Hashtags
export interface HashtagTendencia {
  nombre: string
  cantidad_posts: number
}

// ---------- Destacadas
export interface Destacada {
  id: number
  usuario_id: number
  titulo: string
  portada_url: string | null
  orden: number
  stories: Story[]
}
export interface CreateDestacadaBody {
  titulo: string
  portada_url?: string | null
  story_ids: number[]
}
export interface UpdateDestacadaBody {
  titulo?: string
  portada_url?: string | null
}

// ---------- Álbumes
export type RolAlbum = 'admin' | 'miembro'
export type EstadoMiembro = 'pendiente' | 'aceptado'
export interface AlbumMiembro extends UsuarioResumen {
  rol: RolAlbum
  estado: EstadoMiembro
}
export interface Album {
  id: number
  creador_id: number
  titulo: string
  descripcion: string | null
  portada_url: string | null
  fecha_creacion: ISODate
  miembros: AlbumMiembro[]
}
export interface CreateAlbumBody {
  titulo: string
  descripcion?: string | null
  portada_url?: string | null
}
export type UpdateAlbumBody = Partial<CreateAlbumBody>
export interface AlbumItem {
  id: number
  album_id: number
  usuario_id: number
  url_imagen: string
  descripcion: string | null
  fecha: ISODate
  /** TEMPORAL (hueco 3): el contrato solo tiene url_imagen. */
  tipo?: 'foto' | 'video'
  /** TEMPORAL (hueco 3) */
  url_video?: string | null
}
export interface CreateAlbumItemBody {
  url_imagen: string
  descripcion?: string | null
  /** TEMPORAL (hueco 3) */
  tipo?: 'foto' | 'video'
  /** TEMPORAL (hueco 3) */
  url_video?: string | null
}

// ---------- DMs
export interface Mensaje {
  id: number
  conversacion_id: number
  emisor_id: number
  texto: string | null
  post_id: number | null
  fecha: ISODate
}
export type EstadoConversacion = 'solicitud' | 'aceptada'
export interface Conversacion {
  id: number
  es_grupal: boolean
  nombre: string | null
  estado: EstadoConversacion
  participantes: UsuarioResumen[]
  ultimo_mensaje: Mensaje | null
  no_leidos: number
}
export interface CreateConversacionBody {
  participantes: number[]
  nombre?: string | null
}
export interface CreateMensajeBody {
  texto?: string | null
  post_id?: number | null
}

// ---------- Paginación
export interface Paginacion {
  limit?: number
  offset?: number
}
