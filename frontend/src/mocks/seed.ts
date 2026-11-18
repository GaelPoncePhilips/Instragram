/**
 * Datos semilla del mock. Todas las fechas son relativas a "ahora".
 * Contraseña de todas las cuentas: keepsy123 (ver DEV_CUENTAS).
 * Imágenes: picsum.photos con seeds fijos. Videos de uso libre:
 *  - Big Buck Bunny y Sintel (Blender Foundation, CC BY) servidos por test-videos.co.uk
 *  - Jellyfish (test-videos.co.uk, libre para pruebas)
 *  - flower.mp4 (MDN, CC0)
 */
import type { Db, DbPost, DbUsuario } from './db'
import { addHours, emptyDb, hoursAgo, nextId } from './db'

export const PASSWORD_DEMO = 'keepsy123'

export const VIDEOS = {
  bunny: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_2MB.mp4',
  sintel: 'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_2MB.mp4',
  jellyfish: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_2MB.mp4',
  flower: 'https://developer.mozilla.org/shared-assets/videos/flower.mp4',
} as const

export const img = (seed: string, w = 1080, h = 1080) => `https://picsum.photos/seed/${seed}/${w}/${h}`

/** Generador pseudoaleatorio determinista (mulberry32). */
function prng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type U = [username: string, nombre: string, bio: string, privada: boolean, reelsOff?: boolean]
const USUARIOS: U[] = [
  ['ana.rios', 'Ana Ríos', 'Fotos de viajes y café ☕ · Córdoba', true],
  ['bruno.dev', 'Bruno Méndez', 'Código de día, bajo de noche 🎸', false],
  ['carla_foto', 'Carla Paz', 'Fotógrafa · retratos y luz natural', true],
  ['diego.mar', 'Diego Marín', 'Surf, mar y atardeceres 🌊', false],
  ['eli.viaja', 'Eli Torres', '37 países y contando ✈️', false],
  ['fede_music', 'Fede Acosta', 'Productor · beats lo-fi', true],
  ['gabi.cocina', 'Gabi Luna', 'Recetas simples, sabores grandes 🍝', false],
  ['hugo.art', 'Hugo Sosa', 'Ilustración y murales', false],
  ['ines_lee', 'Inés Lee', 'Leo, escribo, corro', true],
  ['juli.run', 'Julián Ortiz', 'Maratonista amateur 🏃', false, true],
  ['kike.troll', 'Kike', 'Opino de todo', false],
  ['lu.surfea', 'Lucía Benítez', 'Agua salada y tablas 🏄‍♀️', false],
  ['marto.cine', 'Martín Gómez', 'Cine de autor y pochoclo', false],
  ['nati.plantas', 'Natalia Ruiz', 'Mi casa es una selva 🌿', false],
  ['oli.arq', 'Olivia Sáenz', 'Arquitectura y ciudades', false],
]

/** Cuentas de prueba para el switcher de desarrollo. */
export const DEV_CUENTAS = USUARIOS.map(([username, nombre, , privada]) => ({
  username,
  nombre,
  email: `${username.replace(/[._]/g, '')}@keepsy.dev`,
  password: PASSWORD_DEMO,
  privada,
}))

