/** Auth, usuarios, seguidores, mejores amigos, bloqueos, estadísticas y sugerencias. */
import type {
  CreateUsuarioBody,
  Estadisticas,
  LoginBody,
  Paginacion,
  Perfil,
  Seguimiento,
  Sugerencia,
  TokenDTO,
  UpdateUsuarioBody,
  Usuario,
  UsuarioResumen,
} from '../types/api'
import { api } from './client'

// ---------- Auth

/** POST /auth/login — body {email, password} → {access_token, token_type} */
export const login = (body: LoginBody) => api.post<TokenDTO>('/auth/login', body)

/** GET /auth/me → Usuario (sin password) */
export const me = () => api.get<Usuario>('/auth/me')

// ---------- Usuarios (HU1, HU4, HU12)

/** POST /usuarios — body {username, email, password, nombre, bio?} → Usuario. 409 si username/email existen */
export const registrar = (body: CreateUsuarioBody) => api.post<Usuario>('/usuarios', body)

/** GET /usuarios/{username} → Perfil (con contadores y relacion). 404 si no existe o hay bloqueo */
export const perfil = (username: string) => api.get<Perfil>(`/usuarios/${encodeURIComponent(username)}`)

/** PATCH /usuarios/{id} — body {nombre?, bio?, es_privada?, reels_desactivados?} → Usuario. Solo dueño */
export const actualizarUsuario = (id: number, body: UpdateUsuarioBody) => api.patch<Usuario>(`/usuarios/${id}`, body)

/** GET /usuarios/{id}/seguidores?limit&offset → UsuarioResumen[]. 403 privada */
export const seguidores = (id: number, p: Paginacion = {}) => api.get<UsuarioResumen[]>(`/usuarios/${id}/seguidores`, { ...p })

/** GET /usuarios/{id}/seguidos?limit&offset → UsuarioResumen[]. 403 privada */
export const seguidos = (id: number, p: Paginacion = {}) => api.get<UsuarioResumen[]>(`/usuarios/${id}/seguidos`, { ...p })

/** GET /usuarios/{id}/no-me-siguen?limit&offset → UsuarioResumen[]. Solo dueño */
export const noMeSiguen = (id: number, p: Paginacion = {}) => api.get<UsuarioResumen[]>(`/usuarios/${id}/no-me-siguen`, { ...p })

/** GET /usuarios/{id}/estadisticas?desde&hasta (YYYY-MM-DD) → Estadisticas. Solo dueño */
export const estadisticas = (id: number, desde?: string, hasta?: string) =>
  api.get<Estadisticas>(`/usuarios/${id}/estadisticas`, { desde, hasta })

/** GET /usuarios/{id}/sugerencias?limit&offset → Sugerencia[]. Solo dueño */
export const sugerencias = (id: number, p: Paginacion = {}) => api.get<Sugerencia[]>(`/usuarios/${id}/sugerencias`, { ...p })

// ---------- Seguidores (HU3, HU8)

/** POST /usuarios/{id}/seguir → Seguimiento (aceptado si pública, pendiente si privada). 400 a uno mismo, 409 duplicado */
export const seguir = (id: number) => api.post<Seguimiento>(`/usuarios/${id}/seguir`)

/** DELETE /usuarios/{id}/seguir → 204. Dejar de seguir o cancelar solicitud */
export const dejarDeSeguir = (id: number) => api.del(`/usuarios/${id}/seguir`)

/** DELETE /usuarios/{id}/seguidores/{seguidor_id} → 204. Quitar a un seguidor (solo dueño) */
export const quitarSeguidor = (id: number, seguidorId: number) => api.del(`/usuarios/${id}/seguidores/${seguidorId}`)

/** GET /usuarios/{id}/solicitudes?limit&offset → Seguimiento[] pendientes. Solo dueño */
export const solicitudes = (id: number, p: Paginacion = {}) => api.get<Seguimiento[]>(`/usuarios/${id}/solicitudes`, { ...p })

/** PATCH /usuarios/{id}/solicitudes/{seguidor_id} — body {accion: "aceptar"|"rechazar"} → Seguimiento | 204 */
export const responderSolicitud = (id: number, seguidorId: number, accion: 'aceptar' | 'rechazar') =>
  api.patch<Seguimiento | undefined>(`/usuarios/${id}/solicitudes/${seguidorId}`, { accion })

// ---------- Mejores amigos (HU8)

/** GET /usuarios/{id}/mejores-amigos → UsuarioResumen[]. Solo dueño */
export const mejoresAmigos = (id: number) => api.get<UsuarioResumen[]>(`/usuarios/${id}/mejores-amigos`, { limit: 50 })

/** POST /usuarios/{id}/mejores-amigos/{amigo_id} → 204. 400 si amigo no te sigue (aceptado) */
export const agregarMejorAmigo = (id: number, amigoId: number) => api.post<void>(`/usuarios/${id}/mejores-amigos/${amigoId}`)

/** DELETE /usuarios/{id}/mejores-amigos/{amigo_id} → 204 */
export const quitarMejorAmigo = (id: number, amigoId: number) => api.del(`/usuarios/${id}/mejores-amigos/${amigoId}`)

// ---------- Bloqueos (HU10)

/** POST /usuarios/{id}/bloqueo → 204. Borra seguimientos y mejores amigos en ambos sentidos */
export const bloquear = (id: number) => api.post<void>(`/usuarios/${id}/bloqueo`)

/** DELETE /usuarios/{id}/bloqueo → 204 */
export const desbloquear = (id: number) => api.del(`/usuarios/${id}/bloqueo`)

/** GET /bloqueos → UsuarioResumen[] (mis bloqueados) */
export const bloqueados = () => api.get<UsuarioResumen[]>('/bloqueos', { limit: 50 })
