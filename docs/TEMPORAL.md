# Parches temporales del frontend

Lista de piezas que el frontend inventó porque el contrato (`API.md`) o el backend todavía no las ofrecen. Cada una está marcada `// TEMPORAL`, aislada en `frontend/src/services/temporal/` o `frontend/src/mocks/temporal/`, y se apaga con un flag `VITE_TEMPORAL_<NOMBRE>=false` (definidos en `frontend/src/config/env.ts`; por defecto activos).

## Mecanismo general

- `temporalRequest(flag, método, ruta, opts)` en `frontend/src/services/client.ts`: si el flag está activo responde desde el mock en memoria (`src/mocks`) aunque `VITE_USE_MOCK=false`; si el flag está apagado, va al backend real con `fetch`.
- Con backend real, el mock no reconoce el JWT. Por eso `setTemporalIdentity(username)` (se llama al iniciar sesión / `me()`) hace que el mock identifique al usuario por username; si no existe en el seed, usa el primer usuario del seed.
- Los datos del mock se reinician al recargar. Cuando el backend implemente un endpoint: apagar el flag, verificar, y borrar el código marcado.

## 1. Notificaciones

- Flag: `VITE_TEMPORAL_NOTIFICACIONES`.
- Falta en el backend: no hay modelo ni endpoints de notificaciones.
- Mock: `src/mocks/notificar.ts` las genera al invitar a un álbum, aceptar invitación, subir contenido a un álbum, seguir, solicitar seguir, dar like y comentar.
- Endpoints propuestos:
  - `GET /notificaciones?limit&offset` → lista, fecha desc.
  - `POST /notificaciones/{id}/leida` → 204.
  - `POST /notificaciones/leidas` → 204.
  - `GET /notificaciones/no-leidas/cantidad` → `{"cantidad": 3}`.
  ```json
  [{"id": 12, "tipo": "like", "actor": {"id": 2, "username": "bruno.dev", "nombre": "Bruno"},
    "post_id": 5, "album_id": null, "url_miniatura": "https://.../5.jpg",
    "texto": null, "leida": false, "fecha": "2026-11-18T10:00:00Z"}]
  ```
  Tipos: `seguidor_nuevo`, `solicitud_seguimiento`, `like`, `comentario`, `invitacion_album`, `invitacion_aceptada`, `album_contenido`, `album_participante`.
- Al implementar: borrar/editar `frontend/src/services/temporal/index.ts` (sección notificaciones; pasar a `services/` con `request`), `frontend/src/mocks/temporal/handlers.ts`, `frontend/src/mocks/notificar.ts` (y sus llamadas desde los handlers del mock), `frontend/src/types/temporal.ts` (mover tipos a `types/api.ts`), flag en `config/env.ts`, `stores/badges.ts`.

## 2. Búsqueda de usuarios

- Flag: `VITE_TEMPORAL_BUSQUEDA`.
- Falta: no hay forma de buscar usuarios (solo `GET /usuarios/{username}` exacto).
- Endpoint propuesto: `GET /usuarios?q=ana&limit=20&offset=0` (coincidencia parcial en username o nombre; excluye bloqueos en ambos sentidos).
  ```json
  [{"id": 1, "username": "ana.rios", "nombre": "Ana Ríos"}]
  ```
- Al implementar: editar `src/services/temporal/index.ts` (`buscarUsuarios`) y `src/mocks/temporal/handlers.ts`; flag en `config/env.ts`.

## 3. Videos en álbumes

- Flag: `VITE_TEMPORAL_ALBUM_VIDEO`.
- Falta: `AlbumItem` solo tiene `url_imagen`; no admite videos.
- Propuesta: campos `tipo` (`"foto"|"video"`) y `url_video` (nullable) en `AlbumItem` y en el body de `POST /albums/{id}/items`.
  ```json
  {"id": 7, "album_id": 1, "usuario_id": 2, "url_imagen": "https://.../poster.jpg", "descripcion": null,
   "fecha": "2026-11-18T10:00:00Z", "tipo": "video", "url_video": "https://.../clip.mp4"}
  ```
- Mientras tanto el frontend los envía igual (campos opcionales en `AlbumItem` / `CreateAlbumItemBody`) y, si el backend los ignora, `src/services/temporal/albumVideo.ts` los guarda en localStorage por id de ítem.
- Al implementar: borrar `src/services/temporal/albumVideo.ts`, quitar `conVideo`/`guardarVideo` de `src/services/albums.ts`, quitar la marca TEMPORAL de `src/types/api.ts`, flag en `config/env.ts`.

## 4. Subida de archivos

- Sin flag. El contrato recibe URLs, no archivos.
- Hoy: `urlDeArchivo(file)` (URL de objeto, vive mientras la pestaña esté abierta) y `urlAleatoria()` (imagen de picsum) en `src/services/temporal/local.ts`; usados por `src/features/create/MediaPicker.tsx`.
- Endpoint propuesto: `POST /uploads` (multipart/form-data, campo `archivo`) → `{"url": "https://.../uploads/abc123.jpg"}`; validar tipo (imagen/video) y tamaño.
- Al implementar: reemplazar `urlDeArchivo` por una llamada a `/uploads` (nuevo `services/uploads.ts`), borrar `urlAleatoria` y editar `MediaPicker.tsx`.

## 5. Formas de respuesta