// [seguidor, seguido, pendiente?]
const SIGUE: [string, string, boolean?][] = [
  ['ana.rios', 'bruno.dev'],
  ['ana.rios', 'carla_foto'],
  ['ana.rios', 'diego.mar'],
  ['ana.rios', 'eli.viaja'],
  ['ana.rios', 'gabi.cocina'],
  ['ana.rios', 'hugo.art'],
  ['ana.rios', 'juli.run'],
  ['bruno.dev', 'ana.rios'],
  ['bruno.dev', 'diego.mar'],
  ['bruno.dev', 'gabi.cocina'],
  ['bruno.dev', 'hugo.art'],
  ['bruno.dev', 'carla_foto', true],
  ['carla_foto', 'ana.rios'],
  ['carla_foto', 'eli.viaja'],
  ['diego.mar', 'ana.rios'],
  ['diego.mar', 'eli.viaja'],
  ['diego.mar', 'bruno.dev'],
  ['eli.viaja', 'ana.rios'],
  ['eli.viaja', 'diego.mar'],
  ['eli.viaja', 'hugo.art'],
  ['eli.viaja', 'gabi.cocina'],
  ['fede_music', 'ana.rios'],
  ['fede_music', 'carla_foto', true],
  ['gabi.cocina', 'ana.rios'],
  ['gabi.cocina', 'bruno.dev'],
  ['gabi.cocina', 'eli.viaja'],
  ['hugo.art', 'ana.rios'],
  ['hugo.art', 'eli.viaja'],
  ['hugo.art', 'gabi.cocina'],
  ['ines_lee', 'ana.rios', true],
  ['juli.run', 'ana.rios', true],
  ['juli.run', 'bruno.dev'],
  ['juli.run', 'diego.mar'],
  ['juli.run', 'eli.viaja'],
  ['kike.troll', 'bruno.dev'],
  ['bruno.dev', 'marto.cine'],
  ['eli.viaja', 'oli.arq'],
  ['diego.mar', 'lu.surfea'],
  ['gabi.cocina', 'nati.plantas'],
  ['lu.surfea', 'diego.mar'],
  ['marto.cine', 'bruno.dev'],
  ['nati.plantas', 'gabi.cocina'],
  ['oli.arq', 'eli.viaja'],
]

// [autor, horas atrás, descripción, alto (1080 = 1:1, 1350 = 4:5)]
const POSTS: [string, number, string, number][] = [
  ['ana.rios', 2, 'Primer café de la mañana y la luz entrando por la ventana #cafe #mañana #fotografia', 1350],
  ['ana.rios', 30, 'Volver a las sierras siempre es buena idea #viajes #montaña #cordoba', 1080],
  ['ana.rios', 75, 'Atardecer desde la terraza 🧡 #atardecer #fotografia', 1080],
  ['ana.rios', 140, 'Mercado de San Telmo #viajes #buenosaires', 1350],
  ['ana.rios', 220, 'Lectura de domingo #libros #cafe', 1080],
  ['bruno.dev', 1, 'Setup nuevo, mismo bug de siempre 😅 #codigo #setup', 1080],
  ['bruno.dev', 20, 'Ensayo con la banda #musica #bajo', 1350],
  ['bruno.dev', 96, 'Café + teclado mecánico #cafe #codigo', 1080],
  ['carla_foto', 5, 'Retrato con luz de ventana #fotografia #retrato', 1350],
  ['carla_foto', 50, 'Hora dorada en el parque #fotografia #atardecer', 1080],
  ['carla_foto', 160, 'Blanco y negro #fotografia #bn', 1080],
  ['diego.mar', 3, 'Olas perfectas hoy 🌊 #surf #playa #mar', 1350],
  ['diego.mar', 14, 'Atardecer en Mar del Plata #atardecer #playa', 1080],
  ['diego.mar', 70, 'Tabla nueva #surf', 1080],
  ['diego.mar', 190, 'Faro al amanecer #mar #fotografia', 1350],
  ['eli.viaja', 4, 'Kioto en otoño 🍁 #viajes #japon #otoño', 1350],
  ['eli.viaja', 18, 'Ramen a medianoche #comida #japon #viajes', 1080],
  ['eli.viaja', 44, 'Templo entre la niebla #viajes #fotografia', 1080],
  ['eli.viaja', 120, 'Mochila lista para la próxima #viajes', 1080],
  ['fede_music', 8, 'Sesión de estudio nocturna #musica #lofi', 1080],
  ['fede_music', 100, 'Vinilos nuevos #musica #vinilo', 1350],
  ['gabi.cocina', 6, 'Ñoquis del 29 🥔 #comida #receta #pasta', 1350],
  ['gabi.cocina', 22, 'Pan casero recién salido #comida #pan #receta', 1080],
  ['gabi.cocina', 60, 'Tarta de limón #comida #postre', 1080],
  ['gabi.cocina', 150, 'Mesa de domingo #comida #familia', 1350],
  ['hugo.art', 9, 'Mural terminado en Palermo 🎨 #arte #mural #ilustracion', 1350],
  ['hugo.art', 26, 'Boceto del día #ilustracion #arte', 1080],
  ['hugo.art', 90, 'Paleta para el próximo mural #arte', 1080],
  ['ines_lee', 12, 'Club de lectura #libros', 1080],
  ['ines_lee', 80, '10K bajo la lluvia #running', 1350],
  ['juli.run', 7, 'Fondo de 25K ✔️ #running #maraton', 1080],
  ['juli.run', 40, 'Zapatillas nuevas #running', 1350],
  ['juli.run', 110, 'Amanecer corriendo por la costanera #running #amanecer', 1080],
  ['kike.troll', 10, 'Opinión impopular #opinion', 1080],
  ['lu.surfea', 5, 'Amanecer con offshore 🌊 #surf #playa #amanecer', 1350],
  ['lu.surfea', 33, 'Nueva quilla, nueva vida #surf', 1080],
  ['lu.surfea', 90, 'Atardecer en Chapadmalal #atardecer #playa', 1080],
  ['marto.cine', 3, 'Función de trasnoche 🎬 #cine #noche', 1080],
  ['marto.cine', 46, 'Afiche favorito del mes #cine #arte', 1350],
  ['marto.cine', 120, 'Proyector restaurado #cine #vintage', 1080],
  ['nati.plantas', 2, 'Monstera con hoja nueva 🌱 #plantas #hogar', 1350],
  ['nati.plantas', 27, 'Rincón verde #plantas #deco', 1080],
  ['nati.plantas', 100, 'Esquejes para regalar #plantas', 1080],
  ['oli.arq', 13, 'Hormigón y luz #arquitectura #fotografia', 1350],
  ['oli.arq', 58, 'Escaleras de caracol #arquitectura', 1080],
  ['oli.arq', 150, 'Paseo por La Plata #arquitectura #viajes', 1080],
]

