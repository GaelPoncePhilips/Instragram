/** Posts y reels (HU2, HU4, HU5), feed (HU6), explorar/reels recomendados, hashtags (HU11). */
import type { HashtagTendencia, TipoPost } from '../../types/api'
import type { Db, DbPost } from '../db'
import { hoursAgo, nextId, nowIso } from '../db'
import { notificar, quitarNotificacion } from '../notificar'
import {
  assertDueno,
  assertPuedeVer,
  badRequest,
  comentarioDTO,
  forbidden,
  hashtagsDe,
  hayBloqueo,
  notFound,
  paginar,
  porFechaDesc,
  postDTO,
  postOr404,
  puedeVer,
  resumen,
  sigue,
  usuario,
} from '../rules'
import { route } from '../server'
import { idParam, obj, optNum, optStr, reqStr } from './util'

route('POST', '/posts', ({ db, yo, body }) => {
  const b = obj(body)
  const tipoRaw = b.tipo ?? 'foto'
  if (tipoRaw !== 'foto' && tipoRaw !== 'reel') throw badRequest('tipo debe ser "foto" o "reel"')
  const tipo: TipoPost = tipoRaw
  const url_imagen = reqStr(b, 'url_imagen')
  const url_video = optStr(b, 'url_video') ?? null
  if (tipo === 'reel' && !url_video) throw badRequest('Un reel necesita url_video')
  if (tipo === 'foto' && url_video) throw badRequest('Una foto no lleva url_video')
  const descripcion = optStr(b, 'descripcion', 2200) ?? null
  const p: DbPost = {
    id: nextId(db, 'posts'),
    usuario_id: yo,
    tipo,
    url_imagen,
    url_video,
    duracion_seg: tipo === 'reel' ? (optNum(b, 'duracion_seg') ?? null) : null,
    descripcion: descripcion?.trim() ? descripcion.trim() : null,
    fecha_publicacion: nowIso(),
  }
  db.posts.push(p)
  return postDTO(db, p, yo)
})

route('GET', '/posts/{id}', ({ db, yo, params }) => {
  const p = postOr404(db, idParam(params, 'id'))
  assertPuedeVer(db, yo, p.usuario_id)
  return postDTO(db, p, yo)
})

route('DELETE', '/posts/{id}', ({ db, yo, params }) => {
  const p = postOr404(db, idParam(params, 'id'))
  if (p.usuario_id !== yo) throw forbidden('Solo el autor puede borrar el post')
  db.posts = db.posts.filter((x) => x.id !== p.id)
  db.likes = db.likes.filter((l) => l.post_id !== p.id)
  db.comentarios = db.comentarios.filter((c) => c.post_id !== p.id)
  db.notificaciones = db.notificaciones.filter((n) => n.post_id !== p.id)
  for (const m of db.mensajes) if (m.post_id === p.id) m.post_id = null
  return undefined
})

function postsDe(db: Db, id: number, tipo: string | null): DbPost[] {
  return db.posts.filter((p) => p.usuario_id === id && (tipo === null || p.tipo === tipo)).sort(porFechaDesc)
}

route('GET', '/usuarios/{id}/posts', ({ db, yo, params, query }) => {
  const id = idParam(params, 'id')
  assertPuedeVer(db, yo, id)
  const tipo = query.get('tipo')
  if (tipo !== null && tipo !== 'foto' && tipo !== 'reel') throw badRequest('tipo inválido')
  return paginar(postsDe(db, id, tipo), query).map((p) => postDTO(db, p, yo))
})

route('GET', '/usuarios/{id}/reels', ({ db, yo, params, query }) => {
  const id = idParam(params, 'id')
  assertPuedeVer(db, yo, id)
  return paginar(postsDe(db, id, 'reel'), query).map((p) => postDTO(db, p, yo))
})

// ---------- Likes y comentarios (HU5)
function postVisible(db: Db, yo: number, id: number): DbPost {
  const p = postOr404(db, id)
  assertPuedeVer(db, yo, p.usuario_id)
  return p
}

route('POST', '/posts/{id}/like', ({ db, yo, params }) => {
  const p = postVisible(db, yo, idParam(params, 'id'))
  if (!db.likes.some((l) => l.post_id === p.id && l.usuario_id === yo)) {
    db.likes.push({ post_id: p.id, usuario_id: yo, fecha: nowIso() })
    notificar(db, p.usuario_id, 'like', yo, { post_id: p.id, url_miniatura: p.url_imagen })
  }
  return postDTO(db, p, yo)
})

