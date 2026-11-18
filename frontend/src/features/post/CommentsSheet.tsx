import { Sheet } from '../../components/ui/Overlay'
import { CenteredLoader, EmptyState, ErrorState } from '../../components/ui/Feedback'
import { useAsync } from '../../lib/hooks'
import * as postsApi from '../../services/posts'
import { useYo } from '../../stores/session'
import { CajaComentario, ComentarioItem } from './comentarios'

/** Comentarios de un post en bottom sheet (móvil) / side sheet (escritorio). */
export function CommentsSheet({
  postId,
  postOwnerId,
  open,
  onClose,
  onCountChange,
}: {
  postId: number
  postOwnerId: number
  open: boolean
  onClose: () => void
  onCountChange?: (delta: number) => void
}) {
  const yo = useYo()
  const { data, error, loading, reload, setData } = useAsync(
    () => (open ? postsApi.comentarios(postId, { limit: 50 }) : Promise.resolve([])),
    [postId, open],
  )
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Comentarios"
      footer={
        <CajaComentario
          postId={postId}
          className="border-t border-outline-variant px-4 py-1"
          onComentado={(c) => {
            setData((prev) => [...(prev ?? []), c])
            onCountChange?.(1)
          }}
        />
      }
    >
      {loading && !data ? (
        <CenteredLoader />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState icon="chat_bubble" title="Todavía no hay comentarios" text="Iniciá la conversación." />
      ) : (
        <div className="py-2">
          {data.map((c) => (
            <ComentarioItem
              key={c.id}
              comentario={c}
              puedeBorrar={c.usuario_id === yo.id || postOwnerId === yo.id}
              onBorrado={(id) => {
                setData((prev) => (prev ?? []).filter((x) => x.id !== id))
                onCountChange?.(-1)
              }}
            />
          ))}
        </div>
      )}
    </Sheet>
  )
}
