# Endpoints usados por el frontend

El contrato fuente de verdad es [`../../docs/API.md`](../../docs/API.md). Este documento lista, por dominio, los endpoints que el frontend consume desde `src/services/*.ts` y `src/services/temporal/*.ts`. Las formas de respuesta (campos de cada DTO) se tomaron de los DTOs Pydantic de `backend/src/dtos` y están tipadas en `src/types/api.ts` y `src/types/temporal.ts`.

Convenciones: rutas relativas a `VITE_API_URL` (por defecto `http://localhost:8000/api`); JSON en snake_case; fechas ISO 8601 (`ISODate`); `Authorization: Bearer <token>`; errores `{"error": "...", "message": "..."}` (`ApiErrorBody`). Paginación `limit`/`offset` (máx. 50) salvo que se indique. `204` = sin cuerpo.

## Auth

| Método | Ruta | Descripción | Params | Body | Respuesta |
|---|---|---|---|---|---|
| POST | /auth/login | Iniciar sesión | - | LoginBody | TokenDTO |
| GET | /auth/me | Usuario logueado | - | - | Usuario |

- **LoginBody**: `email: string`, `password: string`.
- **TokenDTO**: `access_token: string`, `token_type: string`.

## Usuarios, seguidores, mejores amigos y bloqueos

| Método | Ruta | Descripción | Params | Body | Respuesta |
|---|---|---|---|---|---|
| POST | /usuarios | Registrar (409 si username/email existen) | - | CreateUsuarioBody | Usuario |
| GET | /usuarios/{username} | Perfil (404 si no existe o hay bloqueo) | - | - | Perfil |
| PATCH | /usuarios/{id} | Editar cuenta (solo dueño) | - | UpdateUsuarioBody | Usuario |
| GET | /usuarios/{id}/seguidores | Seguidores (403 privada) | limit, offset | - | UsuarioResumen[] |
| GET | /usuarios/{id}/seguidos | Seguidos (403 privada) | limit, offset | - | UsuarioResumen[] |
| GET | /usuarios/{id}/no-me-siguen | Seguidos que no me siguen (solo dueño) | limit, offset | - | UsuarioResumen[] |
| GET | /usuarios/{id}/estadisticas | Estadísticas (solo dueño) | desde, hasta (YYYY-MM-DD) | - | Estadisticas |
| GET | /usuarios/{id}/sugerencias | Sugerencias de a quién seguir (solo dueño) | limit, offset | - | Sugerencia[] |
| POST | /usuarios/{id}/seguir | Seguir (aceptado si pública, pendiente si privada; 400 a uno mismo, 409 duplicado) | - | {} | Seguimiento |
| DELETE | /usuarios/{id}/seguir | Dejar de seguir / cancelar solicitud | - | - | 204 |
| DELETE | /usuarios/{id}/seguidores/{seguidor_id} | Quitar seguidor (solo dueño) | - | - | 204 |
| GET | /usuarios/{id}/solicitudes | Solicitudes pendientes (solo dueño) | limit, offset | - | Seguimiento[] |
| PATCH | /usuarios/{id}/solicitudes/{seguidor_id} | Aceptar o rechazar | - | SolicitudAccionBody | Seguimiento o 204 |
| GET | /usuarios/{id}/mejores-amigos | Mejores amigos (solo dueño) | limit=50 | - | UsuarioResumen[] |
| POST | /usuarios/{id}/mejores-amigos/{amigo_id} | Agregar (400 si no me sigue aceptado) | - | {} | 204 |
| DELETE | /usuarios/{id}/mejores-amigos/{amigo_id} | Quitar | - | - | 204 |
| POST | /usuarios/{id}/bloqueo | Bloquear (borra seguimientos y mejores amigos en ambos sentidos) | - | {} | 204 |
| DELETE | /usuarios/{id}/bloqueo | Desbloquear | - | - | 204 |
| GET | /bloqueos | Mis bloqueados | limit=50 | - | UsuarioResumen[] |