route('DELETE', '/posts/{id}/like', ({ db, yo, params }) => {
  const p = postOr404(db, idParam(params, 'id'))
  db.likes = db.likes.filter((l) => !(l.post_id === p.id && l.usuario_id === yo))
  quitarNotificacion(db, p.usuario_id, 'like', yo, p.id)
  return undefined
})

route('GET', '/posts/{id}/likes', ({ db, yo, params, query }) => {
  const p = postVisible(db, yo, idParam(params, 'id'))
  const users = db.likes
    .filter((l) => l.post_id === p.id && !hayBloqueo(db, p.usuario_id, l.usuario_id) && !hayBloqueo(db, yo, l.usuario_id))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map((l) => resumen(usuario(db, l.usuario_id)))
  return paginar(users, query, 50)
})

route('GET', '/posts/{id}/comentarios', ({ db, yo, params, query }) => {
  const p = postVisible(db, yo, idParam(params, 'id'))
  const cs = db.comentarios
    .filter((c) => c.post_id === p.id && !hayBloqueo(db, p.usuario_id, c.usuario_id) && !hayBloqueo(db, yo, c.usuario_id))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
  return paginar(cs, query, 50).map((c) => comentarioDTO(db, c))
})

route('POST', '/posts/{id}/comentarios', ({ db, yo, params, body }) => {
  const p = postVisible(db, yo, idParam(params, 'id'))
  const texto = reqStr(obj(body), 'texto', 300)
  const c = { id: nextId(db, 'comentarios'), post_id: p.id, usuario_id: yo, texto, fecha: nowIso() }
  db.comentarios.push(c)
  notificar(db, p.usuario_id, 'comentario', yo, { post_id: p.id, url_miniatura: p.url_imagen, texto })
  return comentarioDTO(db, c)
})

route('DELETE', '/comentarios/{id}', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  const c = db.comentarios.find((x) => x.id === id)
  if (!c) throw notFound('Comentario no encontrado')
  const p = postOr404(db, c.post_id)
  if (c.usuario_id !== yo && p.usuario_id !== yo) throw forbidden('Solo el autor del comentario o el dueño del post')
  db.comentarios = db.comentarios.filter((x) => x.id !== id)
  return undefined
})

// ---------- Feed (HU6)
route('GET', '/usuarios/{id}/feed', ({ db, yo, params, query }) => {
  const id = idParam(params, 'id')
  assertDueno(yo, id)
  const yoU = usuario(db, id)
  const posts = db.posts
    .filter((p) => sigue(db, id, p.usuario_id) && !(yoU.reels_desactivados && p.tipo === 'reel'))
    .sort(porFechaDesc)
  return paginar(posts, query).map((p) => postDTO(db, p, yo))
})