// [autor, horas atrás, descripción, video, duración]
const REELS: [string, number, string, string, number][] = [
  ['diego.mar', 11, 'Una ola, mil intentos 🏄 #surf #reel', VIDEOS.jellyfish, 10],
  ['eli.viaja', 16, 'Un día en Tokio en 10 segundos #viajes #japon', VIDEOS.sintel, 10],
  ['bruno.dev', 28, 'Cuando compila a la primera #codigo #humor', VIDEOS.bunny, 10],
  ['hugo.art', 36, 'Timelapse del mural #arte #timelapse', VIDEOS.flower, 5],
  ['gabi.cocina', 48, 'Masa madre paso a paso #comida #receta', VIDEOS.bunny, 10],
  ['ana.rios', 52, 'Flores del balcón 🌸 #primavera', VIDEOS.flower, 5],
  ['juli.run', 64, 'Último kilómetro #running', VIDEOS.jellyfish, 10],
  ['lu.surfea', 20, 'Session de la tarde #surf #reel', VIDEOS.jellyfish, 10],
  ['marto.cine', 40, 'Tráiler casero #cine', VIDEOS.sintel, 10],
]

const COMENTARIOS = [
  '¡Qué linda foto! 😍',
  'Increíble la luz',
  'Quiero ir 🙌',
  'Me encanta',
  '🔥🔥🔥',
  'Pasame la receta porfa',
  'Qué buen lugar',
  'Jajaja tal cual',
  'Hermoso 💛',
  '¿Dónde es?',
  'Tremendo',
  'Necesito esto en mi vida',
]

