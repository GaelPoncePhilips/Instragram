/* Service worker de Keepsy (PWA). Sin dependencias.
 * - App shell: navegaciones → red primero, con index.html en caché como respaldo offline.
 * - Assets del build (/assets/*), íconos y fuentes → caché primero (tienen hash o no cambian).
 * - Imágenes externas (picsum) → stale-while-revalidate con límite.
 * - API (/api) y videos → siempre red (no se cachean datos del usuario ni rangos de video).
 */
const VERSION = 'keepsy-v1'
const SHELL = `${VERSION}-shell`
const ASSETS = `${VERSION}-assets`
const IMAGENES = `${VERSION}-img`
const PRECACHE = ['/', '/index.html', '/manifest.webmanifest', '/logo.svg', '/icons/icon-192.png', '/icons/icon-512.png']
const MAX_IMAGENES = 150

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

async function recortar(nombre, max) {
  const cache = await caches.open(nombre)
  const keys = await cache.keys()
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i])
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Datos y video: siempre red.
  if (url.pathname.startsWith('/api') || req.destination === 'video' || req.headers.has('range')) return

  // Navegación: red primero, index.html de respaldo (SPA offline).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copia = res.clone()
          caches.open(SHELL).then((c) => c.put('/index.html', copia))
          return res
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  const mismoOrigen = url.origin === self.location.origin
  const esFuente = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com'

  // Assets con hash, íconos y fuentes: caché primero.
  if ((mismoOrigen && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/'))) || esFuente) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok || res.type === 'opaque') {
              const copia = res.clone()
              caches.open(ASSETS).then((c) => c.put(req, copia))
            }
            return res
          }),
      ),
    )
    return
  }

  // Imágenes (picsum y otras): stale-while-revalidate.
  if (req.destination === 'image') {
    event.respondWith(
      caches.open(IMAGENES).then(async (cache) => {
        const hit = await cache.match(req)
        const red = fetch(req)
          .then((res) => {
            if (res.ok || res.type === 'opaque') {
              cache.put(req, res.clone())
              recortar(IMAGENES, MAX_IMAGENES)
            }
            return res
          })
          .catch(() => hit)
        return hit || red
      }),
    )
  }
})
