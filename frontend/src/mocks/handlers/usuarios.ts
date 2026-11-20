/** Auth, usuarios (HU1, HU4, HU12), seguidores (HU3), mejores amigos (HU8), bloqueos (HU10), sugerencias. */
import type { Estadisticas, Perfil, Relacion, Seguimiento, Sugerencia, Usuario, UsuarioResumen } from '../../types/api'
import type { DbUsuario } from '../db'
import { nextId, nowIso } from '../db'
import { notificar, quitarNotificacion } from '../notificar'
import {
  assertDueno,
  assertNoBloqueo,
  assertPuedeVer,
  badRequest,
  conflict,
  estadoSeguimiento,
  hashtagsDe,
  hayBloqueo,
  notFound,
  paginar,
  resumen,
  sigue,
  unauthorized,
  usuario,
} from '../rules'
import { route, tokenPara } from '../server'
import { idParam, obj, optBool, optStr, reqStr } from './util'

const USERNAME_RE = /^[a-z0-9._]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function publico(u: DbUsuario): Usuario {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    nombre: u.nombre,
    bio: u.bio,
    es_privada: u.es_privada,
    reels_desactivados: u.reels_desactivados,
    fecha_registro: u.fecha_registro,
  }
}

// ---------- Auth
route(
  'POST',
  '/auth/login',
  ({ db, body }) => {
    const b = obj(body)
    const email = reqStr(b, 'email').toLowerCase()
    const password = reqStr(b, 'password')
    const u = db.usuarios.find((x) => x.email.toLowerCase() === email)
    if (!u || u.password !== password) throw unauthorized('Email o contraseña incorrectos')
    return { access_token: tokenPara(u.id), token_type: 'bearer' }
  },
  true,
)

route('GET', '/auth/me', ({ db, yo }) => publico(usuario(db, yo)))

// ---------- Usuarios
route(
  'POST',
  '/usuarios',
  ({ db, body }) => {
    const b = obj(body)
    const username = reqStr(b, 'username', 30)
    if (!USERNAME_RE.test(username)) throw badRequest('El username solo admite minúsculas, números, "." y "_"')
    const email = reqStr(b, 'email', 254).toLowerCase()
    if (!EMAIL_RE.test(email)) throw badRequest('Email inválido')
    const password = reqStr(b, 'password')
    if (password.length < 6) throw badRequest('La contraseña debe tener al menos 6 caracteres')
    const nombre = reqStr(b, 'nombre', 100)
    const bio = optStr(b, 'bio', 150) ?? null
    if (db.usuarios.some((u) => u.username === username)) throw conflict('El username ya existe')
    if (db.usuarios.some((u) => u.email.toLowerCase() === email)) throw conflict('El email ya está registrado')
    const u: DbUsuario = {
      id: nextId(db, 'usuarios'),
      username,
      email,
      password,
      nombre,
      bio,
      es_privada: false,
      reels_desactivados: false,
      fecha_registro: nowIso(),
    }
    db.usuarios.push(u)
    return publico(u)
  },
  true,
)

route('GET', '/usuarios/{username}', ({ db, yo, params }) => {
  const u = db.usuarios.find((x) => x.username === params.username)
  if (!u) throw notFound('Usuario no encontrado')
  assertNoBloqueo(db, yo, u.id)
  let relacion: Relacion = 'ninguna'
  if (u.id === yo) relacion = 'yo'
  else {
    const e = estadoSeguimiento(db, yo, u.id)
    relacion = e === 'aceptado' ? 'siguiendo' : e === 'pendiente' ? 'pendiente' : 'ninguna'
  }
  const perfil: Perfil = {
    id: u.id,
    username: u.username,
    nombre: u.nombre,
    bio: u.bio,
    es_privada: u.es_privada,
    cantidad_posts: db.posts.filter((p) => p.usuario_id === u.id).length,
    cantidad_seguidores: db.seguidores.filter((s) => s.seguido_id === u.id && s.estado === 'aceptado').length,
    cantidad_seguidos: db.seguidores.filter((s) => s.seguidor_id === u.id && s.estado === 'aceptado').length,
    relacion,
  }
  return perfil
})

