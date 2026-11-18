/** Álbumes compartidos y DMs (EXTRA). Mismas reglas que album_service.py y dm_service.py. */
import type { Album, AlbumItem, Mensaje } from '../../types/api'
import type { Db, DbAlbum } from '../db'
import { nextId, nowIso } from '../db'
import { notificar } from '../notificar'
import {
  albumDTO,
  albumOr404,
  albumVisible,
  assertDueno,
  assertPuedeVer,
  badRequest,
  conflict,
  conversacionDTO,
  forbidden,
  hayBloqueo,
  miembro,
  notFound,
  paginar,
  postOr404,
  sigue,
  usuario,
} from '../rules'
import { route } from '../server'
import { idParam, numArray, obj, optStr, reqStr } from './util'

// ================= Álbumes

function visibleOr404(db: Db, yo: number, id: number): DbAlbum {
  const a = albumOr404(db, id)
  if (hayBloqueo(db, yo, a.creador_id) && !miembro(db, a.id, yo)) throw notFound('Álbum no encontrado')
  if (!albumVisible(db, a, yo)) throw forbidden('No tenés acceso a este álbum')
  return a
}

function assertAdmin(db: Db, yo: number, a: DbAlbum): void {
  const m = miembro(db, a.id, yo)
  if (!m || m.rol !== 'admin' || m.estado !== 'aceptado') throw forbidden('Solo un admin del álbum')
}

function otrosMiembros(db: Db, albumId: number, yo: number): number[] {
  return db.miembros
    .filter((m) => m.album_id === albumId && m.estado === 'aceptado' && m.usuario_id !== yo)
    .map((m) => m.usuario_id)
}

route('POST', '/albums', ({ db, yo, body }) => {
  const b = obj(body)
  const a: DbAlbum = {
    id: nextId(db, 'albums'),
    creador_id: yo,
    titulo: reqStr(b, 'titulo', 60),
    descripcion: optStr(b, 'descripcion', 500)?.trim() || null,
    portada_url: optStr(b, 'portada_url') ?? null,
    fecha_creacion: nowIso(),
  }
  db.albums.push(a)
  db.miembros.push({ album_id: a.id, usuario_id: yo, rol: 'admin', estado: 'aceptado', fecha: nowIso() })
  return albumDTO(db, a)
})

route('GET', '/albums/{id}', ({ db, yo, params }) => albumDTO(db, visibleOr404(db, yo, idParam(params, 'id'))))

route('PATCH', '/albums/{id}', ({ db, yo, params, body }) => {
  const a = albumOr404(db, idParam(params, 'id'))
  assertAdmin(db, yo, a)
  const b = obj(body)
  const titulo = optStr(b, 'titulo', 60)
  const descripcion = optStr(b, 'descripcion', 500)
  const portada = optStr(b, 'portada_url')
  if (titulo !== undefined) {
    if (!titulo?.trim()) throw badRequest('El título no puede estar vacío')
    a.titulo = titulo.trim()
  }
  if (descripcion !== undefined) a.descripcion = descripcion?.trim() || null
  if (portada !== undefined) a.portada_url = portada
  return albumDTO(db, a)
})

route('DELETE', '/albums/{id}', ({ db, yo, params }) => {
  const a = albumOr404(db, idParam(params, 'id'))
  assertAdmin(db, yo, a)
  db.albums = db.albums.filter((x) => x.id !== a.id)
  db.miembros = db.miembros.filter((m) => m.album_id !== a.id)
  db.items = db.items.filter((i) => i.album_id !== a.id)
  db.notificaciones = db.notificaciones.filter((n) => n.album_id !== a.id)
  return undefined
})

route('GET', '/usuarios/{id}/albums', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  assertPuedeVer(db, yo, id)
  const res: Album[] = db.albums
    .filter((a) => miembro(db, a.id, id)?.estado === 'aceptado' && albumVisible(db, a, yo))
    .sort((a, b) => b.fecha_creacion.localeCompare(a.fecha_creacion))
    .map((a) => albumDTO(db, a))
  return res
})

