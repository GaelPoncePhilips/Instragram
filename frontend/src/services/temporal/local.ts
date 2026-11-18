// TEMPORAL — piezas 100 % de cliente mientras el backend no las tenga (docs/TEMPORAL.md).
import { temporal } from '../../config/env'
import { DEV_CUENTAS } from '../../mocks/seed'

// ---------- Hueco 6: avatares (ninguna entidad tiene foto de perfil)
/** TEMPORAL: avatar determinista por username. Borrar cuando exista `url_avatar`. Flag VITE_TEMPORAL_AVATARES. */
export function avatarUrl(username: string): string | null {
  if (!temporal.avatares) return null
  return `https://picsum.photos/seed/avatar-${encodeURIComponent(username)}/150/150`
}

// ---------- Hueco 10: guardar posts (sin endpoint)
const KEY_GUARDADOS = 'ronda.temporal.guardados'
function leerGuardados(): number[] {
  try {
    const raw = localStorage.getItem(KEY_GUARDADOS)
    const v: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(v) ? v.filter((x): x is number => typeof x === 'number') : []
  } catch {
    return []
  }
}
/** TEMPORAL: guardados en localStorage. Flag VITE_TEMPORAL_GUARDADOS. */
export function estaGuardado(postId: number): boolean {
  return temporal.guardados && leerGuardados().includes(postId)
}
export function alternarGuardado(postId: number): boolean {
  const set = new Set(leerGuardados())
  const nuevo = !set.has(postId)
  if (nuevo) set.add(postId)
  else set.delete(postId)
  try {
    localStorage.setItem(KEY_GUARDADOS, JSON.stringify([...set]))
  } catch {
    /* sin almacenamiento */
  }
  return nuevo
}

// ---------- Hueco 4: subida de archivos (el contrato recibe URLs)
/** TEMPORAL: un archivo local se convierte en URL de objeto (vive mientras la pestaña esté abierta). */
export function urlDeArchivo(file: File): string {
  return URL.createObjectURL(file)
}
/** TEMPORAL: imagen de relleno de picsum para probar sin archivos. */
export function urlAleatoria(w = 1080, h = 1080): string {
  return `https://picsum.photos/seed/up-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6)}/${w}/${h}`
}

// ---------- Hueco 11: cuentas del switcher de desarrollo
/** TEMPORAL: cuentas de prueba (email + contraseña) para el switcher. Flag VITE_TEMPORAL_DEV_CUENTAS. */
export const cuentasDev = temporal.devCuentas ? DEV_CUENTAS : []