DTOs:
- **Usuario**: `id`, `username`, `email`, `nombre`, `bio: string|null`, `es_privada: boolean`, `reels_desactivados: boolean`, `fecha_registro: ISODate`.
- **UsuarioResumen**: `id`, `username`, `nombre`.
- **Perfil**: `id`, `username`, `nombre`, `bio|null`, `es_privada`, `cantidad_posts`, `cantidad_seguidores`, `cantidad_seguidos`, `relacion: 'yo'|'siguiendo'|'pendiente'|'ninguna'`.
- **CreateUsuarioBody**: `username`, `email`, `password`, `nombre`, `bio?`.
- **UpdateUsuarioBody**: `nombre?`, `bio?`, `es_privada?`, `reels_desactivados?`.
- **Sugerencia**: UsuarioResumen + `en_comun: number`, `te_sigue: boolean`.
- **Estadisticas**: `cantidad_posts`, `promedio_likes_por_post`, `post_con_mas_likes: TopPost|null`, `seguidor_que_mas_likes_dio: TopSeguidor|null`. **TopPost**: `id`, `url_imagen`, `fecha_publicacion`, `likes`. **TopSeguidor**: UsuarioResumen + `likes`.
- **Seguimiento**: `seguidor_id`, `seguido_id`, `estado: 'pendiente'|'aceptado'`, `fecha`.
- **SolicitudAccionBody**: `accion: 'aceptar'|'rechazar'`.

## Posts, reels, likes, comentarios, feed, explorar y hashtags

| Método | Ruta | Descripción | Params | Body | Respuesta |
|---|---|---|---|---|---|
| POST | /posts | Crear post o reel (reel exige url_video) | - | CreatePostBody | Post |
| GET | /posts/{id} | Obtener (403 privada, 404 bloqueo/no existe) | - | - | Post |
| DELETE | /posts/{id} | Borrar (solo autor) | - | - | 204 |
| GET | /usuarios/{id}/posts | Posts de un usuario (403 si no autorizado) | tipo (foto/reel), limit, offset | - | Post[] |
| GET | /usuarios/{id}/reels | Reels de un usuario | limit, offset | - | Post[] |
| POST | /posts/{id}/like | Dar like (idempotente) | - | {} | Post |
| DELETE | /posts/{id}/like | Quitar like | - | - | 204 |
| GET | /posts/{id}/likes | Quién dio like | limit=50, offset | - | UsuarioResumen[] |
| GET | /posts/{id}/comentarios | Comentarios (fecha asc) | limit=50, offset | - | Comentario[] |
| POST | /posts/{id}/comentarios | Comentar (1 a 300 caracteres) | - | {texto} | Comentario |
| DELETE | /comentarios/{id} | Borrar (autor del comentario o dueño del post) | - | - | 204 |
| GET | /usuarios/{id}/feed | Feed de seguidos, fecha desc (solo dueño) | limit, offset | - | Post[] |
| GET | /usuarios/{id}/reels/feed | Reels recomendados (403 si reels_desactivados) | limit, offset | - | Post[] |
| GET | /usuarios/{id}/explorar | Explorar recomendado (con motivo) | limit, offset | - | Post[] |
| GET | /hashtags/tendencia | Top 10 hashtags (24 h, cuentas públicas) | - | - | HashtagTendencia[] |
| GET | /hashtags/{nombre}/posts | Posts públicos por likes | limit, offset | - | Post[] |

DTOs:
- **Post**: `id`, `usuario_id`, `autor_username`, `autor_nombre`, `tipo: 'foto'|'reel'`, `url_imagen`, `url_video|null`, `duracion_seg|null`, `descripcion|null`, `fecha_publicacion`, `cantidad_likes`, `cantidad_comentarios`, `me_gusta: boolean`, `motivo?: string|null` (explorar).
- **CreatePostBody**: `tipo`, `url_imagen`, `url_video?`, `duracion_seg?`, `descripcion?`.
- **Comentario**: `id`, `post_id`, `usuario_id`, `autor_username`, `texto`, `fecha`.
- **HashtagTendencia**: `nombre`, `cantidad_posts`.

## Stories y destacadas

