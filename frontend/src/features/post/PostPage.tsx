import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ScreenHeader } from '../../components/shared'
import { Avatar } from '../../components/ui/Avatar'
import { CenteredLoader, EmptyState, ErrorState } from '../../components/ui/Feedback'
import { Dialog } from '../../components/ui/Overlay'
import { useAsync, useIsMobile } from '../../lib/hooks'
import { fechaLarga, numeroCorto, tiempoCorto } from '../../lib/time'
import { ApiError } from '../../services/client'
import * as postsApi from '../../services/posts'
import { useYo } from '../../stores/session'
import type { Comentario, Post } from '../../types/api'
import { CajaComentario, ComentarioItem } from './comentarios'
import { LikesSheet } from './LikesSheet'
import { PostActions, PostCard, PostMedia, PostMenu, useLike } from './PostCard'
import { RichText } from './RichText'
import { ShareSheet } from './ShareSheet'

function usePost() {
  const { id } = useParams()
  const postId = Number(id)
  const estado = useAsync(() => postsApi.obtenerPost(postId), [postId])
  return { postId, ...estado }
}

function ErrorDePost({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (error instanceof ApiError && error.status === 403) {
    return <EmptyState icon="lock" title="Esta cuenta es privada" text="Seguí la cuenta para ver sus fotos y videos." />
  }
  if (error instanceof ApiError && error.status === 404) {
    return <EmptyState icon="link_off" title="Esta publicación no está disponible" text="Puede que el enlace no funcione o que se haya eliminado." />
  }
  return <ErrorState error={error} onRetry={onRetry} />
}

/** Lista de comentarios con la descripción del autor como primer "comentario". */
function ListaComentarios({
  post,
  items,
  onBorrado,
}: {
  post: Post
  items: Comentario[] | undefined
  onBorrado: (id: number) => void
}) {
  const yo = useYo()
  return (
    <div className="py-2">
      {post.descripcion && (
        <div className="flex items-start gap-3 px-4 py-2">
          <Link to={`/${post.autor_username}`} className="shrink-0">
            <Avatar username={post.autor_username} size={32} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="type-body-m break-words">
              <Link to={`/${post.autor_username}`} className="emphasized mr-1.5 font-semibold">
                {post.autor_username}
              </Link>
              <RichText text={post.descripcion} />
            </p>
            <p className="type-label-s mt-0.5 text-on-surface-variant">{tiempoCorto(post.fecha_publicacion)}</p>
          </div>
        </div>
      )}
      {items === undefined ? (
        <CenteredLoader />
      ) : items.length === 0 && !post.descripcion ? (
        <EmptyState icon="chat_bubble" title="Todavía no hay comentarios" text="Iniciá la conversación." />
      ) : (
        items.map((c) => (
          <ComentarioItem
            key={c.id}
            comentario={c}
            puedeBorrar={c.usuario_id === yo.id || post.usuario_id === yo.id}
            onBorrado={onBorrado}
          />
        ))
      )}
    </div>
  )
}

/** Vista de escritorio en dos columnas: media (fondo negro) + panel. */
function DetalleDosColumnas({ post, onDeleted }: { post: Post; onDeleted: () => void }) {
  const { meGusta, likes, set } = useLike(post)
  const coms = useAsync(() => postsApi.comentarios(post.id, { limit: 50 }), [post.id])
  const [sheet, setSheet] = useState<'likes' | 'compartir' | null>(null)
  const [foco, setFoco] = useState(0)
  return (
    <div className="flex h-full min-h-0 w-full">
      <div className="flex min-w-0 flex-[1.4] items-center justify-center bg-black">
        <PostMedia post={post} fill onDoubleLike={() => void set(true)} />
      </div>
      <div className="flex w-[400px] max-w-[45%] shrink-0 flex-col border-l border-outline-variant bg-surface">
        <header className="flex items-center gap-3 border-b border-outline-variant px-4 py-3">
          <Link to={`/${post.autor_username}`}>
            <Avatar username={post.autor_username} size={32} />
          </Link>
          <Link to={`/${post.autor_username}`} className="type-label-l emphasized min-w-0 flex-1 truncate font-semibold">
            {post.autor_username}
          </Link>
          <PostMenu post={post} onDeleted={onDeleted} onBlocked={onDeleted} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {coms.error ? (
            <ErrorState error={coms.error} onRetry={coms.reload} />
          ) : (
            <ListaComentarios
              post={post}
              items={coms.data}
              onBorrado={(id) => coms.setData((prev) => (prev ?? []).filter((c) => c.id !== id))}
            />
          )}
        </div>
        <div className="border-t border-outline-variant px-2 pt-1">
          <PostActions
            post={post}
            meGusta={meGusta}
            onLike={() => void set(!meGusta)}
            onComment={() => setFoco((n) => n + 1)}
            onShare={() => setSheet('compartir')}
          />
          <div className="px-2">
            {likes > 0 ? (
              <button type="button" className="type-label-l emphasized font-semibold" onClick={() => setSheet('likes')}>
                {numeroCorto(likes)} Me gusta
              </button>
            ) : (
              <p className="type-body-m">Sé el primero en indicar que te gusta</p>
            )}
            <p className="type-label-s pb-2 text-on-surface-variant uppercase">{fechaLarga(post.fecha_publicacion)}</p>
          </div>
        </div>
        <CajaComentario
          key={foco}
          autoFocus={foco > 0}
          postId={post.id}
          className="border-t border-outline-variant px-4 py-1"
          onComentado={(c) => coms.setData((prev) => [...(prev ?? []), c])}
        />
      </div>
      <LikesSheet postId={post.id} open={sheet === 'likes'} onClose={() => setSheet(null)} />
      <ShareSheet postId={post.id} open={sheet === 'compartir'} onClose={() => setSheet(null)} />
    </div>
  )
}

/** Vista móvil: PostCard + comentarios debajo. */
function DetalleMovil({ post, onDeleted }: { post: Post; onDeleted: () => void }) {
  const coms = useAsync(() => postsApi.comentarios(post.id, { limit: 50 }), [post.id])
  return (
    <div>
      <PostCard post={post} onDeleted={onDeleted} />
      {coms.error ? (
        <ErrorState error={coms.error} onRetry={coms.reload} />
      ) : (
        <ListaComentarios
          post={{ ...post, descripcion: null }}
          items={coms.data}
          onBorrado={(id) => coms.setData((prev) => (prev ?? []).filter((c) => c.id !== id))}
        />
      )}
    </div>
  )
}

/** Ruta /p/:id como página propia. */
export function PostPage() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { data, error, loading, reload } = usePost()
  const salir = () => navigate(-1)
  return (
    <div className="mx-auto w-full max-w-[935px] md:px-4 md:py-6">
      {isMobile && <ScreenHeader title="Publicación" onBack={salir} />}
      {loading && !data ? (
        <CenteredLoader />
      ) : error ? (
        <ErrorDePost error={error} onRetry={reload} />
      ) : !data ? null : isMobile ? (
        <DetalleMovil post={data} onDeleted={() => navigate('/')} />
      ) : (
        <div className="h-[min(85vh,720px)] overflow-hidden rounded-xs border border-outline-variant">
          <DetalleDosColumnas post={data} onDeleted={() => navigate('/')} />
        </div>
      )}
    </div>
  )
}

/** /p/:id sobre la pantalla anterior (background location). */
export function PostModal() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { data, error, loading, reload } = usePost()
  const cerrar = () => navigate(-1)
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-40 overflow-y-auto bg-surface">
        <ScreenHeader title="Publicación" onBack={cerrar} />
        {loading && !data ? (
          <CenteredLoader />
        ) : error ? (
          <ErrorDePost error={error} onRetry={reload} />
        ) : data ? (
          <DetalleMovil post={data} onDeleted={cerrar} />
        ) : null}
      </div>
    )
  }
  return (
    <Dialog open onClose={cerrar} width={1100} hideHeader className="overflow-hidden p-0">
      <div className="h-[min(90vh,820px)]">
        {loading && !data ? (
          <CenteredLoader className="h-full" />
        ) : error ? (
          <ErrorDePost error={error} onRetry={reload} />
        ) : data ? (
          <DetalleDosColumnas post={data} onDeleted={cerrar} />
        ) : null}
      </div>
    </Dialog>
  )
}