route('PATCH', '/usuarios/{id}', ({ db, yo, params, body }) => {
  const id = idParam(params, 'id')
  assertDueno(yo, id)
  const u = usuario(db, id)
  const b = obj(body)
  const nombre = optStr(b, 'nombre', 100)
  const bio = optStr(b, 'bio', 150)
  const esPrivada = optBool(b, 'es_privada')
  const reels = optBool(b, 'reels_desactivados')
  if (nombre !== undefined) {
    if (!nombre?.trim()) throw badRequest('El nombre no puede estar vacío')
    u.nombre = nombre.trim()
  }
  if (bio !== undefined) u.bio = bio?.trim() ? bio.trim() : null
  if (esPrivada !== undefined) {
    if (u.es_privada && !esPrivada) {
      // Privada → pública: se aceptan las pendientes.
      for (const s of db.seguidores) if (s.seguido_id === id && s.estado === 'pendiente') s.estado = 'aceptado'
      db.notificaciones = db.notificaciones.filter((n) => !(n.destinatario_id === id && n.tipo === 'solicitud_seguimiento'))
    }
    u.es_privada = esPrivada
  }
  if (reels !== undefined) u.reels_desactivados = reels
  return publico(u)
})

function listaUsuarios(ids: number[], dbUsuarios: DbUsuario[]): UsuarioResumen[] {
  return ids
    .map((id) => dbUsuarios.find((u) => u.id === id))
    .filter((u): u is DbUsuario => u !== undefined)
    .map(resumen)
}

route('GET', '/usuarios/{id}/seguidores', ({ db, yo, params, query }) => {
  const id = idParam(params, 'id')
  assertPuedeVer(db, yo, id)
  const ids = db.seguidores
    .filter((s) => s.seguido_id === id && s.estado === 'aceptado' && !hayBloqueo(db, yo, s.seguidor_id))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map((s) => s.seguidor_id)
  return paginar(listaUsuarios(ids, db.usuarios), query)
})

route('GET', '/usuarios/{id}/seguidos', ({ db, yo, params, query }) => {
  const id = idParam(params, 'id')
  assertPuedeVer(db, yo, id)
  const ids = db.seguidores
    .filter((s) => s.seguidor_id === id && s.estado === 'aceptado' && !hayBloqueo(db, yo, s.seguido_id))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .map((s) => s.seguido_id)
  return paginar(listaUsuarios(ids, db.usuarios), query)
})

route('GET', '/usuarios/{id}/no-me-siguen', ({ db, yo, params, query }) => {
  const id = idParam(params, 'id')
  assertDueno(yo, id)
  const ids = db.seguidores
    .filter((s) => s.seguidor_id === id && s.estado === 'aceptado' && !sigue(db, s.seguido_id, id))
    .map((s) => s.seguido_id)
  return paginar(listaUsuarios(ids, db.usuarios), query)
})

route('GET', '/usuarios/{id}/estadisticas', ({ db, yo, params, query }) => {
  const id = idParam(params, 'id')
  assertDueno(yo, id)
  const desde = query.get('desde')
  const hasta = query.get('hasta')
  const posts = db.posts.filter((p) => {
    if (p.usuario_id !== id) return false
    const f = p.fecha_publicacion.slice(0, 10)
    if (desde && f < desde) return false
    if (hasta && f > hasta) return false
    return true
  })
  const likesPorPost = posts.map((p) => ({
    p,
    likes: db.likes.filter((l) => l.post_id === p.id && !hayBloqueo(db, id, l.usuario_id)).length,
  }))
  const total = likesPorPost.reduce((acc, x) => acc + x.likes, 0)
  const top = [...likesPorPost].sort((a, b) => b.likes - a.likes)[0]
  const conteo = new Map<number, number>()
  for (const l of db.likes) {
    if (!posts.some((p) => p.id === l.post_id)) continue
    if (!sigue(db, l.usuario_id, id)) continue
    conteo.set(l.usuario_id, (conteo.get(l.usuario_id) ?? 0) + 1)
  }
  const topSeguidor = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0]
  const res: Estadisticas = {
    cantidad_posts: posts.length,
    promedio_likes_por_post: posts.length ? Math.round((total / posts.length) * 100) / 100 : 0,
    post_con_mas_likes: top
      ? { id: top.p.id, url_imagen: top.p.url_imagen, fecha_publicacion: top.p.fecha_publicacion, likes: top.likes }
      : null,
    seguidor_que_mas_likes_dio: topSeguidor
      ? { ...resumen(usuario(db, topSeguidor[0])), likes: topSeguidor[1] }
      : null,
  }
  return res
})

