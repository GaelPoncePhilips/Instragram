import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { IconButton } from '../../components/ui/IconButton'
import { cn } from '../../lib/hooks'
import { obtenerPost } from '../../services/posts'
import type { Mensaje, Post, UsuarioResumen } from '../../types/api'

// Caché de posts compartidos (null = no disponible).
const cachePosts = new Map<number, Promise<Post | null>>()
function postCompartido(id: number): Promise<Post | null> {
  let p = cachePosts.get(id)
  if (!p) {
    p = obtenerPost(id).catch(() => null)
    cachePosts.set(id, p)
  }
  return p
}

function PostCard({ postId, mio }: { postId: number; mio: boolean }) {
  const [post, setPost] = useState<Post | null | undefined>(undefined)
  useEffect(() => {
    let vivo = true
    void postCompartido(postId).then((p) => {
      if (vivo) setPost(p)
    })
    return () => {
      vivo = false
    }
  }, [postId])
  if (post === undefined) return <div className="h-60 w-60 animate-pulse rounded-lg bg-surface-container-high" />
  if (post === null)
    return (
      <div className={cn('type-body-m rounded-lg px-4 py-3', mio ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface-variant')}>
        Publicación no disponible
      </div>
    )
  return (
    <Link to={`/p/${post.id}`} className="block w-60 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-highest text-on-surface">
      <span className="flex items-center gap-2 px-3 py-2">
        <Avatar username={post.autor_username} size={24} />
        <span className="type-label-l emphasized truncate">{post.autor_username}</span>
      </span>
      <img src={post.url_imagen} alt={`Publicación de ${post.autor_username}`} className="aspect-square w-full object-cover" loading="lazy" />
    </Link>
  )
}

interface BurbujaProps {
  m: Mensaje
  mio: boolean
  emisor?: UsuarioResumen
  grupal: boolean
  conPrev: boolean
  conNext: boolean
  isMobile: boolean
  onMenu: (m: Mensaje) => void
}

export function Burbuja({ m, mio, emisor, grupal, conPrev, conNext, isMobile, onMenu }: BurbujaProps) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const corto = '4px'
  const largo = '20px'
  const radio = mio
    ? `${largo} ${conPrev ? corto : largo} ${conNext ? corto : largo} ${largo}`
    : `${conPrev ? corto : largo} ${largo} ${largo} ${conNext ? corto : largo}`
  const cancelar = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  const pressProps =
    mio && isMobile
      ? {
          onPointerDown: () => {
            cancelar()
            timer.current = setTimeout(() => onMenu(m), 450)
          },
          onPointerUp: cancelar,
          onPointerLeave: cancelar,
          onPointerMove: cancelar,
          onContextMenu: (e: React.MouseEvent) => {
            e.preventDefault()
            onMenu(m)
          },
        }
      : {}
  const mostrarAvatar = grupal && !mio && !conNext
  return (
    <div className={cn('group flex items-end gap-2', mio ? 'justify-end' : 'justify-start', conPrev ? 'mt-0.5' : 'mt-2')}>
      {!mio && grupal && (
        <span className="w-7 shrink-0">{mostrarAvatar && emisor && <Avatar username={emisor.username} size={28} />}</span>
      )}
      {mio && !isMobile && (
        <span className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <IconButton icon="more_horiz" label="Opciones del mensaje" size={20} onClick={() => onMenu(m)} />
        </span>
      )}
      <div className={cn('flex max-w-[70%] flex-col', mio ? 'items-end' : 'items-start')}>
        {grupal && !mio && !conPrev && emisor && <span className="type-label-s mb-0.5 ml-3 text-on-surface-variant">{emisor.username}</span>}
        {m.post_id !== null && <PostCard postId={m.post_id} mio={mio} />}
        {m.texto && (
          <div
            {...pressProps}
            style={{ borderRadius: radio }}
            className={cn(
              'type-body-l px-4 py-2 break-words whitespace-pre-wrap select-text',
              m.post_id !== null && 'mt-0.5',
              mio ? 'bg-primary text-on-primary' : 'bg-surface-container-highest text-on-surface',
            )}
          >
            {m.texto}
          </div>
        )}
      </div>
    </div>
  )
}
