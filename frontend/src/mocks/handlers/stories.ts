/** Stories (HU7, HU8, HU9) y destacadas ordenables (EXTRA). */
import type { Destacada, StoriesDeUsuario, Vista } from '../../types/api'
import type { Db, DbDestacada, DbStory } from '../db'
import { addHours, nextId, nowIso } from '../db'
import {
  assertDueno,
  assertPuedeVer,
  badRequest,
  forbidden,
  notFound,
  resumen,
  storyDTO,
  storyVisiblePara,
  usuario,
  vigente,
} from '../rules'
import { route } from '../server'
import { idParam, numArray, obj, optBool, optStr, reqStr } from './util'

route('POST', '/stories', ({ db, yo, body }) => {
  const b = obj(body)
  const url_imagen = reqStr(b, 'url_imagen')
  const solo = optBool(b, 'solo_mejores_amigos') ?? false
  const ahora = nowIso()
  const s: DbStory = {
    id: nextId(db, 'stories'),
    usuario_id: yo,
    url_imagen,
    solo_mejores_amigos: solo,
    fecha_publicacion: ahora,
    fecha_vencimiento: addHours(ahora, 24),
  }
  db.stories.push(s)
  return storyDTO(db, s, yo)
})

const porFecha = (a: DbStory, b: DbStory) => a.fecha_publicacion.localeCompare(b.fecha_publicacion)

route('GET', '/usuarios/{id}/stories', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  assertDueno(yo, id)
  const seguidos = db.seguidores.filter((s) => s.seguidor_id === id && s.estado === 'aceptado').map((s) => s.seguido_id)
  const grupos: (StoriesDeUsuario & { ultima: string })[] = []
  for (const uid of seguidos) {
    const stories = db.stories
      .filter((s) => s.usuario_id === uid && vigente(s) && storyVisiblePara(db, s, id))
      .sort(porFecha)
    if (!stories.length) continue
    const dtos = stories.map((s) => storyDTO(db, s, id))
    grupos.push({
      usuario: resumen(usuario(db, uid)),
      todas_vistas: dtos.every((s) => s.vista),
      stories: dtos,
      ultima: stories[stories.length - 1].fecha_publicacion,
    })
  }
  grupos.sort((a, b) => Number(a.todas_vistas) - Number(b.todas_vistas) || b.ultima.localeCompare(a.ultima))
  return grupos.map((g): StoriesDeUsuario => ({ usuario: g.usuario, todas_vistas: g.todas_vistas, stories: g.stories }))
})

route('GET', '/usuarios/{id}/stories/publicadas', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  assertPuedeVer(db, yo, id)
  return db.stories
    .filter((s) => s.usuario_id === id && vigente(s) && storyVisiblePara(db, s, yo))
    .sort(porFecha)
    .map((s) => storyDTO(db, s, yo))
})

route('GET', '/usuarios/{id}/stories/archivo', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  assertDueno(yo, id)
  return db.stories
    .filter((s) => s.usuario_id === id)
    .sort((a, b) => b.fecha_publicacion.localeCompare(a.fecha_publicacion))
    .map((s) => storyDTO(db, s, yo))
})

function storyOr404(db: Db, id: number): DbStory {
  const s = db.stories.find((x) => x.id === id)
  if (!s) throw notFound('Story no encontrada')
  return s
}

/** Puede verla si: vigente o en una destacada, el dueño es visible y respeta mejores amigos. */
function assertPuedeVerStory(db: Db, yo: number, s: DbStory): void {
  assertPuedeVer(db, yo, s.usuario_id)
  const enDestacada = db.destacadas.some((d) => d.story_ids.includes(s.id))
  if (!vigente(s) && !enDestacada && s.usuario_id !== yo) throw notFound('Story no encontrada')
  if (!storyVisiblePara(db, s, yo)) throw notFound('Story no encontrada')
}

route('POST', '/stories/{id}/vista', ({ db, yo, params }) => {
  const s = storyOr404(db, idParam(params, 'id'))
  assertPuedeVerStory(db, yo, s)
  if (s.usuario_id !== yo && !db.vistas.some((v) => v.story_id === s.id && v.usuario_id === yo)) {
    db.vistas.push({ story_id: s.id, usuario_id: yo, fecha: nowIso() })
  }
  return undefined
})

route('GET', '/stories/{id}/vistas', ({ db, yo, params }) => {
  const s = storyOr404(db, idParam(params, 'id'))
  if (s.usuario_id !== yo) throw forbidden('Solo el dueño ve quién vio la story')
  return db.vistas
    .filter((v) => v.story_id === s.id)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map((v): Vista => ({ ...resumen(usuario(db, v.usuario_id)), fecha: v.fecha }))
})

route('DELETE', '/stories/{id}', ({ db, yo, params }) => {
  const s = storyOr404(db, idParam(params, 'id'))
  if (s.usuario_id !== yo) throw forbidden('Solo el dueño puede borrar la story')
  db.stories = db.stories.filter((x) => x.id !== s.id)
  db.vistas = db.vistas.filter((v) => v.story_id !== s.id)
  for (const d of db.destacadas) d.story_ids = d.story_ids.filter((x) => x !== s.id)
  return undefined
})

