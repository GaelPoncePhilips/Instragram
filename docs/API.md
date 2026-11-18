# API definitiva

Base: `/api`. Todas las rutas (salvo registro, login y `/health`) requieren `Authorization: Bearer <token>`.
`{yo}` = el `id` del usuario logueado: si una ruta tiene `{id}` y es "solo dueño", el token tiene que ser de ese usuario o devuelve **403**.

Paginación: `?limit=20&offset=0` (máx. `limit` = 50) en todos los listados.

Errores: `{"error": "NotFoundError", "message": "..."}` con 400 / 401 / 403 / 404 / 409.

Reglas transversales (aplican a todo):
- **Bloqueo** (HU10): si hay un bloqueo en cualquier sentido, el otro usuario es invisible → perfil, posts, stories, destacadas, álbumes y DMs dan **404**.
- **Privacidad** (HU4): contenido de cuenta privada solo para el dueño y seguidores `aceptados` → **403**.
- **Stories vencidas** (HU7): no aparecen nunca, salvo en el archivo del dueño y dentro de destacadas.

---

## Auth

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/login` | `{email, password}` → `{access_token}` |
| GET | `/auth/me` | Usuario logueado |

## Usuarios — HU1, HU4, HU12

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| POST | `/usuarios` | público | Registro `{username, email, password, nombre, bio?}`. 409 si username/email existen. Arranca pública. |
| GET | `/usuarios/{username}` | todos | Perfil + `cantidad_posts`, `cantidad_seguidores`, `cantidad_seguidos`, `relacion` (`siguiendo`/`pendiente`/`ninguna`). |
| PATCH | `/usuarios/{id}` | dueño | `{nombre?, bio?, es_privada?, reels_desactivados?}`. Privada → pública acepta las pendientes. |
| GET | `/usuarios/{id}/seguidores` | según privacidad | Seguidores aceptados |
| GET | `/usuarios/{id}/seguidos` | según privacidad | Seguidos aceptados |
| GET | `/usuarios/{id}/no-me-siguen` | dueño | A quiénes sigo y no me siguen |
| GET | `/usuarios/{id}/estadisticas?desde&hasta` | dueño | Promedio de likes por post, post con más likes, seguidor que más likes dio |

## Seguidores — HU3, HU8

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| POST | `/usuarios/{id}/seguir` | todos | `{yo}` sigue a `{id}`. Pública → `aceptado`, privada → `pendiente`. 400 a uno mismo, 409 duplicado. |
| DELETE | `/usuarios/{id}/seguir` | todos | Dejar de seguir / cancelar solicitud. Sale de los mejores amigos de `{id}`. |
| DELETE | `/usuarios/{id}/seguidores/{seguidor_id}` | dueño | Quitar a un seguidor (también sale de mejores amigos). |
| GET | `/usuarios/{id}/solicitudes` | dueño | Solicitudes pendientes |
| PATCH | `/usuarios/{id}/solicitudes/{seguidor_id}` | dueño | `{accion: "aceptar" \| "rechazar"}` (rechazar borra la fila) |

## Posts y Reels — HU2, HU4, HU5, EXTRA Reels

Un reel es un `Post` con `tipo = "reel"`: comparte likes, comentarios, hashtags, feed y estadísticas.

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| POST | `/posts` | todos | `{tipo: "foto"\|"reel", url_imagen, url_video?, duracion_seg?, descripcion?}`. Reel exige `url_video` (`url_imagen` = portada). Hashtags automáticos. |
| GET | `/posts/{id}` | según privacidad | Post con autor, likes, comentarios, `me_gusta` |
| DELETE | `/posts/{id}` | autor | |
| GET | `/usuarios/{id}/posts?tipo=` | según privacidad | Posts del usuario (403 si no autorizado) |
| GET | `/usuarios/{id}/reels` | según privacidad | Atajo de `?tipo=reel` |
| POST | `/posts/{id}/like` | si puede verlo | Idempotente |
| DELETE | `/posts/{id}/like` | todos | Quitar like |
| GET | `/posts/{id}/likes` | si puede verlo | Usuarios que dieron like (sin los bloqueados por el dueño) |
| GET | `/posts/{id}/comentarios` | si puede verlo | Sin los de bloqueados por el dueño |
| POST | `/posts/{id}/comentarios` | si puede verlo | `{texto}` 1–300 caracteres |
| DELETE | `/comentarios/{id}` | autor del comentario o dueño del post | |

## Feed, Reels y Explorar — HU6, EXTRA

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| GET | `/usuarios/{id}/feed` | dueño | Posts de seguidos aceptados, fecha desc. Incluye autor, likes, comentarios, `me_gusta`. Si `reels_desactivados`, excluye reels. |
| GET | `/usuarios/{id}/reels/feed` | dueño | Reels recomendados. 403 si `reels_desactivados`. |
| GET | `/usuarios/{id}/explorar` | dueño | Posts recomendados de cuentas públicas que no sigo (ver `RECOMENDACIONES.md`) |
| GET | `/usuarios/{id}/sugerencias` | dueño | Cuentas sugeridas para seguir |

## Stories — HU7, HU8, HU9

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| POST | `/stories` | todos | `{url_imagen, solo_mejores_amigos?}`. Vence a las 24 h. |
| GET | `/usuarios/{id}/stories` | dueño | Stories vigentes de los seguidos, agrupadas por usuario (respeta mejores amigos) |
| GET | `/usuarios/{id}/stories/publicadas` | según privacidad | Stories vigentes de `{id}` |
| GET | `/usuarios/{id}/stories/archivo` | dueño | Todas sus stories, incluidas vencidas |
| POST | `/stories/{id}/vista` | si puede verla | Registra vista (una por usuario, el dueño no cuenta) |
| GET | `/stories/{id}/vistas` | dueño de la story | Quiénes la vieron |
| DELETE | `/stories/{id}` | dueño | |

## Mejores amigos — HU8

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| GET | `/usuarios/{id}/mejores-amigos` | dueño | |
| POST | `/usuarios/{id}/mejores-amigos/{amigo_id}` | dueño | 400 si `amigo_id` no te sigue (`aceptado`) |
| DELETE | `/usuarios/{id}/mejores-amigos/{amigo_id}` | dueño | |

## Bloqueos — HU10

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| POST | `/usuarios/{id}/bloqueo` | todos | `{yo}` bloquea a `{id}`: borra seguimientos en ambos sentidos y mejores amigos en ambos sentidos |
| DELETE | `/usuarios/{id}/bloqueo` | todos | Desbloquear |
| GET | `/bloqueos` | todos | Mis bloqueados |

## Hashtags — HU11

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/hashtags/tendencia` | Top 10 por cantidad de posts de las últimas 24 h (solo cuentas públicas) |
| GET | `/hashtags/{nombre}/posts` | Posts públicos con ese hashtag, ordenados por likes |