| Método | Ruta | Descripción | Params | Body | Respuesta |
|---|---|---|---|---|---|
| POST | /stories | Crear story (vence a las 24 h) | - | CreateStoryBody | Story |
| GET | /usuarios/{id}/stories | Stories vigentes de mis seguidos (solo dueño) | - | - | StoriesDeUsuario[] |
| GET | /usuarios/{id}/stories/publicadas | Stories vigentes de {id} (según privacidad) | - | - | Story[] |
| GET | /usuarios/{id}/stories/archivo | Archivo incluidas vencidas (solo dueño) | - | - | Story[] |
| POST | /stories/{id}/vista | Registrar vista (una por usuario; el dueño no cuenta) | - | {} | 204 |
| GET | /stories/{id}/vistas | Quién la vio (solo dueño) | - | - | Vista[] |
| DELETE | /stories/{id} | Borrar (solo dueño) | - | - | 204 |
| GET | /usuarios/{id}/destacadas | Destacadas en orden | - | - | Destacada[] |
| POST | /destacadas | Crear destacada | - | CreateDestacadaBody | Destacada |
| GET | /destacadas/{id} | Destacada con sus stories | - | - | Destacada |
| PATCH | /destacadas/{id} | Editar | - | UpdateDestacadaBody | Destacada |
| DELETE | /destacadas/{id} | Borrar | - | - | 204 |
| POST | /destacadas/{id}/stories | Agregar story (va al final) | - | {story_id} | Destacada |
| DELETE | /destacadas/{id}/stories/{story_id} | Quitar story | - | - | 204 |
| PUT | /usuarios/{id}/destacadas/orden | Reordenar destacadas | - | {destacada_ids} (lista completa) | Destacada[] |
| PUT | /destacadas/{id}/orden | Reordenar stories | - | {story_ids} (lista completa) | Destacada |

DTOs:
- **Story**: `id`, `usuario_id`, `url_imagen`, `solo_mejores_amigos`, `fecha_publicacion`, `fecha_vencimiento`, `vista: boolean`.
- **StoriesDeUsuario**: `usuario: UsuarioResumen`, `todas_vistas`, `stories: Story[]`.
- **Vista**: UsuarioResumen + `fecha`.
- **CreateStoryBody**: `url_imagen`, `solo_mejores_amigos?`.
- **Destacada**: `id`, `usuario_id`, `titulo`, `portada_url|null`, `orden`, `stories: Story[]`.
- **CreateDestacadaBody**: `titulo`, `portada_url?`, `story_ids: number[]`. **UpdateDestacadaBody**: `titulo?`, `portada_url?`.

## Álbumes compartidos

| Método | Ruta | Descripción | Params | Body | Respuesta |
|---|---|---|---|---|---|
| POST | /albums | Crear (el creador entra como admin aceptado) | - | CreateAlbumBody | Album |
| GET | /albums/{id} | Obtener con miembros (403/404 si no es visible) | - | - | Album |
| PATCH | /albums/{id} | Editar (solo admin) | - | UpdateAlbumBody | Album |
| DELETE | /albums/{id} | Borrar (solo admin) | - | - | 204 |
| GET | /usuarios/{id}/albums | Álbumes donde {id} es miembro aceptado y que puedo ver | - | - | Album[] |
| POST | /albums/{id}/invitaciones | Invitar (solo admin; 400 si hay bloqueo) | - | {usuario_id} | Album |
| GET | /usuarios/{id}/invitaciones-album | Invitaciones pendientes (solo dueño) | - | - | Album[] |
| POST | /albums/{id}/invitaciones/aceptar | Aceptar invitación | - | {} | Album |
| DELETE | /albums/{id}/miembros/{usuario_id} | Quitar miembro, rechazar o salir | - | - | 204 |
| GET | /albums/{id}/items | Contenido (fecha desc) | limit=50, offset | - | AlbumItem[] |
| POST | /albums/{id}/items | Subir ítem (solo miembros aceptados) | - | CreateAlbumItemBody | AlbumItem |
| DELETE | /albums/{id}/items/{item_id} | Borrar ítem (autor o admin) | - | - | 204 |

