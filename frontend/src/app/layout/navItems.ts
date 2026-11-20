/**
 * Ítems de navegación. Estructura de Instagram (NO es la navigation bar de M3).
 * Para pasar al orden nuevo de Instagram (Inicio, Reels, Mensajes, Buscar, Perfil) basta con editar MOBILE_TABS.
 */
export type NavId = 'inicio' | 'buscar' | 'explorar' | 'reels' | 'mensajes' | 'notificaciones' | 'crear' | 'perfil'

export interface NavItem {
  id: NavId
  label: string
  icon: string
}

export const MOBILE_TABS: NavId[] = ['inicio', 'buscar', 'crear', 'reels', 'perfil']

export const DESKTOP_ITEMS: NavItem[] = [
  { id: 'inicio', label: 'Inicio', icon: 'home' },
  { id: 'buscar', label: 'Buscar', icon: 'search' },
  { id: 'explorar', label: 'Explorar', icon: 'explore' },
  { id: 'reels', label: 'Reels', icon: 'movie' },
  { id: 'mensajes', label: 'Mensajes', icon: 'send' },
  { id: 'notificaciones', label: 'Notificaciones', icon: 'favorite' },
  { id: 'crear', label: 'Crear', icon: 'add_box' },
  { id: 'perfil', label: 'Perfil', icon: 'person' },
]

export const ICONOS: Record<NavId, string> = Object.fromEntries(DESKTOP_ITEMS.map((i) => [i.id, i.icon])) as Record<NavId, string>
export const LABELS: Record<NavId, string> = Object.fromEntries(DESKTOP_ITEMS.map((i) => [i.id, i.label])) as Record<NavId, string>

/** Qué ítem está activo según la ruta. */
export function activoDesdeRuta(pathname: string, username: string): NavId | null {
  if (pathname === '/') return 'inicio'
  if (pathname.startsWith('/buscar') || pathname.startsWith('/hashtags')) return 'buscar'
  if (pathname.startsWith('/explorar')) return 'explorar'
  if (pathname.startsWith('/reels')) return 'reels'
  if (pathname.startsWith('/direct')) return 'mensajes'
  if (pathname.startsWith('/notificaciones')) return 'notificaciones'
  if (pathname.startsWith('/crear')) return 'crear'
  const seg = pathname.split('/')[1]
  if (seg === username || pathname.startsWith('/cuenta')) return 'perfil'
  return null
}

export const RUTAS: Partial<Record<NavId, string>> = {
  inicio: '/',
  buscar: '/buscar',
  explorar: '/explorar',
  reels: '/reels',
  mensajes: '/direct',
  notificaciones: '/notificaciones',
}