## EXTRA: Destacadas (ordenables)

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| GET | `/usuarios/{id}/destacadas` | según privacidad | En el orden elegido por el dueño. Oculta stories de mejores amigos a quien no está en la lista. |
| POST | `/destacadas` | todos | `{titulo, portada_url?, story_ids: []}` (stories propias, pueden estar vencidas) |
| GET | `/destacadas/{id}` | según privacidad | Destacada con sus stories en orden |
| PATCH | `/destacadas/{id}` | dueño | `{titulo?, portada_url?}` |
| DELETE | `/destacadas/{id}` | dueño | |
| POST | `/destacadas/{id}/stories` | dueño | `{story_id}` (va al final) |
| DELETE | `/destacadas/{id}/stories/{story_id}` | dueño | |
| PUT | `/usuarios/{id}/destacadas/orden` | dueño | `{destacada_ids: [..]}` lista completa en el nuevo orden |
| PUT | `/destacadas/{id}/orden` | dueño | `{story_ids: [..]}` lista completa en el nuevo orden |

## EXTRA: Álbumes compartidos

Visible para: miembros `aceptados` **y** seguidores `aceptados` de cualquier miembro `aceptado` (salvo bloqueo con el creador). Solo los miembros suben items.

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| POST | `/albums` | todos | `{titulo, descripcion?, portada_url?}`. El creador entra como `admin` `aceptado`. |
| GET | `/albums/{id}` | visible | Álbum + miembros |
| PATCH | `/albums/{id}` | admin | |
| DELETE | `/albums/{id}` | admin | |
| GET | `/usuarios/{id}/albums` | según privacidad | Álbumes donde `{id}` es miembro aceptado y que el que consulta puede ver |
| POST | `/albums/{id}/invitaciones` | admin | `{usuario_id}` → miembro `pendiente`. 400 si hay bloqueo. |
| GET | `/usuarios/{id}/invitaciones-album` | dueño | Invitaciones pendientes |
| POST | `/albums/{id}/invitaciones/aceptar` | invitado | |
| DELETE | `/albums/{id}/miembros/{usuario_id}` | admin, o uno mismo (rechazar/salir) | Si se va el último admin, pasa al miembro más antiguo |
| GET | `/albums/{id}/items` | visible | Fecha desc |
| POST | `/albums/{id}/items` | miembro aceptado | `{url_imagen, descripcion?}` |
| DELETE | `/albums/{id}/items/{item_id}` | autor del item o admin | |

## EXTRA: DMs

Una conversación 1 a 1 es única por par. Si el destinatario no sigue al emisor, la conversación le llega como **solicitud** hasta que la acepte. Con bloqueo no se puede escribir.

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| GET | `/conversaciones` | todos | Mis conversaciones aceptadas, por último mensaje, con `no_leidos` |
| GET | `/conversaciones/solicitudes` | todos | Conversaciones en estado `solicitud` |
| POST | `/conversaciones` | todos | `{participantes: [ids], nombre?}`. 1 participante → devuelve la existente si ya hay. |
| GET | `/conversaciones/{id}/mensajes?limit&antes_de` | participante | Paginación por cursor (id de mensaje) |
| POST | `/conversaciones/{id}/mensajes` | participante | `{texto?, post_id?}` (al menos uno; compartir post respeta privacidad) |
| POST | `/conversaciones/{id}/aceptar` | participante | Acepta la solicitud |
| POST | `/conversaciones/{id}/leido` | participante | Marca todo como leído |
| DELETE | `/mensajes/{id}` | emisor | Anular envío |
| DELETE | `/conversaciones/{id}` | participante | Salir / ocultar |
