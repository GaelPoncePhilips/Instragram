import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { cn } from '../../lib/hooks'
import { aceptarInvitacion, obtenerAlbum } from '../../services/albums'
import { mensajeDeError } from '../../services/client'
import { obtenerPost } from '../../services/posts'
import { albumDeInvitacion } from '../../services/temporal/invitacionDm'
import { useBadges } from '../../stores/badges'
import { useYo } from '../../stores/session'
import { snackbar } from '../../stores/ui'
import type { Album, Mensaje, Post, UsuarioResumen } from '../../types/api'
import { AvatarStack } from '../albums/common'

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

/**
 * TEMPORAL (hueco 12): tarjeta de invitación a álbum con call to action dentro del chat.
 * Se dibuja cuando el texto del mensaje es una invitación (ver services/temporal/invitacionDm.ts).
 */
function InvitacionAlbumCard({ albumId, mio }: { albumId: number; mio: boolean }) {
  const yo = useYo()
  const navigate = useNavigate()
  const [album, setAlbum] = useState<Album | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let vivo = true
    obtenerAlbum(albumId)
      .then((a) => {
        if (vivo) setAlbum(a)
      })
      .catch(() => {
        if (vivo) setAlbum(null)
      })
    return () => {
      vivo = false
    }
  }, [albumId])
  if (album === undefined) return <div className="h-72 w-64 animate-pulse rounded-lg bg-surface-container-high" />
  if (album === null)
    return <div className="type-body-m rounded-lg bg-surface-container-highest px-4 py-3 text-on-surface-variant">Álbum no disponible</div>
  const yoMiembro = album.miembros.find((m) => m.id === yo.id)
  const pendiente = yoMiembro?.estado === 'pendiente'
  const aceptados = album.miembros.filter((m) => m.estado === 'aceptado')
  const aceptar = async () => {
    setBusy(true)
    try {
      setAlbum(await aceptarInvitacion(album.id))
      snackbar(`Te uniste a «${album.titulo}»`)
      void useBadges.getState().refrescar()
    } catch (e) {
      snackbar(mensajeDeError(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="w-64 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-low text-on-surface">
      <div className="relative aspect-square bg-tertiary-container text-on-tertiary-container">
        {album.portada_url ? (
          <img src={album.portada_url} alt={`Portada de ${album.titulo}`} className="size-full object-cover" loading="lazy" />
        ) : (
          <span className="flex size-full items-center justify-center">
            <Icon name="photo_album" size={56} />
          </span>
        )}
        <span className="absolute top-2 left-2 inline-flex h-7 items-center gap-1 rounded-sm bg-primary px-2 text-on-primary type-label-m">
          <Icon name="photo_album" size={16} fill />
          Álbum compartido
        </span>
      </div>
      <div className="flex flex-col gap-2 p-3">
        <p className="type-title-s emphasized truncate">{album.titulo}</p>
        <div className="flex items-center gap-2">
          <AvatarStack usuarios={aceptados} max={4} size={22} />
          <span className="type-body-s text-on-surface-variant">
            {aceptados.length} {aceptados.length === 1 ? 'participante' : 'participantes'}
          </span>
        </div>
        {mio ? (
          <Button variant="tonal" full size="sm" onClick={() => navigate(`/albumes/${album.id}`)}>
              Ver álbum
            </Button>
        ) : pendiente ? (
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" disabled={busy} onClick={() => void aceptar()}>
              Unirme
            </Button>
            <Button size="sm" variant="tonal" className="flex-1" onClick={() => navigate(`/albumes/${album.id}`)}>
                Ver
              </Button>
          </div>
        ) : (
          <Button size="sm" variant="tonal" full icon={yoMiembro ? 'check' : undefined} onClick={() => navigate(`/albumes/${album.id}`)}>
              {yoMiembro ? 'Ya sos parte · Ver álbum' : 'Ver álbum'}
            </Button>
        )}
      </div>
    </div>
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
  const invitacion = albumDeInvitacion(m.texto)
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
        {invitacion !== null && (
          <div {...pressProps}>
            <InvitacionAlbumCard albumId={invitacion} mio={mio} />
          </div>
        )}
        {m.texto && invitacion === null && (
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