No es un parche: las formas de respuesta se tomaron de los DTOs Pydantic (`backend/src/dtos`) y se documentan en `frontend/docs/API.md`.

## 6. Avatares

- Flag: `VITE_TEMPORAL_AVATARES`.
- Falta: ninguna entidad tiene foto de perfil. Hoy `avatarUrl(username)` deriva una imagen de picsum; si falla, se muestran iniciales.
- Propuesta: campo `url_avatar` (nullable) en `Usuario`, `UsuarioResumen` y `Perfil`, y `PATCH /usuarios/{id}` con `{"url_avatar": "https://.../a.jpg"}`.
- Al implementar: borrar `avatarUrl` de `src/services/temporal/local.ts`, editar `src/components/ui/Avatar.tsx` para usar `url_avatar`, agregar el campo en `src/types/api.ts`, flag en `config/env.ts`.

## 7. Usuario por id

- Flag: `VITE_TEMPORAL_USUARIOS_POR_ID`.
- Falta: hay datos con solo un id (p. ej. `Seguimiento.seguidor_id`, `AlbumItem.usuario_id`) y no hay forma de obtener el usuario.
- Endpoint propuesto: `GET /usuarios/{id}/resumen` → `{"id": 2, "username": "bruno.dev", "nombre": "Bruno"}`.
- Alternativa: que `GET /usuarios/{id}/solicitudes` devuelva `UsuarioResumen` y que `AlbumItem` incluya `autor_username`.
- Al implementar: borrar `usuarioPorId`/`recordarUsuario` de `src/services/temporal/index.ts` y sus usos, y el handler en `src/mocks/temporal/handlers.ts`.

## 10. Guardar posts

- Flag: `VITE_TEMPORAL_GUARDADOS`.
- Falta: no existe la función de guardar. Hoy `estaGuardado`/`alternarGuardado` en `src/services/temporal/local.ts` usan localStorage (por navegador, no por cuenta).
- Endpoints propuestos: `POST /posts/{id}/guardado` → 204; `DELETE /posts/{id}/guardado` → 204; `GET /usuarios/{id}/guardados?limit&offset` → `Post[]` (solo dueño). Conviene sumar `guardado: boolean` al `Post`.
- Al implementar: borrar las funciones de guardados de `src/services/temporal/local.ts` y editar las pantallas que las usan (post, perfil).

## 11. Cuentas de desarrollo del switcher

- Flag: `VITE_TEMPORAL_DEV_CUENTAS`.
- Qué es: el `DevSwitcher` (`src/app/layout/DevSwitcher.tsx`) permite cambiar de cuenta con las credenciales de prueba del seed del mock (`DEV_CUENTAS` en `src/mocks/seed.ts`; contraseña `keepsy123`, email = username sin "." ni "_" + `@keepsy.dev`).
- Con backend real hay que crear esos usuarios con contraseña `keepsy123` (seed del backend) o desactivar el flag (`VITE_TEMPORAL_DEV_CUENTAS=false`); nunca activarlo en producción.
- Al implementar: borrar `cuentasDev` de `src/services/temporal/local.ts` y `DevSwitcher.tsx`.

## Agregados durante la construcción

- **Usuario temporal en el mock con backend real**: `setTemporalIdentity` en `src/services/client.ts` + `tokenParaUsername` en `src/mocks/server.ts`. Con el backend real, los endpoints temporales identifican al usuario por su `username`. Se borra junto con el último parche temporal.
- **Conversación por id**: no existe `GET /conversaciones/{id}`. El chat busca la conversación entre `GET /conversaciones` y `GET /conversaciones/solicitudes` (`src/features/dm/Chat.tsx`). Endpoint propuesto: `GET /conversaciones/{id}` → `ConversacionDTO`. No hace falta flag: es una lectura con los endpoints que ya existen.
- **Relación en listas**: las listas de seguidores, likes y sugerencias no traen `relacion`. Se deduce cargando `seguidos(yo)`, o se muestra "Ver perfil". Propuesta: agregar `relacion` a `UsuarioResumen` cuando el que consulta no es el dueño.
- **Hueco 12 — Invitación a álbum por DM con call to action** (`VITE_TEMPORAL_DM_INVITACION`). Al invitar, además de la notificación se manda un DM al invitado. El contrato no tiene un mensaje con `album_id`, así que el DM viaja como `texto` con el enlace `/albumes/{id}` y el chat lo detecta para dibujar una tarjeta con portada, participantes y los botones **Unirme** / **Ver**.
  - Archivos: `src/services/temporal/invitacionDm.ts`, llamada en `invitar()` de `src/services/albums.ts`, tarjeta `InvitacionAlbumCard` en `src/features/dm/Burbuja.tsx`, vista previa en `src/features/dm/Inbox.tsx`, DM de ejemplo en `src/mocks/seed.ts`.
  - Propuesta para el backend: que `POST /albums/{id}/invitaciones` cree el DM en el mismo paso, con `Mensaje.album_id: int | null` (análogo a `post_id`). Respuesta de `GET /conversaciones/{id}/mensajes`: `{"id": 1, "conversacion_id": 3, "emisor_id": 7, "texto": null, "post_id": null, "album_id": 2, "fecha": "..."}`.
  - Cuando exista: borrar `invitacionDm.ts`, sacar la llamada en `invitar()` y leer `album_id` en `Burbuja.tsx`.