/** Sugerencias: amigos en común + afinidad de hashtags (RECOMENDACIONES.md). */
route('GET', '/usuarios/{id}/sugerencias', ({ db, yo, params, query }) => {
  const id = idParam(params, 'id')
  assertDueno(yo, id)
  const misSeguidos = new Set(db.seguidores.filter((s) => s.seguidor_id === id).map((s) => s.seguido_id))
  const afinidad = new Map<string, number>()
  for (const l of db.likes.filter((x) => x.usuario_id === id)) {
    const p = db.posts.find((x) => x.id === l.post_id)
    for (const h of hashtagsDe(p?.descripcion ?? null)) afinidad.set(h, (afinidad.get(h) ?? 0) + 1)
  }
  const candidatos: (Sugerencia & { score: number })[] = []
  for (const u of db.usuarios) {
    if (u.id === id || misSeguidos.has(u.id) || hayBloqueo(db, id, u.id)) continue
    const enComun = db.seguidores.filter(
      (s) => s.seguido_id === u.id && s.estado === 'aceptado' && misSeguidos.has(s.seguidor_id),
    ).length
    let af = 0
    for (const p of db.posts.filter((x) => x.usuario_id === u.id))
      for (const h of hashtagsDe(p.descripcion)) af += afinidad.get(h) ?? 0
    const teSigue = sigue(db, u.id, id)
    candidatos.push({ ...resumen(u), en_comun: enComun, te_sigue: teSigue, score: enComun * 3 + af + (teSigue ? 5 : 0) })
  }
  candidatos.sort((a, b) => b.score - a.score)
  return paginar(
    candidatos.map(
      (c): Sugerencia => ({ id: c.id, username: c.username, nombre: c.nombre, en_comun: c.en_comun, te_sigue: c.te_sigue }),
    ),
    query,
    10,
  )
})

// ---------- Seguidores (HU3, HU8)
route('POST', '/usuarios/{id}/seguir', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  if (id === yo) throw badRequest('No podés seguirte a vos mismo')
  const u = usuario(db, id)
  assertNoBloqueo(db, yo, id)
  if (estadoSeguimiento(db, yo, id)) throw conflict('Ya seguís o solicitaste seguir a este usuario')
  const s: Seguimiento = {
    seguidor_id: yo,
    seguido_id: id,
    estado: u.es_privada ? 'pendiente' : 'aceptado',
    fecha: nowIso(),
  }
  db.seguidores.push(s)
  notificar(db, id, s.estado === 'aceptado' ? 'seguidor_nuevo' : 'solicitud_seguimiento', yo)
  return s
})

route('DELETE', '/usuarios/{id}/seguir', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  usuario(db, id)
  db.seguidores = db.seguidores.filter((s) => !(s.seguidor_id === yo && s.seguido_id === id))
  db.mejoresAmigos = db.mejoresAmigos.filter((m) => !(m.usuario_id === id && m.amigo_id === yo))
  quitarNotificacion(db, id, 'solicitud_seguimiento', yo)
  return undefined
})

route('DELETE', '/usuarios/{id}/seguidores/{seguidor_id}', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  const seguidor = idParam(params, 'seguidor_id')
  assertDueno(yo, id)
  db.seguidores = db.seguidores.filter((s) => !(s.seguidor_id === seguidor && s.seguido_id === id))
  db.mejoresAmigos = db.mejoresAmigos.filter((m) => !(m.usuario_id === id && m.amigo_id === seguidor))
  return undefined
})

