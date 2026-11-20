import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { FollowButton } from '../../components/shared'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { CenteredLoader, EmptyState, ErrorState } from '../../components/ui/Feedback'
import { Icon } from '../../components/ui/Icon'
import { IconButton } from '../../components/ui/IconButton'
import { cn, useAsync, useInfinite, useIsMobile } from '../../lib/hooks'
import { numeroCorto } from '../../lib/time'
import { ApiError, mensajeDeError } from '../../services/client'
import { darLike, obtenerPost, quitarLike, reelsFeed } from '../../services/posts'
import { alternarGuardado, estaGuardado } from '../../services/temporal/local'
import { perfil } from '../../services/usuarios'
import { useYo } from '../../stores/session'
import { snackbar } from '../../stores/ui'
import type { Post, Relacion } from '../../types/api'
import { CommentsSheet } from '../post/CommentsSheet'
import { ShareSheet } from '../post/ShareSheet'

/** Descripción con hashtags clickeables, 2 líneas con "más". */
function Descripcion({ texto }: { texto: string }) {
  const [abierta, setAbierta] = useState(false)
  const partes = texto.split(/(#[\p{L}\p{N}_]+)/u)
  return (
    <div className="type-body-m text-white">
      <p className={cn('break-words', !abierta && 'line-clamp-2')}>
        {partes.map((p, i) =>
          p.startsWith('#') && p.length > 1 ? (
            <Link key={i} to={`/hashtags/${encodeURIComponent(p.slice(1))}`} className="emphasized">
              {p}
            </Link>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
      </p>
      {!abierta && texto.length > 80 && (
        <button type="button" onClick={() => setAbierta(true)} className="text-white/70">
          más
        </button>
      )}
    </div>
  )
}

function ReelItem({
  post,
  mobile,
  muted,
  onToggleMute,
}: {
  post: Post
  mobile: boolean
  muted: boolean
  onToggleMute: () => void
}) {
  const yo = useYo()
  const raiz = useRef<HTMLElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const ultimoTap = useRef(0)
  const timerTap = useRef(0)
  const [visible, setVisible] = useState(false)
  const [pausado, setPausado] = useState(false)
  const [corazon, setCorazon] = useState(0)
  const [liked, setLiked] = useState(post.me_gusta)
  const [likes, setLikes] = useState(post.cantidad_likes)
  const [comentarios, setComentarios] = useState(post.cantidad_comentarios)
  const [guardado, setGuardado] = useState(() => estaGuardado(post.id))
  const [verComentarios, setVerComentarios] = useState(false)
  const [compartir, setCompartir] = useState(false)
  const [relacion, setRelacion] = useState<Relacion | null>(null)
  const [esPrivada, setEsPrivada] = useState<boolean | undefined>(undefined)
  const esMio = post.usuario_id === yo.id

  useEffect(() => {
    const el = raiz.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      const v = e.intersectionRatio >= 0.6
      setVisible(v)
      if (!v) setPausado(false)
    }, { threshold: [0, 0.6, 1] })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // Reproduce solo el reel visible.
  useEffect(() => {
    const v = video.current
    if (!v) return
    if (visible && !pausado) void v.play().catch(() => undefined)
    else v.pause()
    if (!visible) {
      v.currentTime = 0
    }
  }, [visible, pausado])

  // Relación perezosa al volverse visible.
  useEffect(() => {
    if (!visible || esMio || relacion !== null) return
    let vivo = true
    perfil(post.autor_username)
      .then((p) => {
        if (!vivo) return
        setRelacion(p.relacion)
        setEsPrivada(p.es_privada)
      })
      .catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [visible, esMio, relacion, post.autor_username])

  useEffect(() => () => window.clearTimeout(timerTap.current), [])

  const ponerLike = async (quiere: boolean) => {
    if (quiere === liked) return
    setLiked(quiere)
    setLikes((n) => n + (quiere ? 1 : -1))
    try {
      if (quiere) await darLike(post.id)
      else await quitarLike(post.id)
    } catch (e) {
      setLiked(!quiere)
      setLikes((n) => n + (quiere ? -1 : 1))
      snackbar(mensajeDeError(e))
    }
  }

  const tocar = () => {
    const ahora = Date.now()
    if (ahora - ultimoTap.current < 300) {
      window.clearTimeout(timerTap.current)
      ultimoTap.current = 0
      setCorazon((c) => c + 1)
      void ponerLike(true)
      return
    }
    ultimoTap.current = ahora
    timerTap.current = window.setTimeout(() => setPausado((p) => !p), 300)
  }

  const sobre = mobile // iconos blancos sobre el video
  const claseIcono = sobre ? 'text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]' : 'text-on-surface'
  const contador = (n: number) => (
    <span className={cn('type-label-m -mt-1', sobre ? 'text-white drop-shadow' : 'text-on-surface')}>{numeroCorto(n)}</span>
  )

  const acciones = (
    <div className="flex flex-col items-center gap-2">
      <div className="flex flex-col items-center">
        <IconButton
          icon="favorite"
          label={liked ? 'Quitar me gusta' : 'Me gusta'}
          active={liked}
          aria-pressed={liked}
          className={liked ? 'text-error' : claseIcono}
          onClick={() => void ponerLike(!liked)}
        />
        {contador(likes)}
      </div>
      <div className="flex flex-col items-center">
        <IconButton icon="chat_bubble" label="Comentarios" className={claseIcono} onClick={() => setVerComentarios(true)} />
        {contador(comentarios)}
      </div>
      <IconButton icon="send" label="Compartir" className={claseIcono} onClick={() => setCompartir(true)} />
      <IconButton
        icon="bookmark"
        label={guardado ? 'Quitar de guardados' : 'Guardar'}
        active={guardado}
        aria-pressed={guardado}
        className={claseIcono}
        onClick={() => setGuardado(alternarGuardado(post.id))}
      />
    </div>
  )

  const tarjeta = (
    <div className={cn('relative overflow-hidden bg-black', mobile ? 'size-full' : 'h-[calc(100dvh-32px)] rounded-md')} style={mobile ? undefined : { aspectRatio: '9 / 16' }}>
      <video
        ref={video}
        src={post.url_video ?? undefined}
        poster={post.url_imagen}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        className="size-full object-cover"
      />
      <button type="button" aria-label={pausado ? 'Reproducir' : 'Pausar'} onClick={tocar} className="absolute inset-0 cursor-pointer">
        {pausado && (
          <span className="absolute top-1/2 left-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white">
            <Icon name="play_arrow" fill size={40} />
          </span>
        )}
        {corazon > 0 && (
          <span key={corazon} className="heart-pop absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white drop-shadow-lg" aria-hidden="true">
            <Icon name="favorite" fill size={96} />
          </span>
        )}
      </button>
      <IconButton
        icon={muted ? 'volume_off' : 'volume_up'}
        label={muted ? 'Activar sonido' : 'Silenciar'}
        size={20}
        className="absolute top-3 right-3 bg-black/40 text-white"
        onClick={onToggleMute}
      />
      <div className={cn('pointer-events-none absolute inset-x-0 bottom-0 flex items-end gap-3 bg-gradient-to-t from-black/70 to-transparent p-4', mobile && 'pr-2')}>
        <div className="pointer-events-auto flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <Link to={`/${post.autor_username}`} className="flex min-w-0 items-center gap-2 text-white">
              <Avatar username={post.autor_username} size={32} />
              <span className="type-label-l emphasized truncate">{post.autor_username}</span>
            </Link>
            {!esMio && relacion !== null && relacion !== 'yo' && (
              <FollowButton usuarioId={post.usuario_id} relacion={relacion} esPrivada={esPrivada} size="xs" onChange={setRelacion} />
            )}
          </div>
          {post.descripcion && <Descripcion texto={post.descripcion} />}
        </div>
        {mobile && <div className="pointer-events-auto">{acciones}</div>}
      </div>
    </div>
  )

  return (
    <section ref={raiz} aria-label={`Reel de ${post.autor_username}`} className="flex h-full snap-start snap-always items-center justify-center gap-4">
      {tarjeta}
      {!mobile && <div className="self-end pb-4">{acciones}</div>}
      <CommentsSheet
        postId={post.id}
        postOwnerId={post.usuario_id}
        open={verComentarios}
        onClose={() => setVerComentarios(false)}
        onCountChange={(d) => setComentarios((c) => Math.max(0, c + d))}
      />
      <ShareSheet postId={post.id} open={compartir} onClose={() => setCompartir(false)} />
    </section>
  )
}

export function ReelsPage() {
  const yo = useYo()
  const { id } = useParams()
  const navigate = useNavigate()
  const mobile = useIsMobile()
  const [muted, setMuted] = useState(true)
  const inicial = useAsync<Post | null>(async () => {
    if (!id) return null
    try {
      const p = await obtenerPost(Number(id))
      return p.tipo === 'reel' ? p : null
    } catch {
      return null
    }
  }, [id])
  const { items, error, loading, done, reload, sentinelRef } = useInfinite((offset, limit) => reelsFeed(yo.id, { offset, limit }), [yo.id], 10)

  if (error instanceof ApiError && error.status === 403 && items.length === 0) {
    return (
      <EmptyState
        icon="movie_off"
        title="Desactivaste los reels"
        text="Podés volver a activarlos desde los ajustes de tu cuenta."
        action={<Button onClick={() => navigate('/cuenta/ajustes')}>Ir a ajustes</Button>}
      />
    )
  }
  if (error && items.length === 0) return <ErrorState error={error} onRetry={reload} />
  if ((loading && items.length === 0) || inicial.loading) return <CenteredLoader className="pt-24" />

  const primero = inicial.data ?? null
  const lista = primero ? [primero, ...items.filter((p) => p.id !== primero.id)] : items
  if (done && lista.length === 0) return <EmptyState icon="movie" title="No hay reels por ahora" text="Volvé más tarde para ver nuevos reels." />

  return (
    <div
      className={cn(
        'no-scrollbar snap-y snap-mandatory overflow-y-scroll overscroll-contain bg-black md:bg-transparent',
        mobile ? 'h-[calc(100dvh-var(--nav-h)-env(safe-area-inset-bottom))]' : 'h-dvh',
      )}
    >
      {lista.map((p) => (
        <ReelItem key={p.id} post={p} mobile={mobile} muted={muted} onToggleMute={() => setMuted((m) => !m)} />
      ))}
      <div ref={sentinelRef} aria-hidden="true" className="h-1" />
      {loading && <CenteredLoader />}
      {error && <ErrorState error={error} onRetry={reload} />}
    </div>
  )
}