// ---------- Destacadas
function destacadaDTO(db: Db, d: DbDestacada, yo: number): Destacada | null {
  const stories = d.story_ids
    .map((id) => db.stories.find((s) => s.id === id))
    .filter((s): s is DbStory => s !== undefined)
    .filter((s) => storyVisiblePara(db, s, yo))
    .map((s) => storyDTO(db, s, yo))
  if (!stories.length && d.usuario_id !== yo) return null
  return {
    id: d.id,
    usuario_id: d.usuario_id,
    titulo: d.titulo,
    portada_url: d.portada_url ?? stories[0]?.url_imagen ?? null,
    orden: d.orden,
    stories,
  }
}

function destacadaOr404(db: Db, id: number): DbDestacada {
  const d = db.destacadas.find((x) => x.id === id)
  if (!d) throw notFound('Destacada no encontrada')
  return d
}

function destacadasDe(db: Db, uid: number, yo: number): Destacada[] {
  return db.destacadas
    .filter((d) => d.usuario_id === uid)
    .sort((a, b) => a.orden - b.orden)
    .map((d) => destacadaDTO(db, d, yo))
    .filter((d): d is Destacada => d !== null)
}

function assertStoriesPropias(db: Db, yo: number, ids: number[]): void {
  for (const id of ids) {
    const s = db.stories.find((x) => x.id === id)
    if (!s) throw badRequest(`La story ${id} no existe`)
    if (s.usuario_id !== yo) throw forbidden('Solo podés destacar tus propias stories')
  }
}

route('GET', '/usuarios/{id}/destacadas', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  assertPuedeVer(db, yo, id)
  return destacadasDe(db, id, yo)
})

route('POST', '/destacadas', ({ db, yo, body }) => {
  const b = obj(body)
  const titulo = reqStr(b, 'titulo', 30)
  const portada_url = optStr(b, 'portada_url') ?? null
  const story_ids = [...new Set(numArray(b, 'story_ids'))]
  if (!story_ids.length) throw badRequest('Elegí al menos una story')
  assertStoriesPropias(db, yo, story_ids)
  const orden = Math.max(-1, ...db.destacadas.filter((d) => d.usuario_id === yo).map((d) => d.orden)) + 1
  const d: DbDestacada = { id: nextId(db, 'destacadas'), usuario_id: yo, titulo, portada_url, orden, story_ids }
  db.destacadas.push(d)
  const dto = destacadaDTO(db, d, yo)
  if (!dto) throw notFound()
  return dto
})

route('GET', '/destacadas/{id}', ({ db, yo, params }) => {
  const d = destacadaOr404(db, idParam(params, 'id'))
  assertPuedeVer(db, yo, d.usuario_id)
  const dto = destacadaDTO(db, d, yo)
  if (!dto) throw notFound('Destacada no encontrada')
  return dto
})

function propia(db: Db, yo: number, id: number): DbDestacada {
  const d = destacadaOr404(db, id)
  if (d.usuario_id !== yo) throw forbidden('Solo el dueño')
  return d
}

route('PATCH', '/destacadas/{id}', ({ db, yo, params, body }) => {
  const d = propia(db, yo, idParam(params, 'id'))
  const b = obj(body)
  const titulo = optStr(b, 'titulo', 30)
  const portada = optStr(b, 'portada_url')
  if (titulo !== undefined) {
    if (!titulo?.trim()) throw badRequest('El título no puede estar vacío')
    d.titulo = titulo.trim()
  }
  if (portada !== undefined) d.portada_url = portada
  return destacadaDTO(db, d, yo)
})

route('DELETE', '/destacadas/{id}', ({ db, yo, params }) => {
  const d = propia(db, yo, idParam(params, 'id'))
  db.destacadas = db.destacadas.filter((x) => x.id !== d.id)
  return undefined
})

route('POST', '/destacadas/{id}/stories', ({ db, yo, params, body }) => {
  const d = propia(db, yo, idParam(params, 'id'))
  const sid = obj(body).story_id
  if (typeof sid !== 'number') throw badRequest('story_id es obligatorio')
  assertStoriesPropias(db, yo, [sid])
  if (!d.story_ids.includes(sid)) d.story_ids.push(sid)
  return destacadaDTO(db, d, yo)
})

route('DELETE', '/destacadas/{id}/stories/{story_id}', ({ db, yo, params }) => {
  const d = propia(db, yo, idParam(params, 'id'))
  const sid = idParam(params, 'story_id')
  d.story_ids = d.story_ids.filter((x) => x !== sid)
  return undefined
})

route('PUT', '/usuarios/{id}/destacadas/orden', ({ db, yo, params, body }) => {
  const id = idParam(params, 'id')
  assertDueno(yo, id)
  const ids = numArray(obj(body), 'destacada_ids')
  const mias = db.destacadas.filter((d) => d.usuario_id === id)
  if (ids.length !== mias.length || !mias.every((d) => ids.includes(d.id)))
    throw badRequest('Mandá la lista completa de tus destacadas')
  ids.forEach((did, i) => {
    const d = mias.find((x) => x.id === did)
    if (d) d.orden = i
  })
  return destacadasDe(db, id, yo)
})

route('PUT', '/destacadas/{id}/orden', ({ db, yo, params, body }) => {
  const d = propia(db, yo, idParam(params, 'id'))
  const ids = numArray(obj(body), 'story_ids')
  if (ids.length !== d.story_ids.length || !d.story_ids.every((s) => ids.includes(s)))
    throw badRequest('Mandá la lista completa de stories')
  d.story_ids = ids
  return destacadaDTO(db, d, yo)
})