/** Score híbrido de RECOMENDACIONES.md: 0.40 social + 0.35 contenido + 0.25 popularidad, con decaimiento. */
function recomendados(db: Db, yo: number, tipo: TipoPost | null, soloNoSeguidos: boolean): { p: DbPost; motivo: string }[] {
  const misSeguidos = db.seguidores.filter((s) => s.seguidor_id === yo && s.estado === 'aceptado').map((s) => s.seguido_id)
  const afinidad = new Map<string, number>()
  const limite30 = hoursAgo(24 * 30)
  for (const l of db.likes) {
    if (l.usuario_id !== yo || l.fecha < limite30) continue
    const p = db.posts.find((x) => x.id === l.post_id)
    for (const h of hashtagsDe(p?.descripcion ?? null)) afinidad.set(h, (afinidad.get(h) ?? 0) + 1)
  }
  const limite = hoursAgo(24 * 7)
  const limite72 = hoursAgo(72)
  const cands = db.posts.filter((p) => {
    if (p.usuario_id === yo) return false
    if (tipo && p.tipo !== tipo) return false
    if (p.fecha_publicacion < limite) return false
    const autor = usuario(db, p.usuario_id)
    if (hayBloqueo(db, yo, p.usuario_id)) return false
    if (soloNoSeguidos) {
      if (autor.es_privada || sigue(db, yo, p.usuario_id)) return false
      if (db.likes.some((l) => l.post_id === p.id && l.usuario_id === yo)) return false
    } else if (!puedeVer(db, yo, p.usuario_id)) return false
    return true
  })
  const maxSocial = Math.max(1, misSeguidos.length)
  const scored = cands.map((p) => {
    const likers = db.likes.filter((l) => l.post_id === p.id)
    const social = likers.filter((l) => misSeguidos.includes(l.usuario_id)).length / maxSocial
    const tags = hashtagsDe(p.descripcion)
    const contenido = tags.reduce((acc, h) => acc + (afinidad.get(h) ?? 0), 0)
    const recientes =
      likers.filter((l) => l.fecha >= limite72).length +
      2 * db.comentarios.filter((c) => c.post_id === p.id && c.fecha >= limite72).length
    const score = 0.4 * social + 0.35 * Math.min(1, contenido / 5) + 0.25 * Math.min(1, recientes / 10)
    const horas = (Date.now() - new Date(p.fecha_publicacion).getTime()) / 3_600_000
    const final = (score + 0.01) / Math.pow(horas + 2, 1.2)
    let motivo = 'popular'
    const amigo = likers.find((l) => misSeguidos.includes(l.usuario_id))
    const tagAfin = tags.find((h) => afinidad.has(h))
    if (amigo) motivo = `le gusta a @${usuario(db, amigo.usuario_id).username}`
    else if (tagAfin) motivo = `#${tagAfin}`
    return { p, motivo, final }
  })
  scored.sort((a, b) => b.final - a.final)
  // Diversidad: como mucho 2 por autor en cada bloque de 12.
  const res: { p: DbPost; motivo: string }[] = []
  const resto = [...scored]
  while (resto.length) {
    const porAutor = new Map<number, number>()
    const bloque: typeof scored = []
    for (let i = 0; i < resto.length && bloque.length < 12; ) {
      const x = resto[i]
      const n = porAutor.get(x.p.usuario_id) ?? 0
      if (n < 2) {
        porAutor.set(x.p.usuario_id, n + 1)
        bloque.push(x)
        resto.splice(i, 1)
      } else i++
    }
    if (!bloque.length) {
      bloque.push(...resto.splice(0, resto.length))
    }
    res.push(...bloque.map(({ p, motivo }) => ({ p, motivo })))
  }
  return res
}

route('GET', '/usuarios/{id}/explorar', ({ db, yo, params, query }) => {
  const id = idParam(params, 'id')
  assertDueno(yo, id)
  const u = usuario(db, id)
  return paginar(recomendados(db, id, u.reels_desactivados ? 'foto' : null, true), query, 30).map(({ p, motivo }) =>
    postDTO(db, p, yo, motivo),
  )
})

route('GET', '/usuarios/{id}/reels/feed', ({ db, yo, params, query }) => {
  const id = idParam(params, 'id')
  assertDueno(yo, id)
  if (usuario(db, id).reels_desactivados) throw forbidden('Tenés los reels desactivados')
  return paginar(recomendados(db, id, 'reel', false), query, 10).map(({ p, motivo }) => postDTO(db, p, yo, motivo))
})

// ---------- Hashtags (HU11)
route('GET', '/hashtags/tendencia', ({ db }) => {
  const desde = hoursAgo(24)
  const conteo = new Map<string, number>()
  for (const p of db.posts) {
    if (p.fecha_publicacion < desde || usuario(db, p.usuario_id).es_privada) continue
    for (const h of hashtagsDe(p.descripcion)) conteo.set(h, (conteo.get(h) ?? 0) + 1)
  }
  const res: HashtagTendencia[] = [...conteo.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([nombre, cantidad_posts]) => ({ nombre, cantidad_posts }))
  return res
})

route('GET', '/hashtags/{nombre}/posts', ({ db, yo, params, query }) => {
  const nombre = params.nombre.toLowerCase().replace(/^#/, '')
  const posts = db.posts
    .filter((p) => !usuario(db, p.usuario_id).es_privada && !hayBloqueo(db, yo, p.usuario_id))
    .filter((p) => hashtagsDe(p.descripcion).includes(nombre))
    .map((p) => ({ p, likes: db.likes.filter((l) => l.post_id === p.id).length }))
    .sort((a, b) => b.likes - a.likes || b.p.fecha_publicacion.localeCompare(a.p.fecha_publicacion))
    .map((x) => x.p)
  return paginar(posts, query, 30).map((p) => postDTO(db, p, yo))
})