route('POST', '/albums/{id}/invitaciones', ({ db, yo, params, body }) => {
  const a = albumOr404(db, idParam(params, 'id'))
  assertAdmin(db, yo, a)
  const uid = obj(body).usuario_id
  if (typeof uid !== 'number') throw badRequest('usuario_id es obligatorio')
  usuario(db, uid)
  if (hayBloqueo(db, yo, uid) || hayBloqueo(db, a.creador_id, uid)) throw badRequest('No podés invitar a este usuario')
  if (miembro(db, a.id, uid)) throw conflict('Ya es miembro o tiene una invitación pendiente')
  db.miembros.push({ album_id: a.id, usuario_id: uid, rol: 'miembro', estado: 'pendiente', fecha: nowIso() })
  notificar(db, uid, 'invitacion_album', yo, { album_id: a.id, url_miniatura: albumDTO(db, a).portada_url, texto: a.titulo })
  return albumDTO(db, a)
})

route('GET', '/usuarios/{id}/invitaciones-album', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  assertDueno(yo, id)
  return db.albums.filter((a) => miembro(db, a.id, id)?.estado === 'pendiente').map((a) => albumDTO(db, a))
})

route('POST', '/albums/{id}/invitaciones/aceptar', ({ db, yo, params }) => {
  const a = albumOr404(db, idParam(params, 'id'))
  const m = miembro(db, a.id, yo)
  if (!m || m.estado !== 'pendiente') throw notFound('No tenés una invitación pendiente a este álbum')
  m.estado = 'aceptado'
  db.notificaciones = db.notificaciones.filter(
    (n) => !(n.destinatario_id === yo && n.tipo === 'invitacion_album' && n.album_id === a.id),
  )
  const portada = albumDTO(db, a).portada_url
  for (const otro of otrosMiembros(db, a.id, yo)) {
    const esAdmin = miembro(db, a.id, otro)?.rol === 'admin'
    notificar(db, otro, esAdmin ? 'invitacion_aceptada' : 'album_participante', yo, {
      album_id: a.id,
      url_miniatura: portada,
      texto: a.titulo,
    })
  }
  return albumDTO(db, a)
})

route('DELETE', '/albums/{id}/miembros/{usuario_id}', ({ db, yo, params }) => {
  const a = albumOr404(db, idParam(params, 'id'))
  const uid = idParam(params, 'usuario_id')
  const m = miembro(db, a.id, uid)
  if (!m) throw notFound('No es miembro')
  if (uid !== yo) assertAdmin(db, yo, a)
  db.miembros = db.miembros.filter((x) => x !== m)
  db.notificaciones = db.notificaciones.filter(
    (n) => !(n.destinatario_id === uid && n.tipo === 'invitacion_album' && n.album_id === a.id),
  )
  // Si se va el último admin, pasa al miembro aceptado más antiguo. Su contenido permanece.
  const quedan = db.miembros.filter((x) => x.album_id === a.id && x.estado === 'aceptado')
  if (m.rol === 'admin' && !quedan.some((x) => x.rol === 'admin') && quedan.length) {
    quedan.sort((x, y) => x.fecha.localeCompare(y.fecha))[0].rol = 'admin'
  }
  return undefined
})

route('GET', '/albums/{id}/items', ({ db, yo, params, query }) => {
  const a = visibleOr404(db, yo, idParam(params, 'id'))
  const items = db.items.filter((i) => i.album_id === a.id).sort((x, y) => y.fecha.localeCompare(x.fecha))
  return paginar(items, query, 50)
})

