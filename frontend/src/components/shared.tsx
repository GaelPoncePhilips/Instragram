/** Componentes de dominio compartidos entre features. */
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '../lib/hooks'
import { numeroCorto } from '../lib/time'
import { mensajeDeError } from '../services/client'
import * as usuariosApi from '../services/usuarios'
import { snackbar } from '../stores/ui'
import type { Post, Relacion, UsuarioResumen } from '../types/api'
import { Avatar, type Anillo } from './ui/Avatar'
import { Button, type ButtonSize } from './ui/Button'
import { Icon } from './ui/Icon'

/** Fila de usuario: avatar, username en negrita, nombre debajo y acción a la derecha. */
export function UserRow({
  usuario,
  subtitle,
  action,
  onClick,
  size = 44,
  anillo,
}: {
  usuario: UsuarioResumen
  subtitle?: ReactNode
  action?: ReactNode
  onClick?: () => void
  size?: number
  anillo?: Anillo
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <Link to={`/${usuario.username}`} onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar username={usuario.username} size={size} anillo={anillo} />
        <span className="min-w-0">
          <span className="type-label-l emphasized block truncate">{usuario.username}</span>
          <span className="type-body-m block truncate text-on-surface-variant">{subtitle ?? usuario.nombre}</span>
        </span>
      </Link>
      {action}
    </div>
  )
}

/**
 * Seguir / Solicitado / Siguiendo según `relacion` (HU3). Morph de forma: "Siguiendo" queda cuadrado.
 * Privada → "Solicitado" (pendiente); tocar de nuevo cancela la solicitud.
 */
export function FollowButton({
  usuarioId,
  relacion,
  esPrivada,
  onChange,
  size = 'sm',
  full,
}: {
  usuarioId: number
  relacion: Relacion
  esPrivada?: boolean
  onChange?: (r: Relacion) => void
  size?: ButtonSize
  full?: boolean
}) {
  const [rel, setRel] = useState<Relacion>(relacion)
  const [busy, setBusy] = useState(false)
  if (rel === 'yo') return null
  const cambiar = async () => {
    setBusy(true)
    const prev = rel
    try {
      if (rel === 'ninguna') {
        const s = await usuariosApi.seguir(usuarioId)
        const nuevo: Relacion = s.estado === 'aceptado' ? 'siguiendo' : 'pendiente'
        setRel(nuevo)
        onChange?.(nuevo)
      } else {
        await usuariosApi.dejarDeSeguir(usuarioId)
        setRel('ninguna')
        onChange?.('ninguna')
      }
    } catch (e) {
      setRel(prev)
      snackbar(mensajeDeError(e))
    } finally {
      setBusy(false)
    }
  }
  const label = rel === 'siguiendo' ? 'Siguiendo' : rel === 'pendiente' ? 'Solicitado' : esPrivada === undefined ? 'Seguir' : 'Seguir'
  return (
    <Button
      size={size}
      full={full}
      variant={rel === 'ninguna' ? 'filled' : 'tonal'}
      selected={rel !== 'ninguna'}
      icon={rel === 'siguiendo' ? 'check' : undefined}
      disabled={busy}
      onClick={() => void cambiar()}
    >
      {label}
    </Button>
  )
}

/**
 * Grilla de publicaciones: EXACTAMENTE 3 columnas cuadradas 1:1 (--grid-ratio), separación 2–3px, radio ≤ 4px,
 * overlay al pasar el mouse con likes y comentarios. `aspect="reel"` usa 9:16.
 */
export function PostGrid({
  posts,
  aspect = 'square',
  leading,
  sentinelRef,
  linkState,
}: {
  posts: Post[]
  aspect?: 'square' | 'reel'
  /** Tile extra al principio (p. ej. "+" en el perfil propio). */
  leading?: ReactNode
  sentinelRef?: (el: HTMLElement | null) => void
  linkState?: unknown
}) {
  return (
    <>
      <div className="grid grid-cols-3" style={{ gap: 'var(--grid-gap)' }}>
        {leading}
        {posts.map((p) => (
          <GridTile key={p.id} post={p} aspect={aspect} linkState={linkState} />
        ))}
      </div>
      {sentinelRef && <div ref={sentinelRef} aria-hidden="true" className="h-1" />}
    </>
  )
}

function GridTile({ post, aspect, linkState }: { post: Post; aspect: 'square' | 'reel'; linkState?: unknown }) {
  const to = post.tipo === 'reel' && aspect === 'reel' ? `/reels/${post.id}` : `/p/${post.id}`
  return (
    <Link
      to={to}
      state={linkState}
      className="group relative block overflow-hidden rounded-xs bg-surface-container-highest"
      style={{ aspectRatio: aspect === 'reel' ? '9 / 16' : 'var(--grid-ratio)' }}
      aria-label={`Publicación de ${post.autor_username}${post.descripcion ? `: ${post.descripcion.slice(0, 60)}` : ''}`}
    >
      <img src={post.url_imagen} alt={post.descripcion ?? `Publicación de ${post.autor_username}`} loading="lazy" className="size-full object-cover" />
      {post.tipo === 'reel' && (
        <span className="absolute top-2 right-2 text-white drop-shadow">
          <Icon name={aspect === 'reel' ? 'play_arrow' : 'movie'} fill size={20} />
        </span>
      )}
      {aspect === 'reel' && (
        <span className="absolute bottom-2 left-2 flex items-center gap-1 text-white drop-shadow type-label-m">
          <Icon name="favorite" fill size={16} />
          {numeroCorto(post.cantidad_likes)}
        </span>
      )}
      <span className="absolute inset-0 hidden items-center justify-center gap-6 bg-black/35 text-white group-hover:flex type-title-m emphasized">
        <span className="flex items-center gap-1.5">
          <Icon name="favorite" fill size={22} /> {numeroCorto(post.cantidad_likes)}
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="chat_bubble" fill size={22} /> {numeroCorto(post.cantidad_comentarios)}
        </span>
      </span>
    </Link>
  )
}

/** Esqueleto de grilla mientras carga. */
export function GridSkeleton({ n = 9, aspect = 'square' }: { n?: number; aspect?: 'square' | 'reel' }) {
  return (
    <div className="grid grid-cols-3" style={{ gap: 'var(--grid-gap)' }} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          className={cn('animate-pulse rounded-xs bg-surface-container-high')}
          style={{ aspectRatio: aspect === 'reel' ? '9 / 16' : 'var(--grid-ratio)' }}
        />
      ))}
    </div>
  )
}

/** Cabecera simple de pantalla en móvil: atrás + título (+ acción). */
export function ScreenHeader({ title, onBack, action }: { title: ReactNode; onBack?: () => void; action?: ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex h-12 items-center gap-1 border-b border-outline-variant/60 bg-surface px-1">
      {onBack ? (
        <button type="button" aria-label="Volver" onClick={onBack} className="state flex size-10 items-center justify-center rounded-full">
          <Icon name="arrow_back" />
        </button>
      ) : (
        <span className="w-2" />
      )}
      <h1 className="type-title-m emphasized min-w-0 flex-1 truncate text-center">{title}</h1>
      <span className="flex min-w-10 justify-end">{action}</span>
    </header>
  )
}