route('GET', '/usuarios/{id}/solicitudes', ({ db, yo, params, query }) => {
  const id = idParam(params, 'id')
  assertDueno(yo, id)
  return paginar(
    db.seguidores.filter((s) => s.seguido_id === id && s.estado === 'pendiente').sort((a, b) => b.fecha.localeCompare(a.fecha)),
    query,
  )
})

route('PATCH', '/usuarios/{id}/solicitudes/{seguidor_id}', ({ db, yo, params, body }) => {
  const id = idParam(params, 'id')
  const seguidor = idParam(params, 'seguidor_id')
  assertDueno(yo, id)
  const b = obj(body)
  const accion = reqStr(b, 'accion')
  const s = db.seguidores.find((x) => x.seguidor_id === seguidor && x.seguido_id === id && x.estado === 'pendiente')
  if (!s) throw notFound('Solicitud no encontrada')
  quitarNotificacion(db, id, 'solicitud_seguimiento', seguidor)
  if (accion === 'aceptar') {
    s.estado = 'aceptado'
    notificar(db, id, 'seguidor_nuevo', seguidor)
    return s
  }
  if (accion === 'rechazar') {
    db.seguidores = db.seguidores.filter((x) => x !== s)
    return undefined
  }
  throw badRequest('accion debe ser "aceptar" o "rechazar"')
})

// ---------- Mejores amigos (HU8)
route('GET', '/usuarios/{id}/mejores-amigos', ({ db, yo, params, query }) => {
  const id = idParam(params, 'id')
  assertDueno(yo, id)
  return paginar(
    listaUsuarios(
      db.mejoresAmigos.filter((m) => m.usuario_id === id).map((m) => m.amigo_id),
      db.usuarios,
    ),
    query,
    50,
  )
})

route('POST', '/usuarios/{id}/mejores-amigos/{amigo_id}', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  const amigo = idParam(params, 'amigo_id')
  assertDueno(yo, id)
  usuario(db, amigo)
  if (!sigue(db, amigo, id)) throw badRequest('Solo podés agregar a quien te sigue')
  if (!db.mejoresAmigos.some((m) => m.usuario_id === id && m.amigo_id === amigo))
    db.mejoresAmigos.push({ usuario_id: id, amigo_id: amigo })
  return undefined
})

route('DELETE', '/usuarios/{id}/mejores-amigos/{amigo_id}', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  const amigo = idParam(params, 'amigo_id')
  assertDueno(yo, id)
  db.mejoresAmigos = db.mejoresAmigos.filter((m) => !(m.usuario_id === id && m.amigo_id === amigo))
  return undefined
})

// ---------- Bloqueos (HU10)
route('POST', '/usuarios/{id}/bloqueo', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  if (id === yo) throw badRequest('No podés bloquearte a vos mismo')
  usuario(db, id)
  if (db.bloqueos.some((b) => b.bloqueador_id === yo && b.bloqueado_id === id)) return undefined
  db.bloqueos.push({ bloqueador_id: yo, bloqueado_id: id, fecha: nowIso() })
  db.seguidores = db.seguidores.filter(
    (s) => !((s.seguidor_id === yo && s.seguido_id === id) || (s.seguidor_id === id && s.seguido_id === yo)),
  )
  db.mejoresAmigos = db.mejoresAmigos.filter(
    (m) => !((m.usuario_id === yo && m.amigo_id === id) || (m.usuario_id === id && m.amigo_id === yo)),
  )
  db.notificaciones = db.notificaciones.filter(
    (n) => !((n.destinatario_id === yo && n.actor_id === id) || (n.destinatario_id === id && n.actor_id === yo)),
  )
  return undefined
})

route('DELETE', '/usuarios/{id}/bloqueo', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  db.bloqueos = db.bloqueos.filter((b) => !(b.bloqueador_id === yo && b.bloqueado_id === id))
  return undefined
})

route('GET', '/bloqueos', ({ db, yo, query }) =>
  paginar(
    listaUsuarios(
      db.bloqueos.filter((b) => b.bloqueador_id === yo).map((b) => b.bloqueado_id),
      db.usuarios,
    ),
    query,
    50,
  ),
)