route('POST', '/albums/{id}/items', ({ db, yo, params, body }) => {
  const a = albumOr404(db, idParam(params, 'id'))
  if (miembro(db, a.id, yo)?.estado !== 'aceptado') throw forbidden('Solo los miembros suben contenido')
  const b = obj(body)
  // TEMPORAL (hueco 3): tipo y url_video no están en el contrato.
  const tipo = b.tipo === 'video' ? 'video' : 'foto'
  const url_video = optStr(b, 'url_video') ?? null
  if (tipo === 'video' && !url_video) throw badRequest('Un video necesita url_video')
  const item: AlbumItem = {
    id: nextId(db, 'items'),
    album_id: a.id,
    usuario_id: yo,
    url_imagen: reqStr(b, 'url_imagen'),
    descripcion: optStr(b, 'descripcion', 300)?.trim() || null,
    fecha: nowIso(),
    tipo,
    url_video,
  }
  db.items.push(item)
  // Agrupa: una notificación por álbum y autor sin leer.
  for (const otro of otrosMiembros(db, a.id, yo)) {
    const ya = db.notificaciones.find(
      (n) => n.destinatario_id === otro && n.tipo === 'album_contenido' && n.album_id === a.id && n.actor_id === yo && !n.leida,
    )
    if (ya) {
      ya.fecha = nowIso()
      ya.url_miniatura = item.url_imagen
    } else notificar(db, otro, 'album_contenido', yo, { album_id: a.id, url_miniatura: item.url_imagen, texto: a.titulo })
  }
  return item
})

route('DELETE', '/albums/{id}/items/{item_id}', ({ db, yo, params }) => {
  const a = albumOr404(db, idParam(params, 'id'))
  const itemId = idParam(params, 'item_id')
  const item = db.items.find((i) => i.id === itemId && i.album_id === a.id)
  if (!item) throw notFound('Item no encontrado')
  const m = miembro(db, a.id, yo)
  const esAdmin = m?.rol === 'admin' && m.estado === 'aceptado'
  if (item.usuario_id !== yo && !esAdmin) throw forbidden('Solo el autor o un admin')
  db.items = db.items.filter((i) => i !== item)
  return undefined
})

// ================= DMs

function participante(db: Db, convId: number, yo: number) {
  const p = db.participantes.find((x) => x.conversacion_id === convId && x.usuario_id === yo)
  if (!p) throw notFound('Conversación no encontrada')
  return p
}

function otros(db: Db, convId: number, yo: number): number[] {
  return db.participantes.filter((p) => p.conversacion_id === convId && p.usuario_id !== yo).map((p) => p.usuario_id)
}

function listar(db: Db, yo: number, estado: 'aceptada' | 'solicitud') {
  return db.participantes
    .filter((p) => p.usuario_id === yo && p.estado === estado)
    .map((p) => {
      const c = db.conversaciones.find((x) => x.id === p.conversacion_id)
      const ult = db.mensajes.filter((m) => m.conversacion_id === p.conversacion_id).sort((a, b) => b.id - a.id)[0]
      return { id: p.conversacion_id, f: ult?.fecha ?? c?.fecha ?? '' }
    })
    .sort((a, b) => b.f.localeCompare(a.f))
    .map((x) => conversacionDTO(db, x.id, yo))
}

route('GET', '/conversaciones', ({ db, yo }) => listar(db, yo, 'aceptada'))
route('GET', '/conversaciones/solicitudes', ({ db, yo }) => listar(db, yo, 'solicitud'))

