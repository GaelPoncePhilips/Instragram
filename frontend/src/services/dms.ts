/** Mensajes directos (EXTRA). */
import type { Conversacion, CreateConversacionBody, CreateMensajeBody, Mensaje } from '../types/api'
import { api } from './client'

/** GET /conversaciones → Conversacion[] aceptadas, por último mensaje, con no_leidos */
export const conversaciones = () => api.get<Conversacion[]>('/conversaciones')

/** GET /conversaciones/solicitudes → Conversacion[] en estado solicitud */
export const solicitudesDeMensaje = () => api.get<Conversacion[]>('/conversaciones/solicitudes')

/** POST /conversaciones — body {participantes: ids, nombre?} → Conversacion (1 a 1 devuelve la existente) */
export const crearConversacion = (body: CreateConversacionBody) => api.post<Conversacion>('/conversaciones', body)

/** GET /conversaciones/{id}/mensajes?limit&antes_de → Mensaje[] (id desc, cursor = id de mensaje) */
export const mensajes = (id: number, antesDe?: number, limit = 30) =>
  api.get<Mensaje[]>(`/conversaciones/${id}/mensajes`, { limit, antes_de: antesDe })

/** POST /conversaciones/{id}/mensajes — body {texto?, post_id?} → Mensaje. 403 si hay bloqueo */
export const enviarMensaje = (id: number, body: CreateMensajeBody) => api.post<Mensaje>(`/conversaciones/${id}/mensajes`, body)

/** POST /conversaciones/{id}/aceptar → Conversacion */
export const aceptarConversacion = (id: number) => api.post<Conversacion>(`/conversaciones/${id}/aceptar`)

/** POST /conversaciones/{id}/leido → 204 */
export const marcarLeido = (id: number) => api.post<void>(`/conversaciones/${id}/leido`)

/** DELETE /mensajes/{id} → 204. Anular envío (solo emisor) */
export const anularMensaje = (id: number) => api.del(`/mensajes/${id}`)

/** DELETE /conversaciones/{id} → 204. Salir / ocultar */
export const salirDeConversacion = (id: number) => api.del(`/conversaciones/${id}`)