export function crearSeed(): Db {
  const db = emptyDb()
  const r = prng(20261118)
  const id = (username: string): number => {
    const u = db.usuarios.find((x) => x.username === username)
    if (!u) throw new Error(`seed: ${username}`)
    return u.id
  }

  USUARIOS.forEach(([username, nombre, bio, privada, reelsOff], i) => {
    const u: DbUsuario = {
      id: nextId(db, 'usuarios'),
      username,
      email: DEV_CUENTAS[i].email,
      password: PASSWORD_DEMO,
      nombre,
      bio,
      es_privada: privada,
      reels_desactivados: reelsOff ?? false,
      fecha_registro: hoursAgo(24 * (400 - i * 20)),
    }
    db.usuarios.push(u)
  })

  SIGUE.forEach(([a, b, pend], i) =>
    db.seguidores.push({
      seguidor_id: id(a),
      seguido_id: id(b),
      estado: pend ? 'pendiente' : 'aceptado',
      fecha: hoursAgo(pend ? 6 + i : 24 * 60 + i * 10),
    }),
  )

  db.bloqueos.push({ bloqueador_id: id('ana.rios'), bloqueado_id: id('kike.troll'), fecha: hoursAgo(24 * 5) })
  db.bloqueos.push({ bloqueador_id: id('hugo.art'), bloqueado_id: id('fede_music'), fecha: hoursAgo(24 * 9) })

  const bf: [string, string][] = [
    ['ana.rios', 'bruno.dev'],
    ['ana.rios', 'eli.viaja'],
    ['eli.viaja', 'ana.rios'],
    ['diego.mar', 'ana.rios'],
  ]
  for (const [a, b] of bf) db.mejoresAmigos.push({ usuario_id: id(a), amigo_id: id(b) })

  // ---------- Posts y reels
  POSTS.forEach(([autor, h, desc, alto], i) => {
    const p: DbPost = {
      id: nextId(db, 'posts'),
      usuario_id: id(autor),
      tipo: 'foto',
      url_imagen: img(`ronda-${i + 1}`, 1080, alto),
      url_video: null,
      duracion_seg: null,
      descripcion: desc,
      fecha_publicacion: hoursAgo(h + r()),
    }
    db.posts.push(p)
  })
  REELS.forEach(([autor, h, desc, video, dur], i) => {
    db.posts.push({
      id: nextId(db, 'posts'),
      usuario_id: id(autor),
      tipo: 'reel',
      url_imagen: img(`ronda-reel-${i + 1}`, 1080, 1920),
      url_video: video,
      duracion_seg: dur,
      descripcion: desc,
      fecha_publicacion: hoursAgo(h + r()),
    })
  })

  // Likes y comentarios: solo de quien puede ver el post (pública o seguidor aceptado).
  const puede = (viewer: number, owner: number) => {
    if (viewer === owner) return false
    if (db.bloqueos.some((b) => (b.bloqueador_id === viewer && b.bloqueado_id === owner) || (b.bloqueador_id === owner && b.bloqueado_id === viewer)))
      return false
    const o = db.usuarios.find((u) => u.id === owner)
    return !o?.es_privada || db.seguidores.some((s) => s.seguidor_id === viewer && s.seguido_id === owner && s.estado === 'aceptado')
  }
  for (const p of db.posts) {
    for (const u of db.usuarios) {
      if (!puede(u.id, p.usuario_id)) continue
      if (r() < 0.55) db.likes.push({ usuario_id: u.id, post_id: p.id, fecha: addHours(p.fecha_publicacion, r() * 2) })
      if (r() < 0.22)
        db.comentarios.push({
          id: nextId(db, 'comentarios'),
          post_id: p.id,
          usuario_id: u.id,
          texto: COMENTARIOS[Math.floor(r() * COMENTARIOS.length)],
          fecha: addHours(p.fecha_publicacion, r() * 3),
        })
    }
  }

  // ---------- Stories (vigentes y vencidas)
  const story = (autor: string, h: number, seed: string, bfOnly = false) => {
    const s = {
      id: nextId(db, 'stories'),
      usuario_id: id(autor),
      url_imagen: img(seed, 1080, 1920),
      solo_mejores_amigos: bfOnly,
      fecha_publicacion: hoursAgo(h),
      fecha_vencimiento: addHours(hoursAgo(h), 24),
    }
    db.stories.push(s)
    return s.id
  }
  story('bruno.dev', 3, 'st-bruno-1')
  story('bruno.dev', 1, 'st-bruno-2')
  story('diego.mar', 5, 'st-diego-1')
  story('diego.mar', 2, 'st-diego-bf', true)
  story('eli.viaja', 6, 'st-eli-1')
  story('eli.viaja', 1.5, 'st-eli-bf', true)
  story('gabi.cocina', 8, 'st-gabi-1')
  const hugoSt = story('hugo.art', 20, 'st-hugo-1')
  story('carla_foto', 9, 'st-carla-1')
  story('juli.run', 4, 'st-juli-1')
  const anaVigente = story('ana.rios', 4, 'st-ana-hoy')
  story('ana.rios', 2, 'st-ana-bf', true)
  const anaV1 = story('ana.rios', 30, 'st-ana-cafe')
  const anaV2 = story('ana.rios', 100, 'st-ana-sierras')
  const anaV3 = story('ana.rios', 200, 'st-ana-mar')
  const anaV4 = story('ana.rios', 340, 'st-ana-ruta')
  const eliV = story('eli.viaja', 160, 'st-eli-japon')
  db.vistas.push({ usuario_id: id('ana.rios'), story_id: hugoSt, fecha: hoursAgo(10) })
  for (const u of ['bruno.dev', 'eli.viaja', 'diego.mar', 'gabi.cocina'])
    db.vistas.push({ usuario_id: id(u), story_id: anaVigente, fecha: hoursAgo(3 * r()) })

  db.destacadas.push(
    { id: nextId(db, 'destacadas'), usuario_id: id('ana.rios'), titulo: 'Viajes', portada_url: null, orden: 0, story_ids: [anaV2, anaV3, anaV4] },
    { id: nextId(db, 'destacadas'), usuario_id: id('ana.rios'), titulo: 'Café', portada_url: null, orden: 1, story_ids: [anaV1] },
    { id: nextId(db, 'destacadas'), usuario_id: id('eli.viaja'), titulo: 'Japón', portada_url: null, orden: 0, story_ids: [eliV] },
  )

  // ---------- Álbumes compartidos
  const album = (creador: string, titulo: string, descripcion: string | null, h: number, portada: string | null = null) => {
    const a = { id: nextId(db, 'albums'), creador_id: id(creador), titulo, descripcion, portada_url: portada, fecha_creacion: hoursAgo(h) }
    db.albums.push(a)
    db.miembros.push({ album_id: a.id, usuario_id: a.creador_id, rol: 'admin', estado: 'aceptado', fecha: hoursAgo(h) })
    return a.id
  }
  const miembro = (albumId: number, u: string, estado: 'aceptado' | 'pendiente', h: number) =>
    db.miembros.push({ album_id: albumId, usuario_id: id(u), rol: 'miembro', estado, fecha: hoursAgo(h) })
  const item = (albumId: number, u: string, seed: string, h: number, desc: string | null = null, video?: string) =>
    db.items.push({
      id: nextId(db, 'items'),
      album_id: albumId,
      usuario_id: id(u),
      url_imagen: img(seed),
      descripcion: desc,
      fecha: hoursAgo(h),
      tipo: video ? 'video' : 'foto',
      url_video: video ?? null,
    })

  const bari = album('ana.rios', 'Bariloche 2026', 'El viaje de invierno con los de siempre 🏔️', 24 * 12, img('alb-bari-portada'))
  miembro(bari, 'bruno.dev', 'aceptado', 24 * 11)
  miembro(bari, 'eli.viaja', 'aceptado', 24 * 11)
  miembro(bari, 'diego.mar', 'pendiente', 24 * 2)
  item(bari, 'ana.rios', 'alb-bari-1', 24 * 10, 'Llegamos ❄️')
  item(bari, 'ana.rios', 'alb-bari-2', 24 * 9)
  item(bari, 'bruno.dev', 'alb-bari-3', 24 * 9, 'El cerro')
  item(bari, 'eli.viaja', 'alb-bari-4', 24 * 8, 'Chocolate obligatorio')
  item(bari, 'eli.viaja', 'alb-bari-5', 24 * 8, 'Bajando en trineo', VIDEOS.jellyfish)
  item(bari, 'bruno.dev', 'alb-bari-6', 30)
  item(bari, 'ana.rios', 'alb-bari-7', 26, 'Última noche')

  const cumple = album('gabi.cocina', 'Cumple de Gabi 🎂', 'Fotos de la fiesta, suban todo', 24 * 3)
  miembro(cumple, 'hugo.art', 'aceptado', 24 * 3)
  miembro(cumple, 'ana.rios', 'pendiente', 20)
  item(cumple, 'gabi.cocina', 'alb-cumple-1', 24 * 2, 'La torta')
  item(cumple, 'gabi.cocina', 'alb-cumple-2', 24 * 2)
  item(cumple, 'hugo.art', 'alb-cumple-3', 40, 'Brindis')

  album('ana.rios', 'Proyecto 365', 'Una foto por día, todo el año', 24 * 1)

  const playa = album('eli.viaja', 'Playa con amigos', null, 24 * 20)
  miembro(playa, 'diego.mar', 'aceptado', 24 * 19)
  item(playa, 'eli.viaja', 'alb-playa-1', 24 * 18)
  item(playa, 'diego.mar', 'alb-playa-2', 24 * 18, 'Surf al atardecer')
  item(playa, 'diego.mar', 'alb-playa-3', 24 * 17)

  const estudio = album('bruno.dev', 'Ensayos de la banda', 'Fotos y videos de los ensayos', 24 * 30)
  for (const u of ['ana.rios', 'gabi.cocina', 'hugo.art', 'eli.viaja', 'diego.mar']) miembro(estudio, u, 'aceptado', 24 * 29)
  item(estudio, 'bruno.dev', 'alb-banda-1', 24 * 25, 'Primer ensayo', VIDEOS.bunny)
  item(estudio, 'hugo.art', 'alb-banda-2', 24 * 20)
  item(estudio, 'ana.rios', 'alb-banda-3', 24 * 15)
  item(estudio, 'gabi.cocina', 'alb-banda-4', 24 * 6)

  // ---------- DMs
  const conv = (ids: string[], nombre: string | null, h: number, estados: Record<string, 'aceptada' | 'solicitud'> = {}) => {
    const c = { id: nextId(db, 'conversaciones'), es_grupal: ids.length > 2, nombre, fecha: hoursAgo(h) }
    db.conversaciones.push(c)
    for (const u of ids)
      db.participantes.push({ conversacion_id: c.id, usuario_id: id(u), estado: estados[u] ?? 'aceptada', ultima_lectura: null, oculta: false })
    return c.id
  }
  const msg = (c: number, u: string, h: number, texto: string | null, post_id: number | null = null) =>
    db.mensajes.push({ id: nextId(db, 'mensajes'), conversacion_id: c, emisor_id: id(u), texto, post_id, fecha: hoursAgo(h) })
  const leer = (c: number, u: string, h: number) => {
    const p = db.participantes.find((x) => x.conversacion_id === c && x.usuario_id === id(u))
    if (p) p.ultima_lectura = hoursAgo(h)
  }

  const c1 = conv(['ana.rios', 'bruno.dev'], null, 24 * 30)
  msg(c1, 'bruno.dev', 50, '¿Vas al ensayo del sábado?')
  msg(c1, 'ana.rios', 49, '¡Sí! Llevo la cámara')
  msg(c1, 'ana.rios', 49, null, 16)
  msg(c1, 'bruno.dev', 26, 'Jajaja qué buena esa foto')
  msg(c1, 'bruno.dev', 0.6, 'Che, ¿subiste las fotos al álbum?')
  msg(c1, 'bruno.dev', 0.5, 'Las de la última noche 🙏')
  leer(c1, 'ana.rios', 25)
  leer(c1, 'bruno.dev', 0.5)

  const c2 = conv(['ana.rios', 'eli.viaja', 'diego.mar'], 'Viaje 🏔️', 24 * 15)
  msg(c2, 'eli.viaja', 24 * 3, '¿Fechas para el próximo?')
  msg(c2, 'diego.mar', 24 * 3 - 1, 'Yo puedo en marzo')
  msg(c2, 'ana.rios', 24 * 2, 'Marzo me va perfecto')
  msg(c2, 'eli.viaja', 5, 'Encontré cabañas 👀', 19)
  leer(c2, 'ana.rios', 4)
  leer(c2, 'eli.viaja', 4)

  const c3 = conv(['ana.rios', 'gabi.cocina'], null, 24 * 40)
  msg(c3, 'gabi.cocina', 24 * 6, '¿Te paso la receta de los ñoquis?')
  msg(c3, 'ana.rios', 24 * 6 - 1, '¡Siii!')
  // TEMPORAL (hueco 12): la invitación al álbum también llega por DM.
  const origen = typeof window === 'undefined' ? '' : window.location.origin
  msg(c3, 'gabi.cocina', 20, `📸 Te invité a «Cumple de Gabi 🎂», un álbum compartido. Sumate y subí tus fotos y videos: ${origen}/albumes/${cumple}`)
  leer(c3, 'ana.rios', 24 * 5)
  leer(c3, 'gabi.cocina', 19)

  // Solicitudes de mensaje: Ana no sigue a fede_music ni a ines_lee.
  const c4 = conv(['fede_music', 'ana.rios'], null, 9, { 'ana.rios': 'solicitud' })
  msg(c4, 'fede_music', 9, 'Hola! Vi tus fotos, ¿harías la portada de mi EP?')
  leer(c4, 'fede_music', 9)
  const c5 = conv(['ines_lee', 'ana.rios'], null, 30, { 'ana.rios': 'solicitud' })
  msg(c5, 'ines_lee', 30, 'Hola Ana, te mandé solicitud 😊')
  leer(c5, 'ines_lee', 30)

  // ---------- Notificaciones (TEMPORAL, hueco 1)
  const notif = (dest: string, tipo: Db['notificaciones'][number]['tipo'], actor: string, h: number, leida: boolean, extra: Partial<Db['notificaciones'][number]> = {}) =>
    db.notificaciones.push({
      id: nextId(db, 'notificaciones'),
      destinatario_id: id(dest),
      tipo,
      actor_id: id(actor),
      post_id: null,
      album_id: null,
      url_miniatura: null,
      texto: null,
      leida,
      fecha: hoursAgo(h),
      ...extra,
    })
  const anaPost = db.posts.find((p) => p.usuario_id === id('ana.rios'))
  const anaThumb = { post_id: anaPost?.id ?? null, url_miniatura: anaPost?.url_imagen ?? null }
  notif('ana.rios', 'like', 'bruno.dev', 1.5, false, anaThumb)
  notif('ana.rios', 'like', 'eli.viaja', 1.2, false, anaThumb)
  notif('ana.rios', 'comentario', 'diego.mar', 1, false, { ...anaThumb, texto: '¡Qué linda foto! 😍' })
  notif('ana.rios', 'solicitud_seguimiento', 'juli.run', 6, false)
  notif('ana.rios', 'solicitud_seguimiento', 'ines_lee', 8, false)
  notif('ana.rios', 'invitacion_album', 'gabi.cocina', 20, false, { album_id: cumple, url_miniatura: img('alb-cumple-1'), texto: 'Cumple de Gabi 🎂' })
  notif('ana.rios', 'album_contenido', 'bruno.dev', 30, true, { album_id: bari, url_miniatura: img('alb-bari-6'), texto: 'Bariloche 2026' })
  notif('ana.rios', 'invitacion_aceptada', 'eli.viaja', 24 * 11, true, { album_id: bari, url_miniatura: img('alb-bari-portada'), texto: 'Bariloche 2026' })
  notif('ana.rios', 'seguidor_nuevo', 'hugo.art', 24 * 20, true)
  notif('diego.mar', 'invitacion_album', 'ana.rios', 24 * 2, false, { album_id: bari, url_miniatura: img('alb-bari-portada'), texto: 'Bariloche 2026' })
  notif('carla_foto', 'solicitud_seguimiento', 'bruno.dev', 7, false)
  notif('carla_foto', 'solicitud_seguimiento', 'fede_music', 8, false)

  return db
}