route('POST', '/conversaciones', ({ db, yo, body }) => {
  const b = obj(body)
  const ids = [...new Set(numArray(b, 'participantes').filter((x) => x !== yo))]
  if (!ids.length) throw badRequest('Necesitás al menos otro participante')
  for (const uid of ids) {
    if (!db.usuarios.some((u) => u.id === uid) || hayBloqueo(db, uid, yo)) throw notFound(`Usuario ${uid} no encontrado`)
  }
  const esGrupal = ids.length > 1
  if (!esGrupal) {
    const existente = db.conversaciones.find(
      (c) =>
        !c.es_grupal &&
        db.participantes.some((p) => p.conversacion_id === c.id && p.usuario_id === yo) &&
        db.participantes.some((p) => p.conversacion_id === c.id && p.usuario_id === ids[0]),
    )
    if (existente) return conversacionDTO(db, existente.id, yo)
  }
  const nombre = optStr(b, 'nombre', 60)
  const c = { id: nextId(db, 'conversaciones'), es_grupal: esGrupal, nombre: esGrupal ? nombre?.trim() || null : null, fecha: nowIso() }
  db.conversaciones.push(c)
  db.participantes.push({ conversacion_id: c.id, usuario_id: yo, estado: 'aceptada', ultima_lectura: null, oculta: false })
  for (const uid of ids) {
    db.participantes.push({
      conversacion_id: c.id,
      usuario_id: uid,
      estado: sigue(db, uid, yo) ? 'aceptada' : 'solicitud',
      ultima_lectura: null,
      oculta: false,
    })
  }
  return conversacionDTO(db, c.id, yo)
})

route('GET', '/conversaciones/{id}/mensajes', ({ db, yo, params, query }) => {
  const id = idParam(params, 'id')
  participante(db, id, yo)
  const limit = query.has('limit') ? Number(query.get('limit')) : 30
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw badRequest('limit debe estar entre 1 y 50')
  const antes = query.get('antes_de')
  const res: Mensaje[] = db.mensajes
    .filter((m) => m.conversacion_id === id && (antes === null || m.id < Number(antes)))
    .sort((a, b) => b.id - a.id)
    .slice(0, limit)
  return res
})

route('POST', '/conversaciones/{id}/mensajes', ({ db, yo, params, body }) => {
  const id = idParam(params, 'id')
  const p = participante(db, id, yo)
  if (otros(db, id, yo).some((o) => hayBloqueo(db, o, yo))) throw forbidden('No podés escribir en esta conversación')
  const b = obj(body)
  const texto = optStr(b, 'texto', 1000)?.trim() || null
  const postId = typeof b.post_id === 'number' ? b.post_id : null
  if (!texto && postId === null) throw badRequest('Escribí un mensaje o compartí un post')
  if (postId !== null) {
    const post = postOr404(db, postId)
    assertPuedeVer(db, yo, post.usuario_id)
  }
  p.estado = 'aceptada'
  const m: Mensaje = { id: nextId(db, 'mensajes'), conversacion_id: id, emisor_id: yo, texto, post_id: postId, fecha: nowIso() }
  db.mensajes.push(m)
  p.ultima_lectura = m.fecha
  return m
})

route('POST', '/conversaciones/{id}/aceptar', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  participante(db, id, yo).estado = 'aceptada'
  return conversacionDTO(db, id, yo)
})

route('POST', '/conversaciones/{id}/leido', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  participante(db, id, yo).ultima_lectura = nowIso()
  return undefined
})

route('DELETE', '/mensajes/{id}', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  const m = db.mensajes.find((x) => x.id === id)
  if (!m || !db.participantes.some((p) => p.conversacion_id === m.conversacion_id && p.usuario_id === yo))
    throw notFound('Mensaje no encontrado')
  if (m.emisor_id !== yo) throw forbidden('Solo quien lo envió puede anularlo')
  db.mensajes = db.mensajes.filter((x) => x !== m)
  return undefined
})

route('DELETE', '/conversaciones/{id}', ({ db, yo, params }) => {
  const id = idParam(params, 'id')
  const p = participante(db, id, yo)
  db.participantes = db.participantes.filter((x) => x !== p)
  if (!otros(db, id, yo).length) {
    db.conversaciones = db.conversaciones.filter((c) => c.id !== id)
    db.mensajes = db.mensajes.filter((m) => m.conversacion_id !== id)
  }
  return undefined
})
