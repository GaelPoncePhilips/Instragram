/** Stories (HU7, HU8, HU9) y destacadas (EXTRA). */
import type {
  CreateDestacadaBody,
  CreateStoryBody,
  Destacada,
  StoriesDeUsuario,
  Story,
  UpdateDestacadaBody,
  Vista,
} from '../types/api'
import { api } from './client'

/** POST /stories — body {url_imagen, solo_mejores_amigos?} → Story. Vence a las 24 h */
export const crearStory = (body: CreateStoryBody) => api.post<Story>('/stories', body)

/** GET /usuarios/{id}/stories → StoriesDeUsuario[] de mis seguidos (vigentes, respeta mejores amigos). Solo dueño */
export const storiesDeSeguidos = (id: number) => api.get<StoriesDeUsuario[]>(`/usuarios/${id}/stories`)

/** GET /usuarios/{id}/stories/publicadas → Story[] vigentes de {id}. Según privacidad */
export const storiesPublicadas = (id: number) => api.get<Story[]>(`/usuarios/${id}/stories/publicadas`)

/** GET /usuarios/{id}/stories/archivo → Story[] incluidas vencidas. Solo dueño */
export const archivoStories = (id: number) => api.get<Story[]>(`/usuarios/${id}/stories/archivo`)

/** POST /stories/{id}/vista → 204. Una por usuario; el dueño no cuenta */
export const registrarVista = (id: number) => api.post<void>(`/stories/${id}/vista`)

/** GET /stories/{id}/vistas → Vista[]. Solo dueño de la story */
export const vistasDeStory = (id: number) => api.get<Vista[]>(`/stories/${id}/vistas`)

/** DELETE /stories/{id} → 204. Solo dueño */
export const borrarStory = (id: number) => api.del(`/stories/${id}`)

// ---------- Destacadas

/** GET /usuarios/{id}/destacadas → Destacada[] en el orden del dueño */
export const destacadasDe = (id: number) => api.get<Destacada[]>(`/usuarios/${id}/destacadas`)

/** POST /destacadas — body {titulo, portada_url?, story_ids} → Destacada */
export const crearDestacada = (body: CreateDestacadaBody) => api.post<Destacada>('/destacadas', body)

/** GET /destacadas/{id} → Destacada con sus stories */
export const obtenerDestacada = (id: number) => api.get<Destacada>(`/destacadas/${id}`)

/** PATCH /destacadas/{id} — body {titulo?, portada_url?} → Destacada */
export const editarDestacada = (id: number, body: UpdateDestacadaBody) => api.patch<Destacada>(`/destacadas/${id}`, body)

/** DELETE /destacadas/{id} → 204 */
export const borrarDestacada = (id: number) => api.del(`/destacadas/${id}`)

/** POST /destacadas/{id}/stories — body {story_id} → Destacada (la story va al final) */
export const agregarStoryADestacada = (id: number, storyId: number) =>
  api.post<Destacada>(`/destacadas/${id}/stories`, { story_id: storyId })

/** DELETE /destacadas/{id}/stories/{story_id} → 204 */
export const quitarStoryDeDestacada = (id: number, storyId: number) => api.del(`/destacadas/${id}/stories/${storyId}`)

/** PUT /usuarios/{id}/destacadas/orden — body {destacada_ids} (lista completa) → Destacada[] */
export const ordenarDestacadas = (usuarioId: number, ids: number[]) =>
  api.put<Destacada[]>(`/usuarios/${usuarioId}/destacadas/orden`, { destacada_ids: ids })

/** PUT /destacadas/{id}/orden — body {story_ids} (lista completa) → Destacada */
export const ordenarStoriesDeDestacada = (id: number, storyIds: number[]) =>
  api.put<Destacada>(`/destacadas/${id}/orden`, { story_ids: storyIds })