DTOs:
- **Album**: `id`, `creador_id`, `titulo`, `descripcion|null`, `portada_url|null`, `fecha_creacion`, `miembros: AlbumMiembro[]`. **AlbumMiembro**: UsuarioResumen + `rol: 'admin'|'miembro'`, `estado: 'pendiente'|'aceptado'`.
- **CreateAlbumBody**: `titulo`, `descripcion?`, `portada_url?`. **UpdateAlbumBody**: los mismos, todos opcionales.
- **AlbumItem**: `id`, `album_id`, `usuario_id`, `url_imagen`, `descripcion|null`, `fecha`; TEMPORAL (ver `../../docs/TEMPORAL.md`, parche 3): `tipo?: 'foto'|'video'`, `url_video?: string|null`.
- **CreateAlbumItemBody**: `url_imagen`, `descripcion?`; TEMPORAL: `tipo?`, `url_video?`.

## Mensajes directos

| Método | Ruta | Descripción | Params | Body | Respuesta |
|---|---|---|---|---|---|
| GET | /conversaciones | Conversaciones aceptadas, por último mensaje | - | - | Conversacion[] |
| GET | /conversaciones/solicitudes | Conversaciones en estado solicitud | - | - | Conversacion[] |
| POST | /conversaciones | Crear (1 a 1 devuelve la existente) | - | CreateConversacionBody | Conversacion |
| GET | /conversaciones/{id}/mensajes | Mensajes, id desc (cursor por id) | limit (30), antes_de | - | Mensaje[] |
| POST | /conversaciones/{id}/mensajes | Enviar (403 si hay bloqueo) | - | CreateMensajeBody | Mensaje |
| POST | /conversaciones/{id}/aceptar | Aceptar solicitud | - | {} | Conversacion |
| POST | /conversaciones/{id}/leido | Marcar leída | - | {} | 204 |
| DELETE | /mensajes/{id} | Anular envío (solo emisor) | - | - | 204 |
| DELETE | /conversaciones/{id} | Salir / ocultar | - | - | 204 |

DTOs:
- **Mensaje**: `id`, `conversacion_id`, `emisor_id`, `texto|null`, `post_id|null`, `fecha`.
- **Conversacion**: `id`, `es_grupal`, `nombre|null`, `estado: 'solicitud'|'aceptada'`, `participantes: UsuarioResumen[]`, `ultimo_mensaje: Mensaje|null`, `no_leidos: number`.
- **CreateConversacionBody**: `participantes: number[]`, `nombre?`. **CreateMensajeBody**: `texto?`, `post_id?`.

## Endpoints temporales

Definidos en `src/services/temporal/index.ts`; el backend aún no los tiene. Cada uno responde desde el mock mientras su flag `VITE_TEMPORAL_*` esté activo (ver `../../docs/TEMPORAL.md`). Tipos en `src/types/temporal.ts`.

| Método | Ruta | Descripción | Params | Body | Respuesta |
|---|---|---|---|---|---|
| GET | /notificaciones | Notificaciones, fecha desc | limit=50, offset | - | Notificacion[] |
| POST | /notificaciones/{id}/leida | Marcar una como leída | - | {} | 204 |
| POST | /notificaciones/leidas | Marcar todas como leídas | - | {} | 204 |
| GET | /notificaciones/no-leidas/cantidad | Contador del badge | - | - | CantidadNoLeidas |
| GET | /usuarios | Buscar usuarios | q, limit=20, offset | - | UsuarioResumen[] |
| GET | /usuarios/{id}/resumen | Resolver usuario por id | - | - | UsuarioResumen |

DTOs propuestos:
- **Notificacion**: `id`, `tipo: 'seguidor_nuevo'|'solicitud_seguimiento'|'like'|'comentario'|'invitacion_album'|'invitacion_aceptada'|'album_contenido'|'album_participante'`, `actor: UsuarioResumen`, `post_id|null`, `album_id|null`, `url_miniatura|null`, `texto|null`, `leida: boolean`, `fecha: ISODate`.
- **CantidadNoLeidas**: `cantidad: number`.

## Agregados durante la construcción

(se completa al cerrar)
