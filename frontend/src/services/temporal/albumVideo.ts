// TEMPORAL (hueco 3) — videos en álbumes. El contrato solo tiene url_imagen.
// Si el backend real ignora tipo/url_video, se recuerdan en localStorage por id de item.
// Borrar cuando AlbumItem tenga `tipo` y `url_video`. Flag: VITE_TEMPORAL_ALBUM_VIDEO.
import { temporal } from '../../config/env'
import type { AlbumItem, CreateAlbumItemBody } from '../../types/api'

const KEY = 'ronda.temporal.albumVideo'

function leer(): Record<string, string> {
  try {
    const raw = localStorage.getItem(KEY)
    const data: unknown = raw ? JSON.parse(raw) : {}
    return typeof data === 'object' && data !== null ? (data as Record<string, string>) : {}
  } catch {
    return {}
  }
}

export function guardarVideo(item: AlbumItem, body: CreateAlbumItemBody): AlbumItem {
  if (!temporal.albumVideo || body.tipo !== 'video' || !body.url_video || item.url_video) return item
  try {
    const m = leer()
    m[String(item.id)] = body.url_video
    localStorage.setItem(KEY, JSON.stringify(m))
  } catch {
    /* sin almacenamiento */
  }
  return { ...item, tipo: 'video', url_video: body.url_video }
}

export function conVideo(item: AlbumItem): AlbumItem {
  if (!temporal.albumVideo) return item
  if (item.url_video) return { ...item, tipo: 'video' }
  const v = leer()[String(item.id)]
  return v ? { ...item, tipo: 'video', url_video: v } : { ...item, tipo: item.tipo ?? 'foto' }
}
